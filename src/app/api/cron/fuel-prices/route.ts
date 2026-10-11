import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
const HOURS = new Set([6, 10, 15, 20]);
const localHour = () => Number(new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Helsinki", hour: "2-digit", hourCycle: "h23"
}).format(new Date()));

/**
 * The scheduler is intentionally fail-closed until the complete nationwide
 * Tankkaus.com collector is connected and validated. A partial geographic
 * sample must never be reported as a successful nationwide refresh.
 */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET ||
      request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const hour = localHour();
  if (!HOURS.has(hour)) return NextResponse.json({ ok: true, skipped: true, localHour: hour });
  return NextResponse.json({
    ok: false, localHour: hour, imported: 0,
    error: "Nationwide Tankkaus collector not yet verified; refusing partial or unsafe database writes"
  }, { status: 503 });
}
