"use client";

import { useMemo, useState } from "react";

import {
  explainNormalSearch,
  searchNormalProducts,
  suggestNormalSearch,
} from "@/app/components/ziiply/search/searchEngine";

const TEST_PRODUCTS = [
  {
    id: "1",
    ean: "6414893381002",
    name: "Valio kevytmaito 1 l",
    brandName: "Valio",
    category: "Maidot",
    hierarchyPath: ["Maito, munat ja rasvat", "Maidot ja piimät", "Maidot"],
    packageSize: "1 l",
  },
  {
    id: "2",
    ean: "6414893382009",
    name: "Valio täysmaito 1 l",
    brandName: "Valio",
    category: "Maidot",
    hierarchyPath: ["Maito, munat ja rasvat", "Maidot ja piimät", "Maidot"],
    packageSize: "1 l",
  },
  {
    id: "3",
    ean: "6413300010012",
    name: "Arla kevytmaito 1 l",
    brandName: "Arla",
    category: "Maidot",
    hierarchyPath: ["Maito, munat ja rasvat", "Maidot ja piimät", "Maidot"],
    packageSize: "1 l",
  },
  {
    id: "4",
    name: "Fazer maitosuklaa 200 g",
    brandName: "Fazer",
    category: "Suklaat",
    hierarchyPath: ["Makeiset", "Suklaat"],
    packageSize: "200 g",
  },
  {
    id: "5",
    name: "Coca-Cola Zero 1,5 l",
    brandName: "Coca-Cola",
    category: "Virvoitusjuomat",
    hierarchyPath: ["Juomat", "Virvoitusjuomat", "Cola"],
    packageSize: "1,5 l",
  },
  {
    id: "6",
    name: "Pepsi Max 1,5 l",
    brandName: "Pepsi",
    category: "Virvoitusjuomat",
    hierarchyPath: ["Juomat", "Virvoitusjuomat", "Cola"],
    packageSize: "1,5 l",
  },
  {
    id: "7",
    name: "Paulig Juhla Mokka suodatinjauhatus 500 g",
    brandName: "Paulig",
    category: "Kahvit",
    hierarchyPath: ["Kuivatuotteet", "Kahvit"],
    packageSize: "500 g",
  },
  {
    id: "8",
    name: "Paulig Presidentti suodatinjauhatus 500 g",
    brandName: "Paulig",
    category: "Kahvit",
    hierarchyPath: ["Kuivatuotteet", "Kahvit"],
    packageSize: "500 g",
  },
  {
    id: "9",
    name: "HK Naudan jauheliha 10 % 400 g",
    brandName: "HK",
    category: "Jauhelihat",
    hierarchyPath: ["Lihat", "Jauhelihat"],
    packageSize: "400 g",
  },
  {
    id: "10",
    name: "Atria Naudan jauheliha 17 % 400 g",
    brandName: "Atria",
    category: "Jauhelihat",
    hierarchyPath: ["Lihat", "Jauhelihat"],
    packageSize: "400 g",
  },
  {
    id: "11",
    name: "HK Broilerin jauheliha 400 g",
    brandName: "HK",
    category: "Jauhelihat",
    hierarchyPath: ["Lihat", "Jauhelihat"],
    packageSize: "400 g",
  },
];

export default function SearchTestPage() {
  const [query, setQuery] = useState("maito");

  const intent = useMemo(() => explainNormalSearch(query), [query]);

  const suggestions = useMemo(
    () => suggestNormalSearch(query, TEST_PRODUCTS, 15),
    [query]
  );

  const ranked = useMemo(
    () => searchNormalProducts(query, TEST_PRODUCTS, { limit: 15 }),
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

        <div className="rounded border p-4 md:col-span-2">
          <h2 className="mb-3 font-bold">Ranked products</h2>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(ranked, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}
