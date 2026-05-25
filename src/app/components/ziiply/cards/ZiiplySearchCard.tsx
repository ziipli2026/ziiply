"use client";

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

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const bodyFont = 'Georgia, "Times New Roman", serif';

function GostaButton({
  onClick,
  disabled = false,
  loading = false,
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cx(
        "group flex h-[86px] min-h-[86px] w-full min-w-0 items-start gap-3 overflow-hidden rounded-[25px] border-[3px] border-[#7b935f] bg-gradient-to-b from-[#eff2d2] to-[#cdd99b] px-3 py-3 text-left shadow-[0_5px_0_rgba(91,72,44,0.22),inset_0_0_0_2px_rgba(255,255,255,0.5)] transition active:translate-y-[1px]",
        disabled ? "cursor-not-allowed opacity-55" : "hover:brightness-105",
      )}
      title="Gösta etsii hinnanhuojennukset"
    >
      <span className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[18px] border-[2px] border-[#9eb17a] bg-[#e7edc4]">
        <img
          src="/assistants/gosta.png"
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="h-full w-full object-cover object-top"
        />
      </span>
      <span className="min-w-0 pt-1">
        <span
          className="block truncate text-[23px] font-black italic leading-none text-[#315f2f]"
          style={{ fontFamily: cooperFont }}
        >
          Gösta
        </span>
        <span
          className="mt-1 block whitespace-normal text-[13px] font-black leading-[1.04] text-[#315f2f]"
          style={{ fontFamily: bodyFont }}
        >
          {loading ? (
            <>
              Etsii
              <br />
              hinnanhuojennuksia…
            </>
          ) : (
            <>
              Etsi
              <br />
              hinnanhuojennukset
            </>
          )}
        </span>
      </span>
    </button>
  );
}

function JustiinaButton({
  onClick,
  disabled = false,
  loading = false,
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cx(
        "group flex h-[86px] min-h-[86px] w-full min-w-0 items-start gap-3 overflow-hidden rounded-[25px] border-[3px] border-[#c69f48] bg-gradient-to-b from-[#fff0bd] to-[#eec965] px-3 py-3 text-left shadow-[0_5px_0_rgba(91,72,44,0.22),inset_0_0_0_2px_rgba(255,255,255,0.5)] transition active:translate-y-[1px]",
        disabled ? "cursor-not-allowed opacity-55" : "hover:brightness-105",
      )}
      title="Justiina etsii ostokset"
    >
      <span className="h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[18px] border-[2px] border-[#d8b457] bg-[#f8e8ba]">
        <img
          src="/assistants/justiina.png"
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="h-full w-full object-cover object-top"
        />
      </span>
      <span className="min-w-0 pt-1">
        <span
          className="block truncate text-[23px] font-black italic leading-none text-[#8a3f16]"
          style={{ fontFamily: cooperFont }}
        >
          Justiina
        </span>
        <span
          className="mt-1 block text-[13px] font-black leading-[1.04] text-[#8a3f16]"
          style={{ fontFamily: bodyFont }}
        >
          {loading ? (
            <>
              Etsii
              <br />
              ostoksia…
            </>
          ) : (
            <>
              Etsi
              <br />
              ostokset
            </>
          )}
        </span>
      </span>
    </button>
  );
}

