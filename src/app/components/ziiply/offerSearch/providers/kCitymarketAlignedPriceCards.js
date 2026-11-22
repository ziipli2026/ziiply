// The publisher can combine the euro glyphs of several aligned cards into
// one wide word box. Each card still has its own cents and sale-unit box.
const saleUnit = /^(KG|KPL|PKT|PS|RS|PRK|PL|TLK)$/;
const headingWord = /[A-ZÅÄÖ]{3}/;
const digit = /^\d$/;
const right = box => box.left + box.width;
const boxKey = box => [box.text, box.left, box.top, box.width, box.height].join(':');

export function recoverAlignedPriceCards(rows, wordBoxes, page) {
  const boxes = [...new Map(wordBoxes.map(box => [boxKey(box), box])).values()];
  const cents = boxes.filter(box => /^\d{2}$/.test(box.text) && box.height >= .04 && box.height < .09 && box.width >= .04);
  const euroGroups = boxes.filter(box => /^\d{2,6}$/.test(box.text) && box.height >= .09 && box.width > .23);
  const splitBadges = cents.flatMap(cent => {
    const euros = boxes.filter(box => /^\d{1,2}$/.test(box.text) && box.height >= .09 &&
      box.width < .16 && Math.abs(right(box) - cent.left) < .009 &&
      Math.abs(cent.top - box.top - .017) < .004);
    return euros.length === 1 ? [{cent, euro: euros[0]}] : [];
  });
  const standaloneBands = splitBadges
    .map(({cent}) => splitBadges.filter(badge => Math.abs(cent.top - badge.cent.top) < .004)
      .sort((a, b) => a.cent.left - b.cent.left))
    .filter((band, index) => band.length >= 2 && band[0] === splitBadges[index]);
  const groups = euroGroups.map(euros => ({euros})).concat(
    standaloneBands.map(badges => ({euros: badges[0].euro, badges})));
  let result = rows;
  for (const {euros, badges} of groups) {
    const band = badges?.map(badge => badge.cent) ?? cents.filter(box => Math.abs(box.top - euros.top - .017) < .004)
      .sort((a, b) => a.left - b.left);
    const shared = band.filter(box => box.left >= euros.left && box.left <= right(euros) + .01);
    if (!badges && shared.length !== euros.text.length) continue;

    const cards = band.map((cent, index) => {
      const sharedIndex = badges ? -1 : shared.indexOf(cent);
      const left = index ? right(band[index - 1]) + .005 : Math.max(0, euros.left - .35);
      const units = boxes.filter(box => saleUnit.test(box.text) &&
        box.left >= cent.left && box.left <= right(cent) + .028 &&
        Math.abs(box.top - (cent.top + cent.height)) < .009);
      if (units.length !== 1) return null;
      const unit = units[0];
      const validityLabel = boxes.find(box => /^Voimassa$/i.test(box.text) &&
        box.left >= left && box.left < cent.left && box.top > unit.top && box.top - unit.top < .04);
      const dateTokens = validityLabel ? boxes.filter(box => box.left > validityLabel.left && box.left < validityLabel.left + .16 &&
        Math.abs(box.top - validityLabel.top) < .001 && /^[-–]?\d{2}$/.test(box.text)) : [];
      const rangeEnd = dateTokens.find(box => /^[-–]/.test(box.text));
      const day = rangeEnd && dateTokens.find(box => box.left < rangeEnd.left && rangeEnd.left - right(box) < .012);
      const month = rangeEnd && dateTokens.find(box => box.left > right(rangeEnd) && box.left - right(rangeEnd) < .012 &&
        Number(box.text) >= 1 && Number(box.text) <= 12);
      const printedValidity = day && month ? {
        from: day.text + '.' + month.text + '.', to: rangeEnd.text.slice(1) + '.' + month.text + '.',
      } : null;
      const standalone = boxes.filter(box => box.height >= .09 && Math.abs(box.top - euros.top) < .003 &&
        box.left >= left && box.left < cent.left &&
        (digit.test(box.text) || box.text === box.text[0] + cent.text));
      if (!badges && sharedIndex < 0 && standalone.length !== 1) return null;
      const whole = badges ? badges[index].euro.text :
        sharedIndex >= 0 ? euros.text[sharedIndex] : standalone[0].text[0];

      const headingTop = badges ? euros.top - .043 : euros.top - .018;
      const headings = boxes.filter(box => box.left >= left && box.left < right(cent) &&
        box.top >= headingTop && box.top <= unit.top &&
        box.height >= .013 && box.height <= .024 && headingWord.test(box.text) && !saleUnit.test(box.text));
      const first = headings.sort((a, b) => a.left - b.left || a.top - b.top)[0];
      if (!first) return null;
      const starts = headings.filter(box => Math.abs(box.left - first.left) < .004);
      const top = Math.min(...starts.map(box => box.top));
      const bottom = Math.max(...starts.map(box => box.top));
      const text = boxes.filter(box => box.left >= first.left - .001 && right(box) <= right(cent) + .008 &&
        box.top >= top - .011 && box.top <= Math.min(unit.top + .017, bottom + .028) &&
        box.height >= .009 && box.height <= .024 && !saleUnit.test(box.text) &&
        (/^[\p{L}\p{N}][\p{L}\p{N}.,%&–/-]*$/u.test(box.text)) &&
        !boxes.some(other => other !== box && Math.abs(other.top - box.top) < .001 &&
          other.left <= box.left + .001 && right(other) >= right(box) && other.width > box.width + .002));
      const lines = [...new Set(text.map(box => box.top))].sort((a, b) => a - b);
      const title = lines.filter(y => !badges || y<=bottom+.002 ||
        text.some(box=>box.top===y&&/^[\p{L}]{3,}$/u.test(box.text)))
        .map(y => text.filter(box => box.top === y).sort((a, b) => a.left - b.left)
        .map(box => box.text).join(' ')).join(' ');
      if (!title || !headingWord.test(title)) return null;
      const quantities = boxes.filter(box => /^[2-9]$/.test(box.text) && box.height >= .019 && box.height < .04 &&
        Math.abs(box.left - unit.left) < .015 && unit.top - box.top > .008 && unit.top - box.top < .031);
      if (quantities.length > 1) return null;
      return {
        page,
        title,
        headingWords: headings.flatMap(box => box.text.toUpperCase().match(/[A-ZÅÄÖ]{4,}/g) || []),
        imageAnchor: first,
        ...(printedValidity ? {printedValidity} : {}),
        spatialResolved: {
          value: Number(whole + '.' + cent.text),
          quantity: quantities.length ? Number(quantities[0].text) : null,
          unit: unit.text,
          source: 'publisher-aligned-price-cards',
          sanity: 'pass',
          confidence: 'high',
        },
      };
    });
    if (cards.length < 2 || cards.some(card => !card)) continue;
    // A word appearing in multiple headings cannot prove a cross-card merge.
    const uniqueWords = cards.map(card => card.headingWords.filter(word =>
      cards.every(other => other === card || !other.headingWords.includes(word))));
    const ownership = result.map(row => {
      const anchor = row.debugCardAnchor ?? row.imageAnchor;
      if (badges && (!anchor || anchor.left > right(band.at(-1)) + .04 ||
          Math.abs(anchor.top - euros.top) > .09)) return [];
      const tokens = new Set(row.title.toUpperCase().match(/[A-ZÅÄÖ]{4,}/g) || []);
      return row.page === page ? cards.filter((_, index) => uniqueWords[index].some(word => tokens.has(word))) : [];
    });
    if (!ownership.some(owners => owners.length > 1)) continue;
    result = [...result.filter((_, index) => !ownership[index].length),
      ...cards.map(({headingWords, ...card}) => card)];
  }
  return result;
}
