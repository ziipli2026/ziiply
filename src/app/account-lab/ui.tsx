"use client";
import { useEffect, useState } from "react";
import { createAuthClient } from "@neondatabase/auth/next";
import { captureGuestSnapshot, getGuestIdentity } from "@/lib/account/guest";
const auth = createAuthClient();
export default function AccountLab() {
  const [guest, setGuest] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function refresh() {
    const { data, error } = await auth.getSession();
    if (error) throw new Error(error.message || "Istuntoa ei voitu tarkistaa");
    setUser(data?.user.email || null);
  }
  useEffect(() => {
    try { setGuest(getGuestIdentity(window.localStorage).persistent ? "Vierastila tallentuu tähän selaimeen" : "Vierastila toimii vain tämän käynnin ajan"); }
    catch { setGuest("Vierastila käytössä"); }
    refresh().catch(() => setMessage("Kirjautuminen ei ole vielä käytettävissä. Vierastila toimii."));
  }, []);
  async function run(action: () => Promise<unknown>) {
    setBusy(true); setMessage("");
    try { await action(); await refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "Toiminto epäonnistui"); }
    finally { setBusy(false); setPassword(""); }
  }
  function check(result: { error?: { message?: string } | null }) {
    if (result.error) throw new Error(result.error.message || "Kirjautuminen epäonnistui");
  }
  return <main className="mx-auto max-w-xl p-8 space-y-4">
    <h1 className="text-2xl font-bold">Ziiply käyttäjätilin kehitystesti</h1>
    <p>{guest}. Sovellusta voi käyttää kirjautumatta.</p>
    <a href="/">Jatka Ziiplyyn</a>
    <p>Kirjautunut: {user || "ei"}</p>
    {!user ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(async () => check(await auth.signIn.email({ email, password }))); }}>
      <label className="block">Sähköposti<input className="block border p-2" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">Salasana<input className="block border p-2" type="password" required minLength={8} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} type="submit">Kirjaudu sähköpostilla</button>{" "}
      <button disabled={busy} type="button" onClick={() => void run(async () => check(await auth.signUp.email({ email, password, name: email.split("@")[0] })))}>Luo tili</button>{" "}
      <button disabled={busy} type="button" onClick={() => void run(async () => check(await auth.signIn.social({ provider: "google", callbackURL: window.location.origin + "/account-lab" })))}>Google</button>
      <p>Apple-kirjautuminen odottaa tuettua integraatiota.</p>
    </form> : <>
      <p>Tuo tämän selaimen korit erillisenä varmuuskopiona tilillesi. Nykyiset korit säilyvät.</p>
      <button disabled={busy} onClick={() => void run(async () => {
        const snapshot = captureGuestSnapshot(window.localStorage, window.sessionStorage);
        const response = await fetch("/api/account/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
        if (!response.ok) throw new Error("Tuonti ei onnistunut. Paikalliset korit säilyvät.");
        setMessage("Korit kopioitu tilille. Paikallinen tallennus säilyi.");
      })}>Tuo paikalliset korit tilille</button>{" "}
      <button disabled={busy} onClick={() => void run(async () => check(await auth.signOut()))}>Kirjaudu ulos</button>
    </>}
    <p role="status">{busy ? "Odota…" : message}</p>
  </main>;
}
