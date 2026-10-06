"use client";

import { FormEvent, useState } from "react";

export default function MediaPreviewPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);

    const response = await fetch("/api/media-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    });

    if (!response.ok) {
      setError(true);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] px-5 py-10 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg items-center">
        <section className="w-full rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm sm:p-9">
          <div className="mb-7">
            <div className="text-3xl font-semibold tracking-tight">Ziiply</div>
            <div className="mt-1 text-sm font-medium text-green-700">Media Preview</div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">Ei-julkinen ennakkoversio</h1>

          <p className="mt-4 leading-7 text-zinc-700">
            Tämä pääsy on tarkoitettu Ziiplyyn tutustumista varten.
            Ethän jaa pääsylinkkiä tai pääsytietoja eteenpäin.
          </p>

          <div className="mt-6 rounded-2xl bg-zinc-50 p-5 text-sm leading-6 text-zinc-700">
            <p>
              Ziiplystä ja palvelun toiminnasta saa vapaasti kirjoittaa.
              Palvelusta otettuja kuvakaappauksia saa käyttää ja julkaista
              journalistisessa yhteydessä.
            </p>
            <p className="mt-3">
              Kyseessä on kehitysvaiheessa oleva palvelu. Hintatiedot,
              tietojen kattavuus ja palvelun sisältö voivat muuttua.
            </p>
          </div>

          <form onSubmit={submit} className="mt-7">
            <label htmlFor="media-code" className="mb-2 block text-sm font-semibold text-zinc-800">
              Pääsykoodi
            </label>
            <input
              id="media-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError(false);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3.5 text-base uppercase tracking-wider outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
            {error && (
              <p className="mt-2 text-sm font-medium text-red-700">
                Pääsykoodi ei kelpaa. Tarkista koodi ja yritä uudelleen.
              </p>
            )}
            <button
              type="submit"
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-green-600 px-5 py-4 text-base font-semibold text-white transition hover:bg-green-700"
            >
              Jatka Ziiplyyn
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-500">
            Ziiply Oy · One search. All prices.
          </p>
        </section>
      </div>
    </main>
  );
}
