"use client";

import React, { useEffect, useRef, useState } from "react";

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
  notFoundTerms?: string[];
  gostaLoading?: boolean;
  justiinaLoading?: boolean;
  onOpenResults?: () => void;
  onOpenCompare?: () => void;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

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
          className="mt-1 block text-[13px] font-black leading-[1.04] text-[#315f2f]"
          style={{ fontFamily: serifFont }}
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
          style={{ fontFamily: serifFont }}
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
    <div className="mx-auto flex h-[72px] w-full max-w-[300px] shrink-0 rounded-[28px] border-[4px] border-[#b99d64] bg-[#ead7a5] p-2 shadow-[0_0_0_3px_#fff4cc_inset,0_6px_0_rgba(91,72,44,0.22)]">
      <button
        type="button"
        onClick={() => onModeChange("cart")}
        className={cx(
          "min-h-[52px] flex-1 rounded-[22px] px-3 text-[22px] font-black leading-[0.9] transition",
          mode === "cart"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_3px_#d9bd77,0_3px_0_rgba(91,72,44,0.18)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Koko<br />kori
      </button>
      <button
        type="button"
        onClick={() => onModeChange("single")}
        className={cx(
          "min-h-[52px] flex-1 rounded-[22px] px-3 text-[22px] font-black leading-[0.9] transition",
          mode === "single"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_3px_#d9bd77,0_3px_0_rgba(91,72,44,0.18)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Yksi<br />tuote
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
  notFoundTerms = [],
  gostaLoading = false,
  justiinaLoading = false,
  onOpenResults,
  onOpenCompare,
  className,
}: SearchCardProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasText = value.trim().length > 0;
  const [typingViewOpen, setTypingViewOpen] = useState(false);
  const showTypingView = hasText || typingViewOpen;
  const showModeToggle = showTypingView;
  const showResults = activePanel === "results";
  const showCompare = activePanel === "compare";

  useEffect(() => {
    // Kun ensimmäinen kirjain vaihtaa tyhjänäkymän kirjoitusnäkymäksi, textarea remounttaa.
    // Tämä palauttaa fokuksen ja kursorin loppuun, jotta kirjoittaminen ei katkea.
    if (!showTypingView) return;
    const frame = window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const cursor = input.value.length;
      input.focus();
      try {
        input.setSelectionRange(cursor, cursor);
      } catch {}
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showTypingView]);

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTypingViewOpen(true);
    onChange(event.target.value);
  };

  const handleTextFocus = () => {
    setTypingViewOpen(true);
  };

  const cleanNotFoundTerms = notFoundTerms
    .map((term) => String(term || "").trim())
    .filter(Boolean);

  const infoContent = cleanNotFoundTerms.length > 0 ? (
    <span className="block w-full truncate text-center text-[#8a3f16]">
      Hakemaasi {cleanNotFoundTerms.join(", ")} ei löytynyt.
    </span>
  ) : chips.length > 0 ? (
    <div className="flex min-w-0 flex-nowrap items-center justify-center gap-2 overflow-hidden">
      {chips.slice(0, 3).map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClick}
          className="max-w-[260px] shrink truncate rounded-full border-[2px] border-[#c4a05d] bg-[#fffaf0] px-4 py-1.5 text-[16px] font-black text-[#2e6b34] shadow-[0_2px_0_rgba(90,70,35,0.18)]"
          style={{ fontFamily: cooperFont }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  ) : (
    <span className="block w-full truncate text-center">{instructionText}</span>
  );

  return (
    <section
      className={cx(
        "ziiply-search-card relative isolate h-[455px] min-h-[455px] overflow-visible rounded-[36px] border-[4px] border-[#5b482c] bg-[#f6ebc6] px-5 pb-[120px] pt-3 text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_16px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45 [background-image:radial-gradient(#d8bd75_1.2px,transparent_1.2px)] [background-size:18px_18px]" />

      <div className="relative z-10 flex h-[78px] items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[15px] font-black uppercase leading-none tracking-[0.42em] text-[#6f674f]">Haku</div>
          <h1
            className="mt-2 whitespace-nowrap text-[clamp(44px,4.8vw,66px)] font-black italic leading-[0.82] text-[#203b25]"
            style={{ fontFamily: cooperFont }}
          >
            Tuotteet ja vertailu
          </h1>
        </div>

        <button
          type="button"
          onClick={onAddFromNotebook}
          className="mt-1 h-[62px] shrink-0 rounded-[28px] border-[4px] border-[#0b6330] bg-gradient-to-b from-[#159b46] to-[#087a35] px-10 text-[28px] font-black italic leading-none text-[#fff0d5] shadow-[0_0_0_4px_rgba(255,255,255,0.20)_inset,0_6px_0_#064a26] active:translate-y-1 active:shadow-[0_2px_0_#064a26]"
          style={{ fontFamily: cooperFont }}
        >
          Lisää vihkosesta
        </button>
      </div>

      {!showTypingView ? (
        <div className="relative z-10 mt-3 grid grid-cols-[minmax(250px,290px)_minmax(170px,210px)_minmax(250px,290px)] items-start justify-center gap-3">
          <GostaButton onClick={onGostaSearch} disabled={!value.trim()} loading={gostaLoading} />

          <div className="h-[86px] rounded-[28px] border-[3px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_4px_10px_rgba(91,65,28,0.12),0_2px_0_#fff6dc]">
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleTextChange}
              onFocus={handleTextFocus}
              rows={1}
              placeholder={"maito, kahvi,\njauheliha"}
              className="block h-full w-full resize-none overflow-hidden rounded-[22px] border-0 bg-[#fffaf0] px-4 py-3 text-center text-[25px] font-black leading-[1.05] text-[#102216] outline-none placeholder:text-[#7d7461]"
              style={{ fontFamily: cooperFont }}
            />
          </div>

          <JustiinaButton onClick={onJustiinaSearch} disabled={!value.trim()} loading={justiinaLoading} />
        </div>
      ) : (
        <>
          <div className="relative z-10 mt-3 rounded-[28px] border-[3px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_4px_10px_rgba(91,65,28,0.12),0_2px_0_#fff6dc]">
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleTextChange}
              onFocus={handleTextFocus}
              rows={1}
              placeholder={mode === "single" ? "Kirjoita yksi tuote" : "maito, kahvi, jauheliha"}
              className="block h-[64px] w-full resize-none overflow-hidden rounded-[22px] border-0 bg-[#fff9e8] px-6 py-4 text-[22px] font-black leading-[1.05] text-[#172417] outline-none placeholder:text-[#8b846f]"
              style={{ fontFamily: serifFont }}
            />
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-[minmax(250px,290px)_minmax(276px,300px)_minmax(250px,290px)] items-start justify-center gap-5">
            <GostaButton onClick={onGostaSearch} loading={gostaLoading} />
            <ModeToggle mode={mode} onModeChange={onModeChange} />
            <JustiinaButton onClick={onJustiinaSearch} loading={justiinaLoading} />
          </div>
        </>
      )}


      <div className="relative z-10 mt-3 flex h-[52px] min-h-[52px] max-h-[52px] items-center justify-center overflow-hidden rounded-[20px] border-[2px] border-[#d2b170] bg-[#fff1bf] px-4 py-2 text-[14px] font-black text-[#7a6842] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
        {infoContent}
      </div>

      <div className="relative z-10 mt-3 flex justify-center">
        <button
          type="button"
          onClick={onScan}
          className="relative z-[3] h-[68px] w-[82%] rounded-[28px] border-[4px] border-[#856b3d] bg-gradient-to-b from-[#efd295] to-[#d3a258] text-[30px] font-black italic text-[#1f3b25] shadow-[0_0_0_2px_#fff1c5_inset,0_6px_0_rgba(70,50,24,0.38)] active:translate-y-1 active:shadow-[0_3px_0_rgba(70,50,24,0.38)]"
          style={{ fontFamily: cooperFont }}
        >
          <span className="mr-5 inline-flex h-[42px] w-[42px] items-center justify-center rounded-full border-[3px] border-[#7a653e] bg-[#f8f0d8] text-[22px] not-italic">
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
          <div className="text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">Hakutulokset</div>
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          className="h-[112px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div className="text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">Vertailu</div>
          <div className="mx-auto mt-6 h-2 w-[120px] rounded-full bg-[#bca267]" />
        </button>
      </div>

      {showResults && (
        <div className="absolute bottom-[-78px] left-[34px] z-[60] h-[600px] w-[calc(50%-44px)] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div className="mb-5 text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">Hakutulokset</div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">{resultsPanel}</div>
        </div>
      )}

      {showCompare && (
        <div className="absolute bottom-[-78px] left-[34px] right-[34px] z-[60] h-[600px] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div className="mb-5 text-[22px] font-black uppercase tracking-[0.38em] text-[#746749]">Vertailu</div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">{comparePanel}</div>
        </div>
      )}
    </section>
  );
}

export { ZiiplySearchCard };
