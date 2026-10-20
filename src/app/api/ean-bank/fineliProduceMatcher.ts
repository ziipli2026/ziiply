// Deliberately narrow, deterministic Fineli matching for raw whole produce.
// This is a generic nutritional estimate, never a manufacturer label claim.
const canonical: Record<string,string> = {
  porkkana:"PORKKANA", sipuli:"SIPULI", valkosipuli:"VALKOSIPULI",
  kurkku:"KURKKU", tomaatti:"TOMAATTI", peruna:"PERUNA",
  banaani:"BANAANI", omena:"OMENA", appelsiini:"APPELSIINI",
  sitruuna:"SITRUUNA", lime:"LIME", päärynä:"PÄÄRYNÄ",
};
const approvedBrands = new Set(["","pirkka","kotimaista","coop","xtra","rainbow"]);
const qualifiers = new Set([
  "suomalainen","suomalaiset","kotimainen","kotimaiset","ulkomainen",
  "tuore","tuoreet","luomu","1lk","1","lk","irto","nippu","pussi",
  "kesäporkkana","porkkananippu",
]);
const forbidden = /(?:mehu|sose|keitto|kakku|piirakka|pihvi|salaatti|sekoitus|pakaste|kuivatt|keitetty|paistettu|grilli|marinoit|viipale|kuutio|raaste|öljy|jauhe|säilyke|herkku|patukka|lastenruoka|pesto|hillo|marmeladi|juoma|kastike)/i;

export function fineliRawProduceName(name: string, brand: string | null): string | null {
  if (!approvedBrands.has((brand ?? "").trim().toLocaleLowerCase("fi-FI"))) return null;
  const lower=name.trim().toLocaleLowerCase("fi-FI");
  if (!lower || forbidden.test(lower)) return null;
  const normalized=lower.replace(/\b\d+(?:[,.]\d+)?\s*(?:kg|g|kpl|pkt|pss)\b/g," ")
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const words=normalized.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const brandWords=(brand??"").trim().toLocaleLowerCase("fi-FI").split(/\s+/).filter(Boolean);
  const filtered=words.filter(w=>!brandWords.includes(w)&&!qualifiers.has(w));
  if (filtered.length!==1) return null;
  const key=filtered[0]==="kesäporkkana"||filtered[0]==="porkkananippu"?"porkkana":filtered[0];
  return canonical[key]??null;
}
