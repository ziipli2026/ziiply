import React from "react";

export type SearchMode = "cart" | "single";
export type SearchPanelKind = "none" | "results" | "compare";

export type SearchChip = {
  id: string;
  label: string;
  onClick?: () => void;
};

export type SearchCardProps = {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  onAddFromNotebook?: () => void;
  onScan?: () => void;
  onGostaSearch?: () => void;
  onJustiinaSearch?: () => void;
  chips?: SearchChip[];
  instructionText?: string;
  resultsPanel?: React.ReactNode;
  comparePanel?: React.ReactNode;
  activePanel?: SearchPanelKind;
  onOpenResults?: () => void;
  onOpenCompare?: () => void;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchCard({
  value,
  onChange,
  mode,
  onModeChange,
  onAddFromNotebook,
  onScan,
  onGostaSearch,
  onJustiinaSearch,
  chips = [],
  instructionText = "Syötä tuotteet pilkulla eroteltuna tai liitä vihkosesta.",
  resultsPanel,
  comparePanel,
  activePanel = "none",
  onOpenResults,
  onOpenCompare,
  className,
}: SearchCardProps) {
  const hasInput = value.trim().length > 0;
  const showResults = activePanel === "results";
  const showCompare = activePanel === "compare";

  return (
    <section
      className={cx(
        "search-card relative overflow-visible rounded-[34px] border-[5px] border-[#5d4b2f] bg-[#f6edcf] px-[34px] pb-[104px] pt-[30px] text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_16px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45 [background-image:radial-gradient(#d8bd75_1.2px,transparent_1.2px)] [background-size:18px_18px]" />

      <div className="relative z-10 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="text-[18px] font-black uppercase tracking-[0.45em] text-[#6f674f]">
            Haku
          </div>
          <h1
            className="mt-2 text-[56px] font-black italic leading-none text-[#203b25] md:text-[68px]"
            style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
          >
            Tuotteet ja vertailu
          </h1>
        </div>

        <button
          type="button"
          onClick={onAddFromNotebook}
          className="shrink-0 rounded-[28px] border-[5px] border-[#0f6d34] bg-gradient-to-b from-[#16a34a] to-[#087a35] px-8 py-4 text-[30px] font-black italic text-[#fff0d5] shadow-[0_0_0_3px_rgba(255,255,255,0.18)_inset,0_8px_0_#07552b] active:translate-y-1 active:shadow-[0_4px_0_#07552b]"
          style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
        >
          Lisää vihkosesta
        </button>
      </div>

      <div className="relative z-10 mt-8 rounded-[34px] border-[5px] border-[#9a7f4b] bg-[#fbf6e6] p-4 shadow-[0_0_0_2px_#f9edc4_inset]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          placeholder="maito, kahvi, jauheliha"
          className="block h-[92px] w-full resize-none rounded-[28px] border-0 bg-[#fffaf0] px-8 py-7 text-[34px] font-black leading-none text-[#102216] outline-none placeholder:text-[#7d7461]"
          style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
        />
      </div>

      <div className="relative z-10 mt-6 grid grid-cols-[360px_300px_360px] items-center justify-between gap-5 max-[1180px]:grid-cols-[320px_270px_320px]">
        <button
          type="button"
          onClick={onGostaSearch}
          className="h-[118px] overflow-hidden rounded-[28px] border-[4px] border-[#789664] bg-gradient-to-b from-[#eef6cd] to-[#d5e8a8] px-5 text-left shadow-[0_0_0_3px_rgba(255,255,255,0.38)_inset,0_8px_0_rgba(83,104,59,0.22)]"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[22px] border-[3px] border-[#9ab985] bg-[#eee1bd] text-[34px]">
              🕵️
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-[34px] font-black italic text-[#2f6d36]"
                style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
              >
                Gösta
              </div>
              <div className="text-[18px] font-black leading-tight text-[#2e6936]">
                Etsi<br />hinnanhuojennukset
              </div>
            </div>
          </div>
        </button>

        <div className="mx-auto flex h-[82px] w-[300px] shrink-0 items-center rounded-[26px] border-[4px] border-[#a68a50] bg-[#ead9a8] p-2 shadow-[0_0_0_2px_#fff2c8_inset,0_6px_0_rgba(90,70,35,0.24)] max-[1180px]:w-[270px]">
          <button
            type="button"
            onClick={() => onModeChange("cart")}
            className={cx(
              "h-full flex-1 rounded-[20px] text-[24px] font-black leading-none transition",
              mode === "cart"
                ? "bg-[#fff5d3] text-[#1d4d29] shadow-[0_0_0_2px_#d3b568_inset]"
                : "text-[#786b4d]",
            )}
            style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
          >
            Koko<br />kori
          </button>
          <button
            type="button"
            onClick={() => onModeChange("single")}
            className={cx(
              "h-full flex-1 rounded-[20px] text-[23px] font-black leading-none transition",
              mode === "single"
                ? "bg-[#fff5d3] text-[#1d4d29] shadow-[0_0_0_2px_#d3b568_inset]"
                : "text-[#786b4d]",
            )}
            style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
          >
            Yksi<br />tuote
          </button>
        </div>

        <button
          type="button"
          onClick={onJustiinaSearch}
          className="h-[118px] overflow-hidden rounded-[28px] border-[4px] border-[#c49b39] bg-gradient-to-b from-[#fff2b8] to-[#f2cf62] px-5 text-left shadow-[0_0_0_3px_rgba(255,255,255,0.34)_inset,0_8px_0_rgba(140,100,25,0.22)]"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[22px] border-[3px] border-[#d6b44d] bg-[#eee1bd] text-[34px]">
              👩‍🍳
            </div>
            <div className="min-w-0">
              <div
                className="truncate text-[34px] font-black italic text-[#9b4a2b]"
                style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
              >
                Justiina
              </div>
              <div className="text-[18px] font-black leading-tight text-[#8d4b2a]">
                Etsi<br />ostokset
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="relative z-10 mt-5 flex min-h-[74px] items-center overflow-hidden rounded-[26px] border-[3px] border-[#d2ad61] bg-[#fff1b8] px-7 text-[22px] font-black text-[#746749] shadow-[0_0_0_2px_rgba(255,255,255,0.34)_inset]">
        {chips.length > 0 ? (
          <div className="flex min-w-0 flex-wrap gap-3">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={chip.onClick}
                className="max-w-[520px] truncate rounded-full border-[2px] border-[#c4a05d] bg-[#fffaf0] px-5 py-2 text-[20px] font-black text-[#2e6b34] shadow-[0_2px_0_rgba(90,70,35,0.18)]"
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="truncate">{instructionText}</span>
        )}
      </div>

      <div className="relative z-10 mt-5 flex justify-center">
        <button
          type="button"
          onClick={onScan}
          className="relative z-[3] h-[100px] w-[86%] rounded-[32px] border-[5px] border-[#856b3d] bg-gradient-to-b from-[#efd295] to-[#d3a258] text-[42px] font-black italic text-[#1f3b25] shadow-[0_0_0_2px_#fff1c5_inset,0_8px_0_rgba(70,50,24,0.38)] active:translate-y-1 active:shadow-[0_4px_0_rgba(70,50,24,0.38)]"
          style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
        >
          <span className="mr-5 inline-flex h-[58px] w-[58px] items-center justify-center rounded-full border-[4px] border-[#7a653e] bg-[#f8f0d8] text-[28px] not-italic">
            📸
          </span>
          Skanneri
        </button>
      </div>

      <div className="absolute bottom-[-74px] left-[34px] right-[34px] z-[4] grid grid-cols-2 gap-5">
        <button
          type="button"
          onClick={onOpenResults}
          className="h-[112px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div className="text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Hakutulokset
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          className="h-[112px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div className="text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Vertailu
          </div>
          <div className="mx-auto mt-6 h-2 w-[120px] rounded-full bg-[#bca267]" />
        </button>
      </div>

      {showResults && (
        <div className="absolute bottom-[56px] left-[34px] z-[60] h-[520px] w-[calc(50%-44px)] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div className="mb-5 text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Hakutulokset
          </div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">{resultsPanel}</div>
        </div>
      )}

      {showCompare && (
        <div className="absolute bottom-[56px] left-[34px] right-[34px] z-[60] h-[520px] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div className="mb-5 text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Vertailu
          </div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">{comparePanel}</div>
        </div>
      )}
    </section>
  );
}
