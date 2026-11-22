"use client";

import { useEffect, useRef, useState } from "react";

/** Uses the same Finnish transcription endpoint and image states as mobile. */
export function useDesktopVoiceInput(onTranscript: (text: string) => void) {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [message, setMessage] = useState("");
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const session = useRef<{
    cancelled: boolean; stream?: MediaStream; recorder?: MediaRecorder;
    context?: AudioContext; frame?: number; timer?: number; request?: AbortController;
  } | null>(null);

  function releaseAudio(current: NonNullable<typeof session.current>) {
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    if (current.timer !== undefined) clearTimeout(current.timer);
    current.stream?.getTracks().forEach(track => track.stop());
    void current.context?.close().catch(() => {});
  }

  useEffect(() => () => {
    const current = session.current;
    if (!current) return;
    current.cancelled = true;
    current.request?.abort();
    if (current.recorder?.state === "recording") current.recorder.stop();
    releaseAudio(current);
  }, []);

  async function toggle() {
    const existing = session.current;
    if (existing) {
      if (existing.recorder?.state === "recording") existing.recorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Selain ei tue äänitystä.");
      return;
    }
    const current: NonNullable<typeof session.current> = { cancelled: false };
    session.current = current;
    setState("processing");
    setMessage("Avataan mikrofonia…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      current.stream = stream;
      if (current.cancelled) { releaseAudio(current); return; }
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"]
        .find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      current.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        current.cancelled = true;
        releaseAudio(current);
        session.current = null;
        setState("idle");
        setMessage("Äänitys epäonnistui. Kokeile uudelleen.");
      };
      recorder.onstop = async () => {
        releaseAudio(current);
        if (current.cancelled) return;
        setState("processing");
        setMessage("Tulkitaan puhetta…");
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || mime || "audio/webm" });
          if (!blob.size) throw new Error("Ei kuulunut puhetta.");
          const form = new FormData();
          form.append("audio", blob, blob.type.includes("mp4") ? "ziiply-voice.m4a" : "ziiply-voice.webm");
          form.append("language", "fi");
          current.request = new AbortController();
          const response = await fetch("/api/transcribe", { method: "POST", body: form, signal: current.request.signal });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Puheen tunnistus epäonnistui.");
          const text = String(data.text || data.transcript || data.result || "").trim();
          if (!text) throw new Error("Ei kuulunut puhetta.");
          if (!current.cancelled) { callback.current(text); setMessage(""); }
        } catch (error) {
          if (!current.cancelled) setMessage(error instanceof Error ? error.message : "Puheen tunnistus epäonnistui.");
        } finally {
          if (!current.cancelled) { session.current = null; setState("idle"); }
        }
      };
      recorder.start(250);
      setState("recording");
      setMessage("Kuuntelen… Lopeta painamalla mikrofonia.");
      const started = Date.now();
      let lastSound = started;
      let heard = false;
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          current.context = context;
          void context.resume().catch(() => {});
          const analyser = context.createAnalyser();
          analyser.fftSize = 2048;
          context.createMediaStreamSource(stream).connect(analyser);
          const samples = new Uint8Array(analyser.fftSize);
          const tick = () => {
            if (current.cancelled || recorder.state !== "recording") return;
            analyser.getByteTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length);
            if (rms > 0.025) { heard = true; lastSound = Date.now(); }
            if ((heard && Date.now() - lastSound > 2500) || (!heard && Date.now() - started > 15000)) {
              recorder.stop();
              return;
            }
            current.frame = requestAnimationFrame(tick);
          };
          current.frame = requestAnimationFrame(tick);
        }
      } catch { /* Manual stop and maximum duration still work without an analyser. */ }
      current.timer = window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 45000);
    } catch (error) {
      releaseAudio(current);
      if (!current.cancelled) {
        session.current = null;
        setState("idle");
        setMessage(error instanceof DOMException && error.name === "NotAllowedError"
          ? "Salli mikrofonin käyttö selaimessa ja kokeile uudelleen."
          : "Mikrofonia ei saatu avattua. Kokeile uudelleen.");
      }
    }
  }

  return { state, message, toggle };
}
