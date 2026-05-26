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
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';

function AssistantButton({
  kind,
  onClick,
  disabled = false,
  loading = false,
}: {
  kind: "gosta" | "justiina";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isGosta = kind === "gosta";
  const name = isGosta ? "Gösta" : "Justiina";
  const image = isGosta ? "/assistants/gosta.png" : "/assistants/justiina.png";
  const title = isGosta
    ? "Gösta etsii hinnanhuojennukset"
    : "Justiina etsii ostokset";
  const subline = isGosta
    ? loading
      ? ["Etsii", "hinnanhuojennuksia…"]
      : ["Etsi", "hinnanhuojennukset"]
    : loading
      ? ["Etsii", "ostoksia…"]
      : ["Etsi", "ostokset"];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={title}
      className={cx(
        "flex h-[86px] min-w-0 items-center gap-2 overflow-hidden rounded-[24px] border-[3px] px-2.5 text-left shadow-[0_5px_0_rgba(91,72,44,0.20),inset_0_0_0_2px_rgba(255,255,255,0.48)] transition active:translate-y-[1px]",
        isGosta
          ? "border-[#7f9866] bg-gradient-to-b from-[#f0f3d7] to-[#d0dda0] text-[#315f2f]"
          : "border-[#d3b255] bg-gradient-to-b from-[#fff2c4] to-[#efd06f] text-[#9a5a36]",
        disabled ? "cursor-not-allowed opacity-55" : "hover:brightness-105",
      )}
    >
      <span
        className={cx(
          "grid h-[68px] w-[68px] shrink-0 place-items-center overflow-hidden rounded-[19px] border-[2px] bg-[#f7edc6]",
          isGosta ? "border-[#98ae78]" : "border-[#d7b85d]",
        )}
      >
        <img
          src={image}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
          className="h-full w-full object-cover object-top"
        />
      </span>

      <span className="min-w-0 flex-1 overflow-hidden">
        <span
          className="block truncate text-[24px] font-black italic leading-[0.95]"
          style={{ fontFamily: cooperFont }}
        >
          {name}
        </span>
        <span
          className="mt-1 block overflow-hidden text-[13px] font-black leading-[1.04]"
          style={{ fontFamily: serifFont }}
        >
          <span className="block truncate">{subline[0]}</span>
          <span className="block truncate">{subline[1]}</span>
        </span>
      </span>
    </button>
  );
}

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}) {
  return (
    <div className="mx-auto grid h-[64px] w-full max-w-[220px] grid-cols-2 rounded-[24px] border-[4px] border-[#b99d64] bg-[#ead7a5] p-2 shadow-[0_0_0_3px_#fff4cc_inset,0_5px_0_rgba(91,72,44,0.22)]">
      <button
        type="button"
        onClick={() => onModeChange("cart")}
        className={cx(
          "rounded-[18px] px-2 text-[17px] font-black leading-[0.9] transition",
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
          "rounded-[18px] px-2 text-[17px] font-black leading-[0.9] transition",
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
  instructionText = "Justiina ehdottaa sopivia hakusanoja kirjoituksen mukaan.",
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
  const showResults = activePanel === "results";
  const showCompare = activePanel === "compare";

  useEffect(() => {
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
      Etsimääsi {cleanNotFoundTerms.join(", ")} ei löytynyt.
    </span>
  ) : chips.length > 0 ? (
    <div className="flex min-w-0 flex-nowrap items-center justify-center gap-3 overflow-hidden">
      {chips.slice(0, 3).map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClick}
          className="max-w-[300px] shrink truncate rounded-full border-[2px] border-[#c4a05d] bg-[#fffaf0] px-5 py-1 text-[17px] font-black text-[#2e6b34] shadow-[0_2px_0_rgba(90,70,35,0.18)]"
          style={{ fontFamily: cooperFont }}
        >
          {chip.label}
        </button>
      ))}
    </div>
  ) : !hasText ? (
    <span className="block w-full truncate text-center">{instructionText}</span>
  ) : (
    <span aria-hidden="true" className="block h-5 w-full" />
  );

  return (
    <section
      className={cx(
        "ziiply-search-card relative isolate h-[430px] min-h-[430px] overflow-visible rounded-[36px] border-[4px] border-[#5b482c] bg-[#f6ebc6] px-5 pt-3 text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_13px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45 [background-image:radial-gradient(#d8bd75_1.2px,transparent_1.2px)] [background-size:18px_18px]" />

      <div className="relative z-10 grid h-[84px] grid-cols-[minmax(0,1fr)_minmax(280px,390px)] items-start gap-4">
        <div className="min-w-0 overflow-hidden">
          <div
            className="text-[15px] font-black uppercase leading-none tracking-[0.38em] text-[#6f674f]"
            style={{ fontFamily: copperplateFont }}
          >
            Haku
          </div>
          <h1
            className="mt-1 max-w-full truncate whitespace-nowrap text-[clamp(34px,3.65vw,52px)] font-black italic leading-[0.95] text-[#203b25]"
            style={{ fontFamily: cooperFont }}
          >
            Tuotteet ja vertailu
          </h1>
        </div>

        <button
          type="button"
          onClick={onAddFromNotebook}
          className="h-[60px] justify-self-end rounded-[27px] border-[4px] border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] px-8 text-[24px] font-black italic leading-none text-[#fff0d5] shadow-[0_0_0_3px_rgba(255,255,255,0.18)_inset,0_5px_0_#064a26] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#064a26]"
          style={{ fontFamily: cooperFont }}
        >
          Lisää vihkosesta
        </button>
      </div>

      {!showTypingView ? (
        <div className="relative z-10 mt-1 grid grid-cols-[minmax(205px,1fr)_minmax(220px,275px)_minmax(205px,1fr)] items-center gap-4">
          <AssistantButton
            kind="gosta"
            onClick={onGostaSearch}
            disabled={!value.trim()}
            loading={gostaLoading}
          />

          <div className="h-[86px] rounded-[28px] border-[4px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_4px_10px_rgba(91,65,28,0.12),0_2px_0_#fff6dc]">
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleTextChange}
              onFocus={handleTextFocus}
              rows={2}
              placeholder={"maito, kahvi,\njauheliha"}
              className="block h-full w-full resize-none overflow-hidden rounded-[22px] border-0 bg-[#fffaf0] px-4 py-[13px] text-center text-[25px] font-black leading-[1.03] text-[#102216] outline-none placeholder:text-[#7d7461]"
              style={{ fontFamily: cooperFont }}
            />
          </div>

          <AssistantButton
            kind="justiina"
            onClick={onJustiinaSearch}
            disabled={!value.trim()}
            loading={justiinaLoading}
          />
        </div>
      ) : (
        <>
          <div className="relative z-10 mt-1 h-[82px] rounded-[29px] border-[4px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_4px_10px_rgba(91,65,28,0.12),0_2px_0_#fff6dc]">
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleTextChange}
              onFocus={handleTextFocus}
              rows={1}
              placeholder={
                mode === "single"
                  ? "Kirjoita yksi tuote"
                  : "maito, kahvi, jauheliha"
              }
              className="block h-full w-full resize-none overflow-hidden rounded-[23px] border-0 bg-[#fff9e8] px-8 py-[17px] text-[28px] font-black leading-none text-[#172417] outline-none placeholder:text-[#8b846f]"
              style={{ fontFamily: serifFont }}
            />
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-[minmax(205px,1fr)_minmax(180px,220px)_minmax(205px,1fr)] items-center gap-4">
            <AssistantButton
              kind="gosta"
              onClick={onGostaSearch}
              loading={gostaLoading}
            />
            <ModeToggle mode={mode} onModeChange={onModeChange} />
            <AssistantButton
              kind="justiina"
              onClick={onJustiinaSearch}
              loading={justiinaLoading}
            />
          </div>
        </>
      )}

      <div className="absolute bottom-[84px] left-[46px] right-[46px] z-20 flex h-[44px] items-center justify-center overflow-hidden rounded-[19px] border-[3px] border-[#d2b170] bg-[#fff1bf] px-5 text-[16px] font-black text-[#7a6842] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_0_rgba(91,72,44,0.12)]">
        {infoContent}
      </div>

      <div className="absolute bottom-[14px] left-[58px] right-[58px] z-10">
        <button
          type="button"
          onClick={onScan}
          className="relative h-[62px] w-full rounded-[28px] border-[4px] border-[#856b3d] bg-gradient-to-b from-[#efd295] to-[#d3a258] text-[31px] font-black italic text-[#1f3b25] shadow-[0_0_0_2px_#fff1c5_inset,0_6px_0_rgba(70,50,24,0.38)] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_3px_0_rgba(70,50,24,0.38)]"
          style={{ fontFamily: cooperFont }}
        >
          <span className="mr-5 inline-flex h-[42px] w-[42px] items-center justify-center rounded-full border-[3px] border-[#7a653e] bg-[#f8f0d8] text-[22px] not-italic">
            📸
          </span>
          Skanneri
        </button>
      </div>

      <div className="absolute bottom-[-72px] left-[36px] right-[36px] z-[4] grid grid-cols-2 gap-5">
        <button
          type="button"
          onClick={onOpenResults}
          className="h-[102px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 pt-7 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div
            className="text-[20px] font-black uppercase tracking-[0.38em] text-[#746749]"
            style={{ fontFamily: copperplateFont }}
          >
            Hakutulokset
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          className="h-[102px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 pt-7 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div
            className="text-[20px] font-black uppercase tracking-[0.38em] text-[#746749]"
            style={{ fontFamily: copperplateFont }}
          >
            Vertailu
          </div>
          <div className="mx-auto mt-6 h-2 w-[95px] rounded-full bg-[#bca267]" />
        </button>
      </div>

      {showResults && (
        <div className="absolute bottom-[-72px] left-[36px] z-[60] h-[560px] w-[calc(50%-46px)] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div
            className="mb-5 text-[21px] font-black uppercase tracking-[0.38em] text-[#746749]"
            style={{ fontFamily: copperplateFont }}
          >
            Hakutulokset
          </div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">
            {resultsPanel}
          </div>
        </div>
      )}

      {showCompare && (
        <div className="absolute bottom-[-72px] left-[36px] right-[36px] z-[60] h-[560px] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
          <div
            className="mb-5 text-[21px] font-black uppercase tracking-[0.38em] text-[#746749]"
            style={{ fontFamily: copperplateFont }}
          >
            Vertailu
          </div>
          <div className="h-[calc(100%-54px)] overflow-y-auto pr-2">
            {comparePanel}
          </div>
        </div>
      )}
    </section>
  );
}

export { ZiiplySearchCard };
