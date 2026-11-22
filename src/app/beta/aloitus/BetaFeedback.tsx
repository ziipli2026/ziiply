"use client";

import { useState, type FormEvent } from "react";

export default function BetaFeedback() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !message.trim()) return;
    setSending(true);
    setResult("");
    try {
      const response = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (response.status === 401) {
        setResult("Kirjautumisesi on vanhentunut. Kirjaudu uudelleen ennen lähettämistä.");
        return;
      }
      if (!response.ok) throw new Error("Feedback submission failed");
      setMessage("");
      setResult("Kiitos, palautteesi on tallennettu.");
    } catch {
      setResult("Palautetta ei saatu tallennettua. Yritä uudelleen.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="beta-card" style={{ minHeight: 0, marginTop: 24 }}>
      <h2>Anna palautetta</h2>
      <form onSubmit={submit}>
        <label htmlFor="beta-feedback">Kerro, mikä toimi, mitä voisi parantaa tai missä kohdassa tuli ongelma.</label>
        <textarea
          id="beta-feedback"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          maxLength={4000}
          rows={5}
          disabled={sending}
          style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 12, marginBottom: 12, padding: 12, font: "inherit", border: "1px solid #8ba69a", borderRadius: 8, resize: "vertical" }}
        />
        <button type="submit" className="beta-action" style={{ border: 0 }} disabled={sending || !message.trim()}>
          {sending ? "Lähetetään…" : "Lähetä palaute"}
        </button>
        <div role="status" style={{ marginTop: 8 }}>{result}</div>
      </form>
    </section>
  );
}
