/** Passive arrival telemetry. No UI, GPS requests, cart mutations or scanner hooks. */
export type ArrivalDiagnosticEvent = {
  at: number;
  event: string;
  detail: Record<string, string | number | boolean | null>;
};
const MAX_EVENTS = 5000;
const events: ArrivalDiagnosticEvent[] = [];
export function recordArrivalDiagnostic(event: string, detail: ArrivalDiagnosticEvent['detail'] = {}): void {
  events.push({ at: Date.now(), event, detail: { ...detail } });
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}
export function getArrivalDiagnostics(): ArrivalDiagnosticEvent[] {
  return events.map(item => ({ ...item, detail: { ...item.detail } }));
}
export function clearArrivalDiagnostics(): void { events.length = 0; }
