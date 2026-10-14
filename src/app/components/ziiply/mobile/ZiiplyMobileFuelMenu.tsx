"use client";

import {useEffect, useRef} from "react";

export default function ZiiplyMobileFuelMenu({onClose, onReport, onShowPrices}: {
  onClose: () => void;
  onReport: () => void;
  onShowPrices: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      } else if (event.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => {
      window.removeEventListener("keydown", handleKey, true);
      previous?.focus();
    };
  }, [onClose]);

  const button = "rounded-2xl border-2 border-[#17573c] bg-[#fff8df] px-4 py-4 text-lg font-black text-[#17573c]";
  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-[#092e25]/60 p-4 sm:hidden" onClick={onClose}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-label="Polttoaine" className="w-full max-w-[360px] rounded-[24px] border-[3px] border-[#17573c] bg-[#fff4cf] p-4 shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-[#17573c]">Polttoaine</h2>
          <button type="button" aria-label="Sulje polttoainevalikko" onClick={onClose} className="h-10 w-10 rounded-full border-2 border-[#17573c] text-xl">×</button>
        </header>
        <div className="grid gap-3">
          <button type="button" className={button} onClick={onReport}>⛽ Ilmoita hinnat</button>
          <button type="button" className={button} onClick={onShowPrices}>⛽ Näytä hinnat</button>
        </div>
      </section>
    </div>
  );
}
