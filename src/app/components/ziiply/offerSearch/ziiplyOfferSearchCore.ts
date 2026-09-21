// V175_K_ONLY_TRUSTED_CATEGORY_FIX
// Replace ONLY getTrustedETarjousCategoryV166() in ziiplyOfferSearchCore.ts with this version.
// S-Market branch is preserved byte-for-behavior: same detection and same old category map.
// K-Supermarket gets its own isolated branch and trusts V54 provider category values.

function getTrustedETarjousCategoryV166(item: ZiiplyGostaOfferLike) {
  const anyItem = item as any;
  const sourceUrl = normalizeGostaCoreText(anyItem?.sourceUrl || "");
  const store = normalizeGostaCoreText(
    [anyItem?.storeLabel, anyItem?.storeName, anyItem?.shopName]
      .filter(Boolean)
      .join(" "),
  );

  // IMPORTANT: preserve existing S-Market/eTarjouslehdet behavior unchanged.
  const isETarjousSMarket =
    sourceUrl.includes("etarjouslehdet") ||
    store.includes("s market") ||
    store.includes("s-market");

  const rawCategory = String(anyItem?.category || "").trim();
  const normalized = normalizeGostaCoreText(rawCategory)
    .replace(/\bja\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (isETarjousSMarket) {
    return TRUSTED_GOSTA_CATEGORY_LABELS_V166.get(normalized) || "";
  }

  // V175: K-only branch. V54 kruokaProvider has already classified these offers.
  // Do not run K-Supermarket's trusted category back through the legacy CategoryCore.
  const source = normalizeGostaCoreText(anyItem?.source || "");
  const provider = normalizeGostaCoreText(anyItem?.provider || "");
  const isKSupermarketTjek =
    (store.includes("k supermarket") || store.includes("k-supermarket")) &&
    (source === "etarjouslehdet" || provider === "kruoka");

  if (!isKSupermarketTjek) return "";

  const kTrustedCategories = new Map<string, string>([
    ["kahvi", "Kahvi"],
    ["kahvi tee", "Kahvi & tee"],
    ["maitotuotteet", "Maitotuotteet"],
    ["liha", "Liha & makkarat"],
    ["liha makkarat", "Liha & makkarat"],
    ["kala", "Kala"],
    ["leipomo", "Leipomo"],
    ["hevi", "Hevi"],
    ["juomat", "Juomat"],
    ["pakasteet", "Pakasteet"],
    ["valmisruoka", "Valmisruoka"],
    ["kuivatuotteet", "Kuivatuotteet"],
    ["makeiset keksit", "Makeiset & keksit"],
    ["makeiset ja keksit", "Makeiset & keksit"],
    ["makeisetkeksit", "Makeiset & keksit"],
    ["lemmikit", "Lemmikit"],
    ["hygienia kosmetiikka", "Hygienia & kosmetiikka"],
    ["kodinhoito", "Kodinhoito"],
    ["koti", "Koti & vapaa-aika"],
    ["koti vapaa aika", "Koti & vapaa-aika"],
    ["muut", "Muut"],
  ]);

  return kTrustedCategories.get(normalized) || "";
}
