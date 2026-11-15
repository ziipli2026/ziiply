function parseGostaValidityDate(value: unknown) {
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?=$|[T ])/);
  const local = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})?$/);
  const [year, month, day] = iso ? iso.slice(1) : local ? [local[3], local[2], local[1]] : [];
  if (!month || !day || Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return undefined;
  return { year, month: Number(month), day: Number(day) };
}

function isGostaValidityText(text: string) {
  return /^(?:voimassa(?:oloaika)?\b|(?:\d{4}-\d{2}-\d{2}|\d{1,2}\.(?:\d{1,2}\.)?)\s*(?:[–—-]|$))/i.test(text);
}

export function gostaOfferValidity(p: any, fallback = "Voimassaoloa ei ilmoitettu") {
  const source = p.__sourceOfferSearchResult || {};
  const text = [p.validityText, source.validityText, p.discountText]
    .map(value => String(value ?? "").trim()).find(isGostaValidityText) || "";
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*[–—-]\s*(\d{4}-\d{2}-\d{2})/);
  const localRange = text.match(/(\d{1,2})\.(?:\s*(\d{1,2})\.)?\s*[–—-]\s*(\d{1,2})\.(\d{1,2})\./);
  const single = text.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.(?:\d{4})?/)?.[0];
  const startsOnly = /\balkaen\b/i.test(text);
  const from = [p.validFrom, source.validFrom, isoRange?.[1],
    localRange && `${localRange[1]}.${localRange[2] || localRange[4]}.`, startsOnly && single]
    .map(parseGostaValidityDate).find(Boolean);
  const until = [p.validUntil, p.validTo, source.validUntil, source.validTo, isoRange?.[2],
    localRange && `${localRange[3]}.${localRange[4]}.`, !startsOnly && single]
    .map(parseGostaValidityDate).find(Boolean);
  const short = (date: NonNullable<ReturnType<typeof parseGostaValidityDate>>) => `${date.day}.${date.month}.`;

  if (from && until) {
    if (from.year && until.year && from.year !== until.year) {
      return `Voimassa ${short(from)}${from.year}–${short(until)}${until.year}`;
    }
    if (from.day === until.day && from.month === until.month) return `Voimassa ${short(until)}${until.year || ""} saakka`;
    return `Voimassa ${from.month === until.month ? `${from.day}.` : short(from)}–${short(until)}`;
  }
  if (until) return `Voimassa ${short(until)}${until.year || ""} saakka`;
  if (from) return `Voimassa alkaen ${short(from)}`;
  return text || fallback;
}

export function gostaOfferDiscount(p: any) {
  const text = String(p.discountText || p.__sourceOfferSearchResult?.discountText || "").trim();
  return isGostaValidityText(text) ? "" : text;
}
