// Chain-independent classification of product FORM, not ingredients or landing URLs.
// Ordered rules prevent e.g. cheese cake, meatballs and oat bread being classified
// from the incidental words cheese, milk or oat.
export function classifySharedProductCategory(value: unknown): string | null {
  const s = String(value ?? "").normalize("NFKC").toLocaleLowerCase("fi-FI").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!s) return null;
  // Product audience and non-food purpose outrank incidental food words.
  if (/(?:^|\s)(?:koiran|kissan|lemmikin|koirille|kissoille|lemmikeille)(?=\s|$)/u.test(s)) {
    if (/(?:^|\s)\p{L}*(?:asu|puku|lelu|talutin|panta|peti|ruoka|herkku|öljy|ravinne|vitamiini)(?=\s|$)/u.test(s) ||
        /(?:koiran|kissan|lemmikin)(?:ruoka|herkku|lelu|asu|puku|panta|peti)/u.test(s)) return "Lemmikit";
  }
  if (/(?:^|\s)(?:halloween|naamiais|koiran|kissan)(?:\s|\p{L})*(?:asu|puku)(?=\s|$)/u.test(s)) return "Koti & vapaa-aika";
  // Frozen product form takes precedence over pizza, vegetables or meat.
  // This is a product-form rule, not a Lidl-specific exception.
  if (/(?:^|\\s)(?:pakaste|pakastettu|pakastetut)\\p{L}*(?=\\s|$)/u.test(s) ||
      /(?:^|\\s)pakaste\\p{L}*(?:pizza|vihannes|marja|peruna|pulla)(?=\\s|$)/u.test(s)) return "Pakasteet";
  // Compound words: the final product form outranks an ingredient prefix.
  // These rules apply identically to every chain.
  if (/(?:^|\s)\p{L}*(?:maitojuoma|kaakaojuoma|suklaajuoma)\p{L}*(?=\s|$)/u.test(s)) return "Juomat";
  if (/(?:^|\s)\p{L}*(?:suklaa|konvehti|karkki|makeinen)\p{L}*(?=\s|$)/u.test(s)) return "Makeiset & keksit";
  if (/(?:^|\s)\p{L}*(?:pizza|perunalaatikko|makaronilaatikko|maksalaatikko|porkkanalaatikko|lanttulaatikko|lasagne|keitto)\p{L}*(?=\s|$)/u.test(s)) return "Valmisruoka";
  const rules: Array<[RegExp, string]> = [
    [/(?:^|\s)(?:kirja|kirjat|paistinpannu|kattila|säilytyslaatikko|muovilaatikko|työkalulaatikko|lelu|vaate|takki|housut|kenkä|valaisin|lamppu|työkalu|kalenteri|grilli|muki|lakana|pyyhe|sisustustyyny)\p{L}*(?=\s|$)/u, "Koti & vapaa-aika"],
    [/(?:^|\s)(?:koiranruoka|kissanruoka|koiranherkku|kissanherkku|lemmikinruoka)\p{L}*(?=\s|$)/u, "Lemmikit"],
    [/(?:^|\s)(?:wc paperi|talouspaperi|astianpesu|pyykinpesu|pesuaine|siivousliina|puhdistusaine)\p{L}*(?=\s|$)/u, "Kodinhoito"],
    [/(?:^|\s)(?:shampoo|saippua|hammastahna|hammasharja|deodorantti|kasvovoide|kosteusvoide|suihkugeeli|vaippa)\p{L}*(?=\s|$)/u, "Hygienia & kosmetiikka"],
    [/(?:^|\s)\p{L}*(?:juustokakku|täytekakku|kakku|leivos|rahkapulla|pulla|croissant|munkki|piirakka|sämpylä|leipä|patonki|rieska|näkkileipä|karjalanpiirakka)\p{L}*(?=\s|$)/u, "Leipomo"],
    [/(?:^|\s)(?:lihapull|lihapyöry|lihapyor|jauheliha|makkara|nakki|pekoni|kinkku|broileri|kanasuikale|porsaan|naudan)\p{L}*(?=\s|$)/u, "Liha & makkarat"],
    [/(?:^|\s)(?:lohi|kirjolohi|tonnikala|silakka|seiti|katkarapu|kalafile|kalapuikko)\p{L}*(?=\s|$)/u, "Kala"],
    [/(?:^|\s)(?:pizza|lasagne|valmisateria|valmisruoka|keitto|salaattiateria|risotto|lihapata|wokki)\p{L}*(?=\s|$)/u, "Valmisruoka"],
    [/(?:^|\s)(?:jäätelö|pakaste|pakastettu|pakastevihannes|pakastemarj)\p{L}*(?=\s|$)/u, "Pakasteet"],
    [/(?:^|\s)(?:suklaa|karkki|makeinen|keksi|lakritsi|salmiakki|konvehti|piparkakku)\p{L}*(?=\s|$)/u, "Makeiset & keksit"],
    [/(?:^|\s)(?:mehu|smoothie|limonadi|virvoitusjuoma|energiajuoma|kivennäisvesi|nektari)\p{L}*(?=\s|$)/u, "Juomat"],
    [/(?:^|\s)(?:kahvi|espresso|teepussi|teejuoma)\p{L}*(?=\s|$)/u, "Kahvi & tee"],
    [/(?:^|\s)(?:jogurtti|rahka|maito|juusto|kerma|piimä|viili|raejuusto|voi|margariini)\p{L}*(?=\s|$)/u, "Maitotuotteet"],
    [/(?:^|\s)(?:pasta|spagetti|riisi|jauho|kaurahiutale|mysli|muro|säilyke|mauste|ketsuppi|öljy|kastike|nuudeli)\p{L}*(?=\s|$)/u, "Kuivatuotteet"],
    [/(?:^|\s)(?:omena|banaani|tomaatti|kurkku|paprika|peruna|sipuli|porkkana|parsakaali|salaatti|mandariini)\p{L}*(?=\s|$)/u, "Hevi"],
  ];
  for (const [pattern, category] of rules) if (pattern.test(s)) return category;
  return null;
}

export function isEverydayOfferCategory(category: string): boolean {
  return category !== "Muut" && category !== "Koti & vapaa-aika" && category !== "Lemmikit";
}
