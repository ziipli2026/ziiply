import { NextRequest, NextResponse } from 'next/server';
import { createRuoanhintaPriceLookup } from '@/lib/neonSearchSimulation/ruoanhintaPriceLookup.mjs';

export const dynamic = 'force-dynamic';
const stores = [{ id: 'S', storeId: 292 }, { id: 'K', storeId: 3221 }];
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const ean = searchParams.get('ean') || '';
  const name = (searchParams.get('name') || '').trim();
  const selected = searchParams.get('stores') || 'S,K';
  if (!/^\d{8,14}$/.test(ean) || !name || name.length > 120 || !/^(S|K)(,(S|K))?$/.test(selected)) {
    return NextResponse.json({ ok: false, error: 'Invalid parameters' }, { status: 400 });
  }
  const allowed = new Set(selected.split(','));
  const lookup = createRuoanhintaPriceLookup(stores.filter(s => allowed.has(s.id)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const prices = await lookup({ ean, name }, controller.signal);
    return NextResponse.json({ ok: true, prices }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, prices: [], error: 'Upstream unavailable' }, { status: 503 });
  } finally {
    clearTimeout(timer);
  }
}
