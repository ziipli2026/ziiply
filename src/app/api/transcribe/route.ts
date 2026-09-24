// src/app/api/transcribe/route.ts

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY puuttuu Vercelistä." },
        { status: 500 },
      );
    }

    const inputForm = await request.formData();
    const audio = inputForm.get("audio");
    const language = String(inputForm.get("language") || "fi");

    if (!(audio instanceof File)) {
      return NextResponse.json(
        { error: "Audio-tiedostoa ei löytynyt kentästä audio." },
        { status: 400 },
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const mime = audio.type || "audio/mp4";

    let filename = "voice.m4a";
    if (mime.includes("webm")) filename = "voice.webm";
    else if (mime.includes("mp4")) filename = "voice.m4a";
    else if (mime.includes("mpeg")) filename = "voice.mp3";
    else if (mime.includes("wav")) filename = "voice.wav";

    const safeAudioFile = new File([arrayBuffer], filename, { type: mime });

    const formData = new FormData();
    formData.append("file", safeAudioFile);
    formData.append("model", "gpt-4o-mini-transcribe");
    formData.append("language", language);
    formData.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const rawText = await response.text();

    let payload: any = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = { raw: rawText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: payload?.error?.message || "Transkriptio epäonnistui.",
          status: response.status,
          mime,
          filename,
          details: payload,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      text: String(payload?.text || "").trim(),
      mime,
      filename,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Transkriptio epäonnistui." },
      { status: 500 },
    );
  }
}
