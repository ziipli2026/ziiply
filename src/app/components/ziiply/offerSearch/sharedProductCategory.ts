// Chain-independent classification of product FORM, not ingredients or landing URLs.
// Ordered rules prevent e.g. cheese cake, meatballs and oat bread being classified
// from the incidental words cheese, milk or oat.
export function classifySharedProductCategory(value: unknown): string | null {
  const s = String(value ?? "").normalize("NFKC").toLocaleLowerCase("fi-FI").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!s) return null;
  // Product audience and non-food purpose outrank incidental food words.
  if (/(?:^|\s)(?:airfryer|höyrysilitysrauta|silitysrauta|neulemekko|nilkkurit|jeggingsit|pesukoneen|päällyshylly|mohairsekoiteneule)(?=\s|$)/u.test(s)) return "Koti & vapaa-aika";
  if (/(?:^|\s)(?:koiran|kissan|lemmikin|koirille|kissoille|lemmikeille)(?=\s|$)/u.test(s)) {
    if (/(?:^|\s)\p{L}*(?:asu|puku|lelu|talutin|panta|peti|ruoka|herkku|öljy|ravinne|vitamiini)(?=\s|$)/u.test(s) ||
        /(?:koiran|kissan|lemmikin)(?:ruoka|herkku|lelu|asu|puku|panta|peti)/u.test(s)) return "Lemmikit";
  }
  if (/(?:^|\s)(?:halloween|naamiais|koiran|kissan)(?:\s|\p{L})*(?:asu|puku)(?=\s|$)/u.test(s)) return "Koti & vapaa-aika";
  // Frozen product form takes precedence over pizza, vegetables or meat.
  // This is a product-form rule, not a Lidl-specific exception.
  if (/(?:^|\s)(?:pakaste|pakastettu|pakastetut)\p{L}*(?=\s|$)/u.test(s) ||
      /(?:^|\s)pakaste\p{L}*(?:pizza|vihannes|marja|peruna|pulla)(?=\s|$)/u.test(s)) return "Pakasteet";
  // Compound grocery names in Finnish frequently prepend the meat, milk or
  // fruit qualifier. A concrete ending is stronger than the preceding words.
  if (/(?:^|\s)\p{L}*(?:jauheliha|jogurtti|sisäfilee|kananfilee|kaurarypsiöljymargariini)\p{L}*(?=\s|$)/u.test(s)) {
    if (/(?:^|\s)\p{L}*jogurtti\p{L}*(?=\s|$)/u.test(s) || /margariini/u.test(s)) return "Maitotuotteet";
    return "Liha & makkarat";
  }
  // A bakery product containing dairy must stay in the bakery category.
  if (/(?:^|\s)\p{L}*(?:rahkapulla|juustokakku|rahkapiirakka)(?=\s|$)/u.test(s)) return "Leipomo";
  // Product type may be the final component of a Finnish compound or a
  // inflected form; do not require a word boundary before that final type.
  const compoundForms: Array<[RegExp, string]> = [
    [/(?:^|\s)\p{L}*(?:jauheliha|fileesuikale|sisäfilee|koipipala|kylkipala|hunajasiipi|liekkisiipi|wienerleike|kinkku|salami|prosciutto|bresaola|carpaccio)\p{L}*(?=\s|$)/u, "Liha & makkarat"],
    [/(?:^|\s)\p{L}*(?:jogurtti|margariini|tuorejuusto|kerma|rahka)\p{L}*(?=\s|$)/u, "Maitotuotteet"],
    [/(?:^|\s)\p{L}*(?:jäätelö|pakastetaikina)\p{L}*(?=\s|$)/u, "Pakasteet"],
    [/(?:^|\s)\p{L}*(?:joulukeksi|pistaasikeksi|florentiini|vaahtotikkari|joulumakeinen)\p{L}*(?=\s|$)/u, "Makeiset & keksit"],
    [/(?:^|\s)\p{L}*(?:torttutaikina|piparitaikina|tähtitorttu|panini|ahvenkukko)\p{L}*(?=\s|$)/u, "Leipomo"],
    [/(?:^|\s)\p{L}*(?:lähdevesi|kivennäisvesi|mehujuoma)\p{L}*(?=\s|$)/u, "Juomat"],
    [/(?:^|\s)\p{L}*(?:avokado|granaattiomena|uuniperuna)\p{L}*(?=\s|$)/u, "Hevi"],
  ];
  for (const [pattern, category] of compoundForms) if (pattern.test(s)) return category;
  // Recognition by the main product type also handles adjective and brand
  // prefixes in the actual weekly offer feed; never use an ingredient alone.
  if (/(?:^|\s)(?:mineraali|vitamiini|omega[-\s]?\d+|vitanallet|ravintolisä)\p{L}*(?=\s|$)/u.test(s)) return "Vitamiinit & ravinteet";
  if (/(?:^|\s)(?:avokado|granaattiomena)\p{L}*(?=\s|$)/u.test(s)) return "Hevi";
  if (/(?:^|\s)(?:carpaccio|bresaola|prosciutto|salami|fileesuikale|hunajasiivet|koipipala|liekkisiivet|wienerleike|kylkipala|uunikana)\p{L}*(?=\s|$)/u.test(s)) return "Liha & makkarat";
  if (/(?:^|\s)(?:moussejälkiruoka|florentiini|vaahtotikkari|joulumakeiset)\p{L}*(?=\s|$)/u.test(s)) return "Makeiset & keksit";
  if (/(?:^|\s)(?:panini|torttutaikina|piparitaikina|tähtitorttu|uuniperuna|ahvenkukko)\p{L}*(?=\s|$)/u.test(s)) return "Leipomo";
  if (/(?:^|\s)(?:lähdevesi|vesi)(?=\s|$)/u.test(s)) return "Juomat";
  // Compound words: the final product form outranks an ingredient prefix.
  // These rules apply identically to every chain.
  if (/(?:^|\s)\p{L}*(?:maitojuoma|kaakaojuoma|suklaajuoma)\p{L}*(?=\s|$)/u.test(s)) return "Juomat";
  if (/(?:^|\s)\p{L}*(?:suklaa|konvehti|karkki|makeinen)\p{L}*(?=\s|$)/u.test(s)) return "Makeiset & keksit";
  if (/(?:^|\s)\p{L}*(?:pizza|perunalaatikko|makaronilaatikko|maksalaatikko|porkkanalaatikko|lanttulaatikko|lasagne|keitto)\p{L}*(?=\s|$)/u.test(s)) return "Valmisruoka";
  const rules: Array<[RegExp, string]> = [
    [/(?:^|\s)(?:kirja|kirjat|paistinpannu|kattila|säilytyslaatikko|muovilaatikko|työkalulaatikko|lelu|vaate|takki|housut|kenkä|valaisin|lamppu|työkalu|kalenteri|grilli|muki|lakana|pyyhe|sisustustyyny)\p{L}*(?=\s|$)/u, "Koti & vapaa-aika"],
    [/(?:^|\s)(?:koiranruoka|kissanruoka|koiranherkku|kissanherkku|lemmikinruoka)\p{L}*(?=\s|$)/u, "Lemmikit"],
    [/(?:^|\s)(?:wc paperi|talouspaperi|astianpesu|pyykinpesu|pesuaine|siivousliina|puhdistusaine|konetiskitabletti|siivousetikka|siivoussuopa|pyykinpesuneste)\p{L}*(?=\s|$)/u, "Kodinhoito"],
    [/(?:^|\s)(?:shampoo|saippua|hammastahna|hammasharja|deodorantti|kasvovoide|kosteusvoide|suihkugeeli|vaippa)\p{L}*(?=\s|$)/u, "Hygienia & kosmetiikka"],
    [/(?:^|\s)\p{L}*(?:juustokakku|täytekakku|kakku|leivos|rahkapulla|pulla|croissant|munkki|piirakka|sämpylä|leipä|patonki|rieska|näkkileipä|karjalanpiirakka)\p{L}*(?=\s|$)/u, "Leipomo"],
    [/(?:^|\s)(?:lihapull|lihapyöry|lihapyor|jauheliha|makkara|nakki|pekoni|kinkku|broileri|kanasuikale|porsaan|naudan)\p{L}*(?=\s|$)/u, "Liha & makkarat"],
    [/(?:^|\s)(?:lohi|kirjolohi|tonnikala|silakka|seiti|katkarapu|kalafile|kalapuikko)\p{L}*(?=\s|$)/u, "Kala"],
    [/(?:^|\s)(?:pizza|lasagne|valmisateria|valmisruoka|keitto|salaattiateria|risotto|lihapata|wokki)\p{L}*(?=\s|$)/u, "Valmisruoka"],
    [/(?:^|\s)(?:jäätelö|pakaste|pakastettu|pakastevihannes|pakastemarj)\p{L}*(?=\s|$)/u, "Pakasteet"],
    [/(?:^|\s)(?:suklaa|karkki|makeinen|keksi|lakritsi|salmiakki|konvehti|piparkakku)\p{L}*(?=\s|$)/u, "Makeiset & keksit"],
    [/(?:^|\s)(?:mehu|smoothie|limonadi|virvoitusjuoma|energiajuoma|kivennäisvesi|nektari)\p{L}*(?=\s|$)/u, "Juomat"],
    [/(?:^|\s)(?:kahvi|espresso|teepussi|teejuoma)\p{L}*(?=\s|$)/u, "Kahvi & tee"],
    [/(?:^|\s)(?:jogurtti|rahka|maito|juusto|tuorejuusto|kerma|piimä|viili|raejuusto|voi|margariini|kananmunat)\p{L}*(?=\s|$)/u, "Maitotuotteet"],
    [/(?:^|\s)(?:pasta|spagetti|riisi|jauho|kaurahiutale|mysli|muro|säilyke|mauste|ketsuppi|öljy|kastike|nuudeli)\p{L}*(?=\s|$)/u, "Kuivatuotteet"],
    [/(?:^|\s)(?:omena|banaani|tomaatti|kurkku|paprika|peruna|sipuli|porkkana|parsakaali|salaatti|mandariini|klementiini|luumu|kiivi|appelsiini|minivesimeloni|vesimeloni)\p{L}*(?=\s|$)/u, "Hevi"],
  ];
  for (const [pattern, category] of rules) if (pattern.test(s)) return category;
  return null;
}

export function isEverydayOfferCategory(category: string): boolean {
  return category !== "Muut" && category !== "Koti & vapaa-aika" && category !== "Lemmikit";
}
