// Chain-independent classification of product FORM, not ingredients or landing URLs.
// Ordered rules prevent e.g. cheese cake, meatballs and oat bread being classified
// from the incidental words cheese, milk or oat.
export function classifySharedProductCategory(value: unknown): string | null {
  const s = String(value ?? "").normalize("NFKC").toLocaleLowerCase("fi-FI").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  if (!s) return null;
  const rules: Array<[RegExp, string]> = [
    [/\b(?:kirja|kirjat|paistinpannu|kattila|lelu|vaate|takki|housut|kenkä|valaisin|lamppu|työkalu|kalenteri|grilli|muki|lakana|pyyhe|sisustustyyny)\w*\b/u, "Koti & vapaa-aika"],
    [/\b(?:koiranruoka|kissanruoka|koiranherkku|kissanherkku|lemmikinruoka)\w*\b/u, "Lemmikit"],
    [/\b(?:wc paperi|talouspaperi|astianpesu|pyykinpesu|pesuaine|siivousliina|puhdistusaine)\w*\b/u, "Kodinhoito"],
    [/\b(?:shampoo|saippua|hammastahna|hammasharja|deodorantti|kasvovoide|kosteusvoide|suihkugeeli|vaippa)\w*\b/u, "Hygienia & kosmetiikka"],
    [/\b(?:juustokakku|täytekakku|kakku|leivos|pulla|rahkapulla|croissant|munkki|piirakka|sämpylä|leipä|patonki|rieska|näkkileipä|karjalanpiirakka)\w*\b/u, "Leipomo"],
    [/\b(?:lihapull|lihapöyry|lihapyor|jauheliha|makkara|nakki|pekoni|kinkku|broileri|kanasuikale|porsaan|naudan)\w*\b/u, "Liha & makkarat"],
    [/\b(?:lohi|kirjolohi|tonnikala|silakka|seiti|katkarapu|kalafile|kalapuikko)\w*\b/u, "Kala"],
    [/\b(?:pizza|lasagne|valmisateria|valmisruoka|keitto|salaattiateria|risotto|lihapata|wokki)\w*\b/u, "Valmisruoka"],
    [/\b(?:jäätelö|pakaste|pakastettu|pakastevihannes|pakastemarj)\w*\b/u, "Pakasteet"],
    [/\b(?:suklaa|karkki|makeinen|keksi|lakritsi|salmiakki|konvehti|piparkakku)\w*\b/u, "Makeiset & keksit"],
    [/\b(?:mehu|smoothie|limonadi|virvoitusjuoma|energiajuoma|kivennäisvesi|nektari)\w*\b/u, "Juomat"],
    [/\b(?:kahvi|espresso|teepussi|teejuoma)\w*\b/u, "Kahvi & tee"],
    [/\b(?:jogurtti|rahka|maito|juusto|kerma|piimä|viili|raejuusto|voi|margariini)\w*\b/u, "Maitotuotteet"],
    [/\b(?:pasta|spagetti|riisi|jauho|kaurahiutale|mysli|muro|säilyke|mauste|ketsuppi|öljy|kastike|nuudeli)\w*\b/u, "Kuivatuotteet"],
    [/\b(?:omena|banaani|tomaatti|kurkku|paprika|peruna|sipuli|porkkana|parsakaali|salaatti|mandariini)\w*\b/u, "Hevi"],
  ];
  for (const [pattern, category] of rules) if (pattern.test(s)) return category;
  return null;
}

export function isEverydayOfferCategory(category: string): boolean {
  return category !== "Muut" && category !== "Koti & vapaa-aika" && category !== "Lemmikit";
}
