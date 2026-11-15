/**
 * Conservative Lidl publication repair. The publisher's original taxonomy
 * is evidence and must never be replaced with an inferred display category.
 * Applied to new snapshots before storage and to old snapshots on read.
 * No SQL UPDATE or publication approval is performed here.
 */
export function repairLidlPublicationCategory<T>(chain: string, offer: T): T {
  if (!chain.startsWith("LIDL:") || !offer || typeof offer !== "object") return offer;
  const row = offer as Record<string, unknown>;
  const title = String(row.title || row.name || "").toLocaleLowerCase("fi");
  const normalized = title.replace(/\s+/g, " ").trim();
  let category: string | null = null;
  // Explicit non-grocery products must not inherit food classifications.
  if (/(?:sukkalanka|pullotunkki|juomapullo|joulukaktus|tulilatva|bluetooth-vastamelukuulokkeet|auton akkulaturi|autotarvike|työhousut|varavirtalähde|auton lumisukat|wc-raikastin|viemärinavaaja)/.test(normalized)) {
    category = "Koti & vapaa-aika";
  } else if (/klementiini/.test(normalized)) {
    category = "Hevi";
  } else if (/(?:perunalaatikko|porkkanalaatikko|rosolli|kauraruoka)/.test(normalized)) {
    category = "Valmisruoka";
  }
  if (!category || (row.category === category && row.categoryPath === category && row.mainCategory === category)) return offer;
  return { ...row, category, categoryPath: category, mainCategory: category } as T;
}
