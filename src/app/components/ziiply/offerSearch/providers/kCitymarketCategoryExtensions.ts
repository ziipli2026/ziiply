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
  geometry?: { anchor: { left: number; top: number; width: number }; boxes: {text: string;left: number;top: number;width: number}[] },
): string {
  const direct = classify(title);
  if (direct !== 'Muut' || !owned) return direct;
  // A card's broad context can still contain an adjacent offer. When geometry
  // is available, require text to align with the current title column and to
  // occur in the card context; never classify from the whole nearby box area.
  let evidence = context;
  if (geometry) {
    const {anchor,boxes} = geometry;
    if (![anchor.left,anchor.top,anchor.width].every(Number.isFinite) || anchor.width <= 0) return 'Muut';
    const normalize = (value: string) => value.toLocaleLowerCase('fi-FI').replace(/\s+/g,' ').trim();
    const ownedText = normalize(context.join(' '));
    const rows: {top:number;boxes:typeof boxes}[] = [];
    for (const box of boxes.filter(box =>
      Number.isFinite(box.left) && Number.isFinite(box.top) && Number.isFinite(box.width) &&
      box.left >= anchor.left - 0.015 && box.left + box.width <= anchor.left + anchor.width + 0.025 &&
      box.top >= anchor.top - 0.04 && box.top <= anchor.top + 0.04 &&
      ownedText.includes(normalize(box.text))
    ).sort((a,b)=>a.top-b.top || a.left-b.left)) {
      let row = rows.find(row => Math.abs(row.top-box.top) < 0.0035);
      if (!row) { row={top:box.top,boxes:[]}; rows.push(row); }
      row.boxes.push(box);
    }
    evidence = rows.map(row=>row.boxes.sort((a,b)=>a.left-b.left).map(box=>box.text).join(' '));
  }
  // Finnish inessive ingredient descriptions (e.g. auringonkukkaöljyssä)
  // describe what the product is packed in, not a second product department.
  const categoryEvidence = evidence.map(line => line.replace(/\p{L}+ss[äa](?=$|[\s,.;:()])/giu,' '));
  const categories = new Set(categoryEvidence.map(classify).filter(value => value !== 'Muut'));
  return categories.size === 1 ? [...categories][0] : 'Muut';
}
