"use client";
import { getGuestIdentity } from "./guest";
const serverStatus = "Vierastila käytössä";
let status = serverStatus;
const listeners = new Set<() => void>();
export function getGuestStatus() { return status; }
export function getServerGuestStatus() { return serverStatus; }
export function subscribeGuestStatus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function initializeGuestStatus() {
  try {
    status = getGuestIdentity(window.localStorage).persistent
      ? "Vierastila tallentuu tähän selaimeen"
      : "Vierastila toimii vain tämän käynnin ajan";
  } catch { status = serverStatus; }
  listeners.forEach(listener => listener());
}
