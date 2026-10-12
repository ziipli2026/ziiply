// Recover a missing purchase unit only beside the already resolved printed price.
// Neither the price nor the purchase count is inferred or changed here.
export function printedOfferUnit(row) {
  const resolved = row?.spatialResolved;
  if (resolved?.unit) return resolved.unit;
  const anchor = row?.debugCardAnchor;
  if (!resolved || !anchor) return null;
  const boxes = row.debugNearbyBoxes || [];
  const value = Number(resolved.value);
  const cents = Math.round(value * 100) % 100;
  const candidates = [];
  for (const euro of boxes) {
    if (!/^\d{1,2}$/.test(euro.text) || euro.height < .045 ||
        Number(euro.text) !== Math.floor(value) ||
        euro.left < anchor.left - .015 || euro.left > anchor.left + .26 ||
        Math.abs(euro.top - anchor.top) > .055) continue;
    if (cents && !boxes.some(box => box.text === String(cents).padStart(2, '0') &&
        box.height >= .02 && box.height < .035 &&
        Math.abs(box.left - (euro.left + euro.width)) < .006 &&
        box.top >= euro.top && box.top - euro.top < .012)) continue;
    for (const unit of boxes) {
      if (!/^(PS|PKT|PRK|RS|KPL|TLK|PL|KG)$/.test(unit.text)) continue;
      if (Number(resolved.quantity) > 1) {
        const count = boxes.find(box => box.text === String(resolved.quantity) &&
          box.height >= .01 && box.height < .025 &&
          Math.abs(box.top - unit.top) < .002 &&
          unit.left >= box.left + box.width - .001 &&
          unit.left - box.left - box.width < .006 &&
          Math.abs(box.left - euro.left) < .025 &&
          Math.abs(box.top - euro.top) < .018);
        if (!count) continue;
      } else if (unit.top - euro.top < .018 || unit.top - euro.top > .035 ||
          unit.left < euro.left || unit.left - euro.left > .04) continue;
      candidates.push(unit.text);
    }
  }
  const distinct = [...new Set(candidates)];
  return distinct.length === 1 ? distinct[0] : null;
}
