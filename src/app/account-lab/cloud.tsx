"use client";
import { useState } from "react";
import { captureGuestSnapshot } from "@/lib/account/guest";
import type { AccountDocument, DocumentWrite } from "@/lib/account/document";
export default function CloudCartLab() {
  const [document, setDocument] = useState<AccountDocument | null>(null);
  const [pending, setPending] = useState<DocumentWrite | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load(id?: string) {
    const response = await fetch("/api/account/documents" + (id ? "?id=" + encodeURIComponent(id) : ""), { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Pilvikoria ei voitu hakea");
    const data = await response.json();
    const next: AccountDocument | null = id ? data.document : data.documents[0] || null;
    setDocument(next);
    return next;
  }
  async function save(operation: DocumentWrite) {
    setBusy(true); setMessage(""); setPending(operation);
    try {
      const response = await fetch("/api/account/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(operation), signal: AbortSignal.timeout(15000) });
      if (response.status === 409) {
        setPending(null);
        throw new Error("Kori muuttui toisella laitteella. Hae viimeisin versio ennen uutta tallennusta. Paikallinen kori säilyi.");
      }
      if (response.status === 400 || response.status === 413) {
        setPending(null); throw new Error("Korisisältöä ei voitu tallentaa. Paikallinen kori säilyi.");
      }
      if (!response.ok) throw new Error("Tallennus ei varmistunut. Yritä samaa tallennusta uudelleen.");
      const data = await response.json();
      if (data.replayed) await load(operation.id); else setDocument(data.document);
      setPending(null);
      setMessage("Pilvikori tallennettu. Paikallinen kori säilyi.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Tallennus epäonnistui"); }
    finally { setBusy(false); }
  }
  function startSave(create: boolean) {
    try {
      const operation: DocumentWrite = { id: create || !document ? crypto.randomUUID() : document.id, mutationId: crypto.randomUUID(), expectedRevision: create || !document ? 0 : document.revision, snapshot: captureGuestSnapshot(window.localStorage, window.sessionStorage) };
      void save(operation);
    } catch { setMessage("Paikallista koria ei voitu lukea. Tallennusta ei aloitettu."); }
  }
  return <section className="space-y-3 border-t pt-4" aria-busy={busy}>
    <h2 className="text-xl font-bold">Pilvikorin kehitystesti</h2>
    <p>Tallennus säilyttää paikalliset korit. Pilvikoria ei vielä palauteta automaattisesti sovellukseen.</p>
    <button disabled={busy || !!pending} onClick={() => startSave(true)}>Tallenna uusi pilvikori</button>{" "}
    <button disabled={busy || !!pending} onClick={() => { setBusy(true); setMessage(""); load(document?.id).then(next => setMessage(next ? "Pilvikorin viimeisin versio haettu" : "Tilillä ei ole pilvikoreja")).catch(error => setMessage(error.message)).finally(() => setBusy(false)); }}>Hae viimeisin pilvikori</button>{" "}
    {document && <button disabled={busy || !!pending} onClick={() => startSave(false)}>Päivitä valittu pilvikori</button>}
    {pending && <button disabled={busy} onClick={() => void save(pending)}>Yritä samaa tallennusta uudelleen</button>}
    {document && <p>Valittu pilvikori: versio {document.revision}. Sisältöryhmiä: {Object.keys(document.snapshot.values).length}.</p>}
    <p role="status">{busy ? "Odota…" : message}</p>
  </section>;
}
