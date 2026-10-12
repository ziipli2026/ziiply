// Product-form precedence for national leaflets and store publications.
// Unknown names deliberately remain inconclusive.
export function extendedCitymarketCategory(text: string): string | undefined {
  const s = text.toLocaleLowerCase('fi-FI').normalize('NFKC').replace(/\s+/g, ' ');
  if (/leipäjuusto|proteiinivaa(?:ht|hd)|proteiinimousse|pirtelö|pirtelo/.test(s)) return 'Maitotuotteet';
  if (/magnum.*bonbon|bonbons?.*(?:\/l\)|jäätel)|ben\s*&\s*jerry.*peaces/.test(s)) return 'Pakasteet';
  if (/gold\s*&\s*green|suosikkisalaat|kebab/.test(s)) return 'Valmisruoka';
  if (/roll[- ]?on|päivävoi|mascara|inkosuoja|pikkuhousunsuoja|(?:^|\s)siteet(?:\s|$)|housuvaip|teippivaip|vanulap|vanupuik|vaseline|duopack\s+puhdistuspyyh/.test(s)) return 'Hygienia & kosmetiikka';
  if (/pyykkietik|wc[- ]?geeli|huuhteluaine|tahranpoista/.test(s)) return 'Kodinhoito';
  if (/pentualust/.test(s)) return 'Lemmikit';
  // Appliances, apparel, toys and stationery precede incidental food words.
  if (/aterinset|lautapeli|palikkarasia|taskulampp|ristikkolehti|kynttil|spraymoppi|valonauha|peittoset|(?:^|\s)tyyny(?:\s|$)|toppahaalari|softshell.*haalari|bokseri|legging|lenkkari|merinovilla|fleecekerrasto|lämpötyyny|väriruletti|puuvärikyn|sähkömoppi|silitysrauta|tuulilasinpesunest|kampanjapokkar|unicorn|kiihdytysauto|sähkösavustin|savustushake|(?:^|\s)neule(?:\s|$)|t-pait|tekstiilipesur|farkkuj|trikoopai|vaatteit|oneblade|varsi-imuri|valomaski|hiustenkuiv|leikkisetti|sammutuspeite|pilateslauta|kilokartonki|huopakyn|lattiakaivosuodat|säilytyslaatik|led-lampp|luku- ja käsityövalo|askartelu- ja korjausvalo/.test(s)) return 'Koti & vapaa-aika';
  if (/kanan\s+rintafile|kanatuotte|kananpoj|(?:^|\s)nakit(?:\s|$)|maalaisnak|meetvursti|savusaunapalvi|poron\s+paisti/.test(s)) return 'Liha & makkarat';
  if (/korvapuusti|kuorrutemunk/.test(s)) return 'Leipomo';
  if (/fasupala|(?:^|\s)aakkoset(?:\s|$)/.test(s)) return 'Makeiset & keksit';
  if (/vihreät\s+teet|(?:^|\s)teet(?:\s|$)/.test(s)) return 'Kahvi & tee';
  if (/kastikke|salsat|cashewpähkin|chili.*pähkin/.test(s)) return 'Kuivatuotteet';
  return undefined;
}

export function categoryFromOwnedContext(
  title: string,
  context: string[],
  owned: boolean,
  classify: (text: string) => string,
): string {
  const direct = classify(title);
  if (direct !== 'Muut' || !owned) return direct;
  // The spatial parser's imageAnchor identifies a resolved card; nearby lines
  // have been assigned exclusively to that card by resolveCards. Flat HTML
  // neighbourhoods must never be used as category evidence.
  const categories = new Set(context.map(classify).filter(value => value !== 'Muut'));
  return categories.size === 1 ? [...categories][0] : 'Muut';
}
