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
      : ["Etsii", "hinnanhuojennukset"]
    : loading
      ? ["Etsii", "ostoksia…"]
      : ["Etsii", "ostokset"];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={title}
      className={cx(
        "grid h-[82px] min-w-0 grid-cols-[68px_minmax(0,1fr)] items-center gap-2 overflow-hidden rounded-[24px] border-[3px] px-2 text-left shadow-[0_5px_0_rgba(91,72,44,0.20),inset_0_0_0_2px_rgba(255,255,255,0.48)] transition active:translate-y-[1px]",
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
          className="h-full w-full object-contain"
        />
      </span>

      <span className="min-w-0 flex-1 overflow-hidden">
        <span
          className="block whitespace-nowrap text-[20px] font-black italic leading-[0.95]"
          style={{ fontFamily: cooperFont }}
        >
          {name}
        </span>
        <span
          className="mt-1 block overflow-hidden text-[10px] font-black leading-[1.04]"
          style={{ fontFamily: serifFont }}
        >
          <span className="block whitespace-nowrap">{subline[0]}</span>
          <span className="block whitespace-nowrap tracking-[-0.03em]">{subline[1]}</span>
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
    <div className="mx-auto grid h-[58px] w-full max-w-[204px] grid-cols-2 rounded-[24px] border-[4px] border-[#b99d64] bg-[#ead7a5] p-2 shadow-[0_0_0_3px_#fff4cc_inset,0_5px_0_rgba(91,72,44,0.22)]">
      <button
        type="button"
        onClick={() => onModeChange("cart")}
        className={cx(
          "rounded-[17px] px-2 text-[15px] font-black leading-[0.9] transition",
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
          "rounded-[17px] px-2 text-[15px] font-black leading-[0.9] transition",
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

  const normalizeUiText = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9åäö]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedValue = normalizeUiText(value);
  const normalizedValueTerms = value
    .split(/[,;\n]/)
    .map(normalizeUiText)
    .filter(Boolean);

  // NOT_FOUND_STALE_GUARD:
  // Parent state may briefly keep the previous not-found term after the user starts
  // typing a new query. Do not let that stale error hide the predictive chips.
  // Show the error only while the current input still exactly matches that failed term.
  const activeNotFoundTerms = cleanNotFoundTerms.filter((term) => {
    const normalizedTerm = normalizeUiText(term);
    if (!normalizedTerm || !normalizedValue) return false;
    return (
      normalizedValue === normalizedTerm ||
      normalizedValueTerms.some((valueTerm) => valueTerm === normalizedTerm)
    );
  });

  const infoContent = activeNotFoundTerms.length > 0 ? (
    <span className="block w-full truncate text-center text-[#8a3f16]">
      Etsimääsi {activeNotFoundTerms.join(", ")} ei löytynyt.
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
        "ziiply-search-card relative isolate h-[374px] min-h-[374px] overflow-visible rounded-[36px] border-[4px] border-[#5b482c] bg-[#f6ebc6] px-5 pt-3 text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_13px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45"
        style={{
          backgroundImage: "radial-gradient(#d8bd75 1.2px, transparent 1.2px)",
          backgroundSize: "18px 18px",
          backgroundPosition: "9px 0px",
        }}
      />

      <div className="relative z-10 grid h-[64px] grid-cols-[minmax(0,1fr)_minmax(220px,286px)] items-start gap-4">
        <div className="min-w-0 overflow-hidden">
          <div
            className="text-[13px] font-black uppercase leading-none tracking-[0.38em] text-[#6f674f]"
            style={{ fontFamily: copperplateFont }}
          >
            Haku
          </div>
          <h1
            className="mt-1 max-w-full truncate whitespace-nowrap text-[clamp(28px,2.35vw,34px)] font-black italic leading-[0.95] text-[#203b25]"
            style={{ fontFamily: cooperFont }}
          >
            Tuotteet ja vertailu
          </h1>
        </div>

        <button
          type="button"
          onClick={onAddFromNotebook}
          className="h-[48px] justify-self-end rounded-[23px] border-[4px] border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] px-5 text-[19px] font-black italic leading-none text-[#fff0d5] shadow-[0_0_0_3px_rgba(255,255,255,0.18)_inset,0_5px_0_#064a26] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#064a26]"
          style={{ fontFamily: cooperFont }}
        >
          Lisää vihkosesta
        </button>
      </div>

      {!showTypingView ? (
        <div className="relative z-10 mt-1 grid -translate-x-[16px] grid-cols-[minmax(215px,1fr)_minmax(220px,270px)_minmax(215px,1fr)] items-center gap-4">
          <AssistantButton
            kind="gosta"
            onClick={onGostaSearch}
            disabled={!value.trim()}
            loading={gostaLoading}
          />

          <div className="h-[78px] overflow-hidden rounded-[26px] border-[4px] border-[#9d8350] bg-[#fff4d3] p-2 shadow-[inset_0_3px_8px_rgba(91,65,28,0.10)]">
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleTextChange}
              onFocus={handleTextFocus}
              rows={2}
              placeholder={"maito, kahvi,\njauheliha"}
              className="block h-full w-full resize-none overflow-hidden rounded-[22px] border-0 bg-[#fffaf0] px-4 py-[10px] text-center text-[24px] font-black leading-[1.03] text-[#102216] outline-none placeholder:text-[#7d7461]"
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
          <div className="relative z-10 mx-7 mt-1 h-[62px] overflow-hidden rounded-[23px] border-[4px] border-[#9d8350] bg-[#fff4d3] p-1.5 shadow-none">
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
              className="block h-full w-full resize-none overflow-hidden rounded-[18px] border-0 bg-[#fff9e8] px-7 py-[8px] text-[24px] font-black leading-none text-[#172417] outline-none placeholder:text-[#8b846f]"
              style={{ fontFamily: serifFont }}
            />
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-[minmax(215px,1fr)_minmax(170px,204px)_minmax(215px,1fr)] items-center gap-4">
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

      <div className="absolute bottom-[78px] left-[46px] right-[46px] z-20 flex h-[44px] items-center justify-center overflow-hidden rounded-[19px] border-[3px] border-[#d2b170] bg-[#fff1bf] px-5 text-[16px] font-black text-[#7a6842] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_0_rgba(91,72,44,0.12)]">
        {infoContent}
      </div>

      <div className="absolute bottom-[12px] left-[58px] right-[58px] z-10">
        <button
          type="button"
          onClick={onScan}
          className="relative h-[58px] w-full rounded-[27px] border-[4px] border-[#856b3d] bg-gradient-to-b from-[#efd295] to-[#d3a258] text-[29px] font-black italic text-[#1f3b25] shadow-[0_0_0_2px_#fff1c5_inset,0_6px_0_rgba(70,50,24,0.38)] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_3px_0_rgba(70,50,24,0.38)]"
          style={{ fontFamily: cooperFont }}
        >
          <span className="mr-5 inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border-[3px] border-[#7a653e] bg-[#f8f0d8] text-[22px] not-italic">
            📸
          </span>
          Skanneri
        </button>
      </div>

      <div className="absolute bottom-[-64px] left-[36px] right-[36px] z-[4] grid grid-cols-2 gap-5">
        <button
          type="button"
          onClick={onOpenResults}
          className="h-[96px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 pt-6 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div
            className="text-[19px] font-black uppercase tracking-[0.38em] text-[#746749]"
            style={{ fontFamily: copperplateFont }}
          >
            Hakutulokset
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          className="h-[96px] rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] px-7 pt-6 text-left shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]"
        >
          <div
            className="text-[19px] font-black uppercase tracking-[0.38em] text-[#746749]"
            style={{ fontFamily: copperplateFont }}
          >
            Vertailu
          </div>
          <div className="mx-auto mt-6 h-2 w-[95px] rounded-full bg-[#bca267]" />
        </button>
      </div>

      {showResults && (
        <div className="absolute bottom-[-64px] left-[36px] z-[60] h-[540px] w-[calc(50%-46px)] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
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
        <div className="absolute bottom-[-64px] left-[36px] right-[36px] z-[60] h-[560px] overflow-hidden rounded-t-[34px] border-[4px] border-[#b99755] bg-[#ead39a] p-6 shadow-[0_0_0_2px_#fff4cd_inset,0_20px_38px_rgba(50,35,10,0.35)]">
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
