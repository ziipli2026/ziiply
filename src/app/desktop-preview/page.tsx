import TopbarResponsiveCard from "../components/ziiply/cards/TopbarResponsiveCard";
import { StoresResponsiveCard } from "../components/ziiply/cards/StoresResponsiveCard";
import { SearchResponsiveCard } from "../components/ziiply/cards/SearchResponsiveCard";

export default function LegacyDesktopPreviewPage() {
  const stores = [
    { id: "s", name: "Prisma Hyvinkää", chain: "S" as const, distance: "1,2 km", selected: true },
    { id: "k", name: "K-Citymarket Hyvinkää", chain: "K" as const, distance: "1,8 km", selected: true },
    { id: "lidl", name: "Tulossa", chain: "Lidl" as const, selected: false },
    { id: "tokmanni", name: "Tulossa", chain: "Tokmanni" as const, selected: false },
  ];

  return (
    <main className="min-h-screen bg-[#f5efe1] py-8">
      <div className="mx-auto max-w-[1180px] space-y-8 px-4">
        <div className="rounded-2xl border border-amber-900/20 bg-white/70 px-5 py-3 text-sm font-bold text-zinc-700">
          Legacy desktop UI preview — visual reference only. Production logic is not connected on this route.
        </div>
        <TopbarResponsiveCard areaLabel="Hyvinkää" storeModeLabel="Tavaratalot" />
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <StoresResponsiveCard stores={stores} />
          <SearchResponsiveCard />
        </div>
      </div>
    </main>
  );
}