function ModeToggle({ mode, onModeChange }: { mode: SearchMode; onModeChange: (mode: SearchMode) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[176px] rounded-[20px] border-[3px] border-[#b99d64] bg-[#ead7a5] p-1.5 shadow-[0_0_0_2px_#fff4cc_inset,0_4px_0_rgba(91,72,44,0.18)]">
      <button
        type="button"
        onClick={() => onModeChange("cart")}
        className={cx(
          "min-h-[40px] flex-1 rounded-[15px] px-1 text-[12px] font-black leading-none transition",
          mode === "cart"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_2px_0_rgba(91,72,44,0.18)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Koko kori
      </button>
      <button
        type="button"
        onClick={() => onModeChange("single")}
        className={cx(
          "min-h-[40px] flex-1 rounded-[15px] px-1 text-[12px] font-black leading-none transition",
          mode === "single"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_2px_0_rgba(91,72,44,0.18)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Yksi tuote
      </button>
    </div>
  );
}

export default function ZiiplySearchCard({
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
  const showResults = activePanel === "results";
  const showCompare = activePanel === "compare";
  const hasText = value.trim().length > 0;

  return (
    <section
      className={cx(
        "ziiply-search-card relative isolate h-[455px] min-h-[455px] overflow-visible rounded-[36px] border-[4px] border-[#5b482c] bg-[#f6ebc6] px-5 pb-[110px] pt-5 text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_16px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45 [background-image:radial-gradient(#d8bd75_1.2px,transparent_1.2px)] [background-size:18px_18px]" />

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6">
        <div className="min-w-0">
          <div className="text-[18px] font-black uppercase tracking-[0.45em] text-[#6f674f]">
            Haku
          </div>
          <h1
            className="mt-2 max-w-full whitespace-nowrap text-[clamp(42px,5.0vw,74px)] font-black italic leading-none text-[#203b25]"
            style={{ fontFamily: cooperFont }}
          >
            Tuotteet ja vertailu
          </h1>
        </div>

        <button
          type="button"
          onClick={onAddFromNotebook}
          className="mt-1 shrink-0 rounded-[28px] border-[5px] border-[#0f6d34] bg-gradient-to-b from-[#16a34a] to-[#087a35] px-[clamp(22px,2.5vw,40px)] py-4 text-[clamp(25px,2.6vw,38px)] font-black italic text-[#fff0d5] shadow-[0_0_0_3px_rgba(255,255,255,0.18)_inset,0_8px_0_#07552b] active:translate-y-1 active:shadow-[0_4px_0_#07552b]"
          style={{ fontFamily: cooperFont }}
        >
          Lisää vihkosesta
        </button>
      </div>

      {!hasText ? (
        <div className="relative z-10 mt-5 grid grid-cols-[minmax(250px,290px)_minmax(156px,176px)_minmax(250px,290px)] items-start justify-center gap-3">
          <GostaButton onClick={onGostaSearch} disabled={!value.trim()} />

          <div className="rounded-[28px] border-[3px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_4px_10px_rgba(91,65,28,0.12),0_2px_0_#fff6dc]">
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={2}
              placeholder="maito, kahvi,\njauheliha"
              className="block h-full w-full resize-none rounded-[22px] border-0 bg-[#fffaf0] px-7 py-5 text-center text-[30px] font-black leading-[1.05] text-[#102216] outline-none placeholder:text-[#7d7461]"
              style={{ fontFamily: cooperFont }}
            />
          </div>

          <JustiinaButton onClick={onJustiinaSearch} disabled={!value.trim()} />
        </div>
      ) : (
        <>
          <div className="relative z-10 mt-5 rounded-[28px] border-[3px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_4px_10px_rgba(91,65,28,0.12),0_2px_0_#fff6dc]">
            <textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={1}
              placeholder="maito, kahvi, jauheliha"
              className="block h-[64px] w-full resize-none overflow-hidden rounded-[22px] border-0 bg-[#fff9e8] px-6 py-4 text-[22px] font-black leading-[1.05] text-[#172417] outline-none placeholder:text-[#8b846f]"
              style={{ fontFamily: bodyFont }}
            />
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-[minmax(250px,290px)_minmax(156px,176px)_minmax(250px,290px)] items-start justify-center gap-3">
            <GostaButton onClick={onGostaSearch} />
            <ModeToggle mode={mode} onModeChange={onModeChange} />
            <JustiinaButton onClick={onJustiinaSearch} />
          </div>
        </>
      )}

      {!hasText && (
        <div className="relative z-10 mt-6 flex justify-center">
          <ModeToggle mode={mode} onModeChange={onModeChange} />
        </div>
      )}

      <div className="relative z-10 mt-3 flex min-h-[58px] max-h-[58px] items-center overflow-hidden rounded-[22px] border-[2px] border-[#d2b170] bg-[#fff1bf] px-4 py-3 text-[15px] font-black text-[#7a6842] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
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

      <div className="relative z-10 mt-4 flex justify-center">
        <button
          type="button"
          onClick={onScan}
          className="relative z-[3] h-[76px] w-[82%] rounded-[30px] border-[4px] border-[#856b3d] bg-gradient-to-b from-[#efd295] to-[#d3a258] text-[34px] font-black italic text-[#1f3b25] shadow-[0_0_0_2px_#fff1c5_inset,0_6px_0_rgba(70,50,24,0.38)] active:translate-y-1 active:shadow-[0_3px_0_rgba(70,50,24,0.38)]"
          style={{ fontFamily: cooperFont }}
        >
          <span className="mr-5 inline-flex h-[48px] w-[48px] items-center justify-center rounded-full border-[3px] border-[#7a653e] bg-[#f8f0d8] text-[24px] not-italic">
            📸
          </span>
          Skanneri
        </button>
      </div>

      <div className="absolute bottom-[-78px] left-[34px] right-[34px] z-[4] grid grid-cols-2 gap-5">
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
        <div className="absolute bottom-[-78px] left-[34px] z-[60] h-[600px] w-[calc(50%-44px)] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div className="mb-5 text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Hakutulokset
          </div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">{resultsPanel}</div>
        </div>
      )}

      {showCompare && (
        <div className="absolute bottom-[-78px] left-[34px] right-[34px] z-[60] h-[600px] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div className="mb-5 text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Vertailu
          </div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">{comparePanel}</div>
        </div>
      )}
    </section>
  );
}

export { ZiiplySearchCard };
