// src/app/api/transcribe/route.ts
// V476 MediaRecorder -puheentunnistuksen palvelinroutteri.
// Vaatii ympäristömuuttujan OPENAI_API_KEY.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY puuttuu palvelimen ympäristömuuttujista." },
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

    const formData = new FormData();
    formData.append("file", audio, audio.name || "voice.webm");
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

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: payload?.error?.message || "Transkriptio epäonnistui.", details: payload },
        { status: response.status },
      );
    }

    return NextResponse.json({ text: String(payload?.text || "").trim() });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Transkriptio epäonnistui." },
      { status: 500 },
    );
  }
}
