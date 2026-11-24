import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isBetaAdminSession } from "@/lib/ziiplyBetaAdminSession";

export const dynamic = "force-dynamic";

type Feedback = {
  id: string;
  message: string;
  created_at: string;
  email: string | null;
};

const sentAt = new Intl.DateTimeFormat("fi-FI", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Helsinki",
});

export default async function BetaFeedbackAdminPage() {
  const token = (await cookies()).get("__Host-ziiply_beta_admin")?.value;
  if (!await isBetaAdminSession(token)) redirect("/beta/hallinta");

  let feedback: Feedback[] | null;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    feedback = await sql`
      SELECT f.id::text AS id, f.message, f.created_at, a.email
      FROM public.ziiply_beta_feedback f
      LEFT JOIN public.ziiply_beta_users u ON u.id = f.user_id
      LEFT JOIN public.ziiply_beta_applications a ON a.id = u.application_id
      ORDER BY f.created_at DESC, f.id DESC
    ` as Feedback[];
  } catch {
    feedback = null;
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", fontFamily: "system-ui", color: "#17212f" }}>
      <a href="/beta/hallinta">← Takaisin beetatestaajien hyväksyntään</a>
      <h1>Beetatestaajien palaute</h1>
      {feedback === null && <p role="alert">Palautteen lataaminen epäonnistui. Yritä ladata sivu uudelleen.</p>}
      {feedback?.length === 0 && <p>Palautetta ei ole vielä annettu.</p>}
      {feedback?.map((entry) => (
        <article key={entry.id} style={{ marginBottom: 12, padding: 16, background: "#fff", border: "1px solid #dce5f0", borderRadius: 12, overflowWrap: "anywhere" }}>
          <header>
            <strong>{entry.email ?? "Lähettäjän tietoja ei ole saatavilla"}</strong>
            {" · "}
            <time dateTime={new Date(entry.created_at).toISOString()}>{sentAt.format(new Date(entry.created_at))}</time>
          </header>
          <p style={{ whiteSpace: "pre-wrap", margin: "10px 0 0" }}>{entry.message}</p>
        </article>
      ))}
    </main>
  );
}
