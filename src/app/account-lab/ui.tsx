"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import CloudCartLab from "./cloud";
import { createAuthClient } from "@neondatabase/auth/next";
import { getGuestStatus, getServerGuestStatus, initializeGuestStatus, subscribeGuestStatus } from "@/lib/account/guestStatus";
import { captureGuestSnapshot } from "@/lib/account/guest";
const auth = createAuthClient();
export default function AccountLab() {
  const guest = useSyncExternalStore(subscribeGuestStatus, getGuestStatus, getServerGuestStatus);
  const [user, setUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [importInfo, setImportInfo] = useState<{ owner: string; count: number } | null>(null);
  const importCount = importInfo?.owner === user ? importInfo.count : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function refresh() {
    const { data, error } = await auth.getSession();
    if (error) throw new Error(error.message || "Istuntoa ei voitu tarkistaa");
    setUser(data?.user.email || null);
  }
  useEffect(() => {
    initializeGuestStatus();
    let active = true;
    auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) { setMessage("Kirjautuminen ei ole vielä käytettävissä. Vierastila toimii."); return; }
      setUser(data?.user.email || null);
    }).catch(() => {
      if (active) setMessage("Kirjautuminen ei ole vielä käytettävissä. Vierastila toimii.");
    });
    return () => { active = false; };
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setMessage("");
    try { await action(); await refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "Toiminto epäonnistui"); }
    finally { setBusy(false); setPassword(""); }
  }
  function check(result: { error?: { message?: string } | null }) {
    if (result.error) throw new Error(result.error.message || "Kirjautuminen epäonnistui");
  }
  return <main aria-busy={busy} className="mx-auto max-w-xl p-8 space-y-4">
    <h1 className="text-2xl font-bold">Ziiply käyttäjätilin kehitystesti</h1>
    <p>{guest}. Sovellusta voi käyttää kirjautumatta.</p>
    <Link href="/">Jatka Ziiplyyn</Link>{" "}<Link href="/desktop-preview">Avaa desktop</Link>
    <p>Kirjautunut: {user || "ei"}</p>
    {!user ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(async () => check(await auth.signIn.email({ email, password }))); }}>
      <label className="block">Sähköposti<input className="block border p-2" type="email" disabled={busy} required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">Salasana<input className="block border p-2" type="password" disabled={busy} required minLength={8} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">Kirjaudu sähköpostilla</button>{" "}
      <button disabled={busy} type="button" onClick={() => void run(async () => check(await auth.signUp.email({ email, password, name: email.split("@")[0] })))}>Luo tili</button>{" "}
      <button disabled={busy} type="button" onClick={() => void run(async () => check(await auth.signIn.social({ provider: "google", callbackURL: window.location.origin + "/account-lab" })))}>Google</button>
      <p>Apple-kirjautuminen odottaa tuettua integraatiota.</p>
    </form> : <>
      <button disabled={busy} onClick={() => void run(async () => {
        const response = await fetch("/api/account/import", { cache: "no-store" });
        if (!response.ok) throw new Error("Tilin tietoja ei voitu hakea");
        const data = await response.json();
        setImportInfo({ owner: user, count: data.imports.length });
      })}>Näytä tilille tuodut korit</button>
      {importCount !== null && <p>Tilillä on {importCount} viimeisintä korivarmuuskopiota (enintään 20 näytetään).</p>}
      <p>Tuo tämän selaimen korit erillisenä varmuuskopiona tilillesi. Nykyiset korit säilyvät.</p>
      <button disabled={busy} onClick={() => void run(async () => {
        const snapshot = captureGuestSnapshot(window.localStorage, window.sessionStorage);
        const response = await fetch("/api/account/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
        if (!response.ok) throw new Error("Tuonti ei onnistunut. Paikalliset korit säilyvät.");
        setMessage("Korit kopioitu tilille. Paikallinen tallennus säilyi.");
      })}>Tuo paikalliset korit tilille</button>{" "}
      <CloudCartLab key={user} />
      <button disabled={busy} onClick={() => void run(async () => check(await auth.signOut()))}>Kirjaudu ulos</button>
    </>}
    <p role="status">{busy ? "Odota…" : message}</p>
  </main>;
}
