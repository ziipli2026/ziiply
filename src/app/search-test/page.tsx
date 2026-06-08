"use client";

import { useMemo, useState } from "react";

import {
  explainNormalSearch,
  suggestNormalSearch,
} from "@/app/components/ziiply/search/searchEngine";

export default function SearchTestPage() {
  const [query, setQuery] = useState("maito");

  const products: any[] = [];

  const intent = useMemo(() => explainNormalSearch(query), [query]);

  const suggestions = useMemo(
    () => suggestNormalSearch(query, products, 15),
    [query]
  );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Ziiply Search Debug
      </h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border p-3"
        placeholder="Kirjoita hakusana..."
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded border p-4">
          <h2 className="mb-3 font-bold">Intent</h2>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(intent, null, 2)}
          </pre>
        </div>

        <div className="rounded border p-4">
          <h2 className="mb-3 font-bold">Suggestions</h2>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(suggestions, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}
