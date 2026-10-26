"use client";
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { arrivalNoticeReducer, type ArrivalNotice } from './ziiplyArrivalNotice';
import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';

export function useZiiplyArrivalNotice(enabled: boolean) {
  const [notice, dispatch] = useReducer(arrivalNoticeReducer, null);
  const update = useCallback((decision: ZiiplyArrivalDecision, at: number) => {
    dispatch({ type: 'sample', decision, at });
    window.dispatchEvent(new CustomEvent('ziiply-arrival-debug', { detail: {
      source: 'main', status: decision.status, store: decision.store?.name ?? null,
      selected: decision.isSelectedStore, arrival: decision.showArrivalMessage, radar: decision.radar,
    } }));
  }, []);
  useEffect(() => { if (!enabled) dispatch({ type: 'reset' }); }, [enabled]);
  useEffect(() => {
    const resume = () => { if (document.visibilityState === 'visible') dispatch({ type: 'resume', at: Date.now() }); };
    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, []);
  useEffect(() => {
    if (!enabled || notice?.deadline == null) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') dispatch({ type: 'tick', at: Date.now() });
    }, Math.max(0, notice.deadline - Date.now()));
    return () => window.clearTimeout(timer);
  }, [enabled, notice?.deadline, notice?.phase]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ziiply-arrival-debug', { detail: {
      source: 'main-ui', phase: enabled ? notice?.phase ?? 'none' : 'disabled',
      store: notice?.name ?? null, deadline: notice?.deadline ?? null,
    } }));
  }, [enabled, notice?.phase, notice?.name, notice?.deadline]);
  return { notice: enabled ? notice : null, update,
    dismiss: () => dispatch({ type: 'dismiss' }),
    skip: () => dispatch({ type: 'skip', at: Date.now() }) };
}

export default function ZiiplyArrivalNotice({ notice, onDismiss, onSkip, onList, onRecipe, onOffers, onStoreChange }: {
  notice: ArrivalNotice | null; onDismiss: () => void; onSkip: () => void;
  onList: () => void; onRecipe: () => void; onOffers: () => void; onStoreChange: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const visible = !!notice && !['waiting', 'done'].includes(notice.phase);
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [visible]);
  if (!visible || !notice) return null;
  const button = 'rounded-xl border border-emerald-800 bg-white px-4 py-3 text-base font-bold text-emerald-950';
  return <div data-testid="gps-arrival-overlay" style={{ position: 'fixed', inset: 0, zIndex: 2147483646, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0,0,0,.40)' }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Kauppaan saapuminen" onKeyDown={e => {
      if (e.key === 'Escape') { e.preventDefault(); onDismiss(); }
      if (e.key === 'Tab') {
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { e.preventDefault(); first.focus(); }
      }
    }} style={{ width: '100%', maxWidth: 410, maxHeight: '80dvh', overflowY: 'auto', borderRadius: 20, padding: 24, color: '#103b25', background: '#e4f8e8', boxShadow: '0 12px 36px #0006', textAlign: 'center' }}>
      <div className="mb-4 text-xl font-extrabold" aria-live="polite">{notice.phase === 'approach' ? `Olet saapumassa ${notice.name}` : notice.phase === 'store-change' ? `Olet kaupassa ${notice.name}. Vaihdetaanko kauppavalinta?` : notice.phase === 'list' ? 'Lisätäänkö ostoslista tai resepti?' : 'Katso tarjoukset?'}</div>
      {notice.phase !== 'approach' && <div className="flex flex-wrap justify-center gap-3">
        {notice.phase === 'list' ? <><button type="button" className={button} onClick={onList}>Ostoslista</button><button type="button" className={button} onClick={onRecipe}>Resepti</button><button type="button" className={button} onClick={onSkip}>Ei nyt</button></> : notice.phase === 'offers' ? <><button type="button" className={button} onClick={onOffers}>Katso tarjoukset</button><button type="button" className={button} onClick={onDismiss}>Ei nyt</button></> : <><button type="button" className={button} onClick={onStoreChange}>Valitse kauppa</button><button type="button" className={button} onClick={onDismiss}>Ei nyt</button></>}
      </div>}
    </div>
  </div>;
}
