"use client";
import { useEffect, useState } from "react";
type Count = { status: string; count: number };
export default function BetaAdminPage() {
  const [counts,setCounts] = useState<Count[] | null>(null);
  const [error,setError] = useState("");
  useEffect(() => {
    fetch("/api/beta/admin/summary", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Pääsy estetty. Ylläpitäjän oikeudet vaaditaan.");
        const result = await response.json();
        setCounts(result.counts);
      })
      .catch(() => setError("Pääsy estetty. Ylläpitäjän oikeudet vaaditaan."));
  }, []);
  return <main style={{maxWidth:600,margin:"3rem auto",padding:24,fontFamily:"system-ui"}}>
    <h1>Ziiply – beetatestaajien hallinta</h1>
    <p>Testikäytön yhteenveto. Henkilötietoja tai hallintatoimintoja ei näytetä tässä vaiheessa.</p>
    {error && <p role="alert">{error}</p>}
    {!error && !counts && <p role="status">Tarkistetaan käyttöoikeudet…</p>}
    {counts && <table><thead><tr><th style={{textAlign:"left",padding:8}}>Tila</th><th style={{padding:8}}>Määrä</th></tr></thead>
      <tbody>{counts.map(row=><tr key={row.status}><td style={{padding:8}}>{row.status}</td><td style={{padding:8}}>{row.count}</td></tr>)}</tbody></table>}
  </main>;
}
