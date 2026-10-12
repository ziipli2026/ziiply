// Recover only headings verified in the immutable 42AV publisher positions.
// Prices stay under the existing transaction parser.
export function recover42AVPrintedCampaignRows(rows, rawBoxes) {
 const boxes=[...new Map(rawBoxes.map(b=>[`${b.text}:${b.left}:${b.top}:${b.height}`,b])).values()];
 const specs=[
  {word:'Whole',match:/^DEODORANTIT 75–150 ml$/,required:['Body','DEODORANTIT','75–150'],title:'Whole Body DEODORANTIT 75–150 ml'},
  {word:'SoftEmbo', match:/^KG WC-PAPERI 40 rl$/, required:['WC-PAPERI','40','TALOUSPAPERI','20'],title:'SoftEmbo WC-PAPERI 40 rl ja Lotus Emilia TALOUSPAPERI 20 rl'},
  {word:'Lempi', match:/^WC-PAPERI 6 rl YHTEI-/,required:['WC-PAPERI','6','TALOUSPAPERI','3'],title:'Lempi WC-PAPERI 6 rl ja TALOUSPAPERI 3 rl'},
  {word:'DOVE',match:/^SAIPPUAT ja NESTE- SAIPPUAT/,required:['SUIHKU-','SAIPPUAT','NESTE-','225–450'],title:'DOVE SUIHKUSAIPPUAT ja NESTESAIPPUAT 225–450 ml'},
  {word:'ARGAN',match:/^PIRKKA ARGAN IHONHOITO- TUOTTEET$/,required:['PIRKKA','IHONHOITO-','TUOTTEET'],title:'PIRKKA ARGAN IHONHOITOTUOTTEET'},
  {word:'DOMESTOS',match:/^(?:PYYKINPESUNESTEET|NESTEET) 500 ml/,required:['WC-PUHDISTUS-','AINEET','WC-GEELIT','750','CIF','HANKAUS-','NESTEET','500'],title:'DOMESTOS WC-PUHDISTUSAINEET ja WC-GEELIT 750 ml sekä CIF HANKAUSNESTEET 500 ml'}
 ];
 return rows.map(row=>{
  let result=row, anchor=row.debugAnchor;
  for(const spec of specs){
   if(!spec.match.test(row.title))continue;
   const headings=boxes.filter(b=>b.text===spec.word);
   if(headings.length!==1)continue;
   const heading=headings[0];
   const local=boxes.filter(b=>b.left>=heading.left-.06&&b.left<=heading.left+.30&&b.top>=heading.top-.002&&b.top<=heading.top+.07);
   if(!spec.required.every(word=>local.some(b=>b.text===word)))continue;
   result={...row,title:spec.title,debugRecoveredPublisherHeading:spec.title};
   anchor={left:Math.min(heading.left,...local.filter(b=>spec.required.includes(b.text)).map(b=>b.left)),top:heading.top};
   break;
  }
  if(result===row||!result.percentageOffer||!anchor)return result;
  // Complete percentage glyphs in the same publisher column are stronger
  // evidence than a preceding basic-HTML percentage from another card.
  const left=Math.floor(anchor.left*3)/3,right=left+1/3;
  const badges=boxes.filter(b=>/^-\d{1,2}%$/.test(b.text)&&b.height>=.02&&b.left>=left&&b.left+b.width<=right+.025&&Math.abs(b.top-anchor.top)<.08);
  const percentages=[...new Set(badges.map(b=>Number(b.text.match(/\d+/)[0])))];
  if(percentages.length!==1)return result;
  return {...result,percentageOffer:{percent:percentages[0],source:'same-column-complete-publisher-percentage',confidence:'high'}};
 });
}
