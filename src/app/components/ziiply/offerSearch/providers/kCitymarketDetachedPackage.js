// A flattened reading order may move the package far from its headline.
// Reattach only a unique package printed immediately below the same column.
export function reattachDetachedPackage(lines, boxes) {
  return lines.map(line => {
    const title = line.text.replace(/^[-–]\d+(?:[–-]\d+)?\s*%\s*/, '').trim();
    if (!/^[A-ZÅÄÖ][A-ZÅÄÖ &+-]{5,}$/.test(title)) return line;
    const anchors = boxes.filter(box => box.text === title && box.height >= .014 && box.height < .02);
    if (anchors.length !== 1) return line;
    const anchor = anchors[0];
    const numbers = boxes.filter(box => /^\d+(?:[,.]\d+)?$/.test(box.text) &&
      Math.abs(box.left - anchor.left) < .002 &&
      box.top - anchor.top > .008 && box.top - anchor.top < .016 &&
      Math.abs(box.height - anchor.height) < .001);
    const candidates = numbers.filter(number => boxes.some(rate => /\/(kg|l)\)/.test(rate.text) &&
      rate.left >= anchor.left && rate.left < anchor.left + .10 &&
      rate.top - number.top > .008 && rate.top - number.top < .025))
      .flatMap(number => boxes.filter(unit => /^(g|kg|ml|cl|dl|l)$/.test(unit.text) &&
      Math.abs(unit.top - number.top) < .001 &&
      unit.left - number.left - number.width >= 0 && unit.left - number.left - number.width < .006)
      .map(unit => `${title} ${number.text} ${unit.text}`));
    return candidates.length === 1 ? {...line, text: candidates[0], detachedPackage: true} : line;
  });
}

export function resolveRecoveredPrintedPrice(row, boxes) {
  const anchor = row.debugCardAnchor;
  if (!anchor) return row;
  const proofs = [];
  for (const euro of boxes.filter(box => /^\d{1,2}$/.test(box.text) && box.height >= .045 && box.height < .06 &&
    box.left > anchor.left + .10 && box.left < anchor.left + .26 && Math.abs(box.top - anchor.top) < .025)) {
    const units = boxes.filter(box => /^(PS|PRK|PKT|RS|KPL|TLK|PL)$/.test(box.text) &&
      box.left >= euro.left && box.left < euro.left + .045 &&
      box.top - euro.top > .01 && box.top - euro.top < .035 && box.height < .016);
    if (units.length !== 1) continue;
    // Reject any printed purchase count paired with this label.
    if (boxes.some(box => /^\d+$/.test(box.text) && box.height >= .014 && box.height < .02 &&
      Math.abs(box.top - units[0].top) < .002 && box.left < units[0].left && units[0].left - box.left < .025)) continue;
    const cents = boxes.filter(box => /^\d{2}$/.test(box.text) && box.height >= .02 && box.height < .03 &&
      Math.abs(box.left - euro.left - euro.width) < .006 && box.top - euro.top >= 0 && box.top - euro.top < .012);
    const distinct = [...new Set(cents.map(box => box.text))];
    if (distinct.length > 1) continue;
    proofs.push({value: Number(euro.text) + (distinct.length ? Number(distinct[0]) / 100 : 0),
      quantity: null, unit: units[0].text, source: 'recovered-headline-owned-printed-price', sanity: 'pass', confidence: 'high'});
  }
  if (proofs.length !== 1) return row;
  return {...row, spatialResolved: proofs[0], debugRecoveredPrintedPrice: proofs[0], debugReplacedConflictingPrice: row.spatialResolved};
}
