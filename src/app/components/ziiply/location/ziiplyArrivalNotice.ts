import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';

export const APPROACH_NOTICE_MS = 4000;
export const ARRIVAL_CHOICE_MS = 5000;
export type ArrivalPhase = 'approach' | 'waiting' | 'store-change' | 'list' | 'offers' | 'done';
export type ArrivalNotice = {
  id: string; name: string; phase: ArrivalPhase; deadline: number | null;
  approachUntil: number; confirmed: boolean; selected: boolean;
};
export type ArrivalNoticeEvent =
  | { type: 'sample'; decision: ZiiplyArrivalDecision; at: number }
  | { type: 'tick' | 'skip' | 'resume'; at: number }
  | { type: 'dismiss' }
  | { type: 'reset' };

function choices(state: ArrivalNotice, at: number): ArrivalNotice {
  if (!state.confirmed) return { ...state, phase: 'waiting', deadline: null };
  return { ...state, phase: state.selected ? 'list' : 'store-change', deadline: at + ARRIVAL_CHOICE_MS };
}

// One visit, one sequence. Repeated GPS samples never restart a UI deadline.
export function arrivalNoticeReducer(state: ArrivalNotice | null, event: ArrivalNoticeEvent): ArrivalNotice | null {
  if (event.type === 'reset') return null;
  if (event.type === 'dismiss') return state ? { ...state, phase: 'done', deadline: null } : null;
  if (event.type === 'resume') return state && state.deadline !== null
    ? { ...state, deadline: event.at + (state.phase === 'approach' ? APPROACH_NOTICE_MS : ARRIVAL_CHOICE_MS) } : state;
  if (event.type === 'sample') {
    const d = event.decision;
    if (d.status === 'uncertain') return state ? { ...state, confirmed: false, phase: state.phase === 'done' ? 'done' : 'waiting', deadline: null } : null;
    if (!d.store || (d.status !== 'near-store' && d.status !== 'in-store')) return null;
    if (!state || state.id !== d.store.id) {
      return { id: d.store.id, name: d.store.name, phase: 'approach', deadline: event.at + APPROACH_NOTICE_MS,
        approachUntil: event.at + APPROACH_NOTICE_MS, confirmed: d.status === 'in-store', selected: d.isSelectedStore };
    }
    const next = { ...state, confirmed: d.status === 'in-store', selected: d.isSelectedStore };
    if (!next.confirmed && ['list', 'offers', 'store-change'].includes(next.phase)) return { ...next, phase: 'waiting', deadline: null };
    if (next.phase === 'waiting' && next.confirmed) {
      return event.at < next.approachUntil ? { ...next, phase: 'approach', deadline: next.approachUntil } : choices(next, event.at);
    }
    if (next.phase === 'store-change' && next.selected) return choices(next, event.at);
    if (next.confirmed && !next.selected && ['list', 'offers'].includes(next.phase)) return choices(next, event.at);
    return next;
  }
  if (!state || (event.type === 'tick' && (state.deadline === null || event.at < state.deadline))) return state;
  if (state.phase === 'approach') return choices(state, event.at);
  if (state.phase === 'list') return state.confirmed && state.selected
    ? { ...state, phase: 'offers', deadline: event.at + ARRIVAL_CHOICE_MS }
    : { ...state, phase: 'waiting', deadline: null };
  return { ...state, phase: 'done', deadline: null };
}
