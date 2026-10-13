import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "Reseptin kuvanlukupalvelua ei ole vielä otettu käyttöön (OPENAI_API_KEY puuttuu palvelimelta)." }, { status: 503 });
  try {
    const { image } = await request.json();
    if (typeof image !== "string" || !/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(image) || image.length > 16_000_000) return NextResponse.json({ error: "Kuva on liian suuri tai väärää muotoa." }, { status: 400 });
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.RECIPE_VISION_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Read the photographed cooking recipe. Return JSON only: {title:string, ingredients:string, instructions:string, rawText:string}. Preserve Finnish wording, ingredient quantities and units. ingredients is newline-separated. Never guess illegible text; mark uncertainties [?]. Exclude unrelated content." },
          { role: "user", content: [{ type: "text", text: "Lue resepti kuvasta. Poimi otsikko, ainekset ja valmistusohje. Jos osa puuttuu, jätä tyhjäksi." }, { type: "image_url", image_url: { url: image, detail: "high" } }] }
        ]
      }),
      signal: AbortSignal.timeout(45000)
    });
    if (!response.ok) return NextResponse.json({ error: "Kuvanlukupalvelu ei vastannut (" + response.status + ")." }, { status: 502 });
    const data = await response.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    return NextResponse.json({ title: String(parsed.title || "").slice(0,300), ingredients: String(parsed.ingredients || "").slice(0,12000), instructions: String(parsed.instructions || "").slice(0,12000), rawText: String(parsed.rawText || "").slice(0,24000) });
  } catch {
    return NextResponse.json({ error: "Kuvan tekstinlukeminen epäonnistui. Kokeile uudelleen." }, { status: 500 });
  }
}
