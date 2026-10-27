// Resolve product identity before flavour words (butter, fruit, cheese, etc.).
// These are parser defaults; EAN enrichment and UI category resolution are separate.
export function classifyTokmanniOfferCategory(title: string) {
  const s = String(title ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (/wc-paper|talouspaper|nenäliina|astianpes|pyykin|puhdistus|pesuaine|talousliina|sieniliina/.test(s)) return "Kodinhoito";
  if (/shampoo|suihku|saippua|deodor|hammastahna|hammasharja|kosmeti|seerumi|huulivoi|intiimi|kosteuspyyhe|manikyyri|pedikyyri|vaippa/.test(s)) return "Hygienia & kosmetiikka";
  if (/voileipägrilli|leivänpaahdin|kahvinkeitin|vedenkeitin|sähkögrilli|grilli|työkalu|valaisin|lamppu|liimapuulevy|kasteluletku|moppi|pesuri|\bliina\b|käsine|kenkä|takki|housut|vaate|kalenteri|muki|lakana|pyyhe|lanka|asuste|lelu/.test(s)) return "Koti & vapaa-aika";
  if (/koira|kissa|lemmik|pedigree|whiskas|sheba|purina|friskies/.test(s)) return "Lemmikit";
  if (/piltti|lastenateria|lastenruoka|vauvanruoka|hedelmäsose|marjasose|\b\d+\s*kk\b/.test(s)) return "Lastenruoat";
  if (/vitamiini|ravintolisä|magnesium|sinkki|melatoniini|omega.?3|kollageeni|heraproteiini|proteiinipatukka|kreatiini|elektrolyytti/.test(s)) return "Vitamiinit & ravinteet";
  if (/jäätel|ice cream|pakaste|pakastettu|keittojuures|pinaattikeitto/.test(s)) return "Pakasteet";
  if (/(?:suklaa|kaakao)/.test(s) && /(?:maito|kaura|soija|manteli|riisi|kookos|herne)juom/u.test(s)) return "Juomat";
  if (/\b(?:kaura|soija|manteli|riisi|kookos|herne)juom[\p{L}]*/u.test(s)) return "Maitotuotteet";
  // Savoury snacks use the existing public dry-goods group.
  if (/popcorn|perunalastu|sips|chips|pretzel|nacho|suolakeksi|\btuc\b/.test(s)) return "Kuivatuotteet";
  if (/piparkak|piparipallo|pikkuleip|\bpipari\b|vohveli|kookospallo|punssirulla/.test(s)) return "Makeiset & keksit";
  if (/koulunäkki|näkkileip|hapankorppu|korppu|sämpyl|croissant|patonki|karjalanpiirakka|ruisleip|rieska|\bleipä|\bpulla/.test(s)) return "Leipomo";
  if (/snack pot|kuppiateria|spaghett|spagett|mac & cheese|bolognese|ateria-aines|corn flakes|hunaja|vehnäjauho|liemikuutio|liemivalmiste/.test(s)) return "Kuivatuotteet";
  if (/haribo|matador mix|starmix|toffifee|chocolate|konveh|fasupala|tutti frutti|gumi yum|yllätysmuna/.test(s)) return "Makeiset & keksit";
  if (/\bsnack\b/.test(s)) return "Makeiset & keksit";
  if (/popcorn|after eight|(?:fazer.*kuul|kuul.*fazer)|(?:eucalyptus.*fazer|fazer.*eucalyptus)|suklaa|makeis|kark|keksi|suolakeksi|perunalastu|sips|chips|pretzel|lakrit|salmiak|purukum|patuk|tikkari|kismet|tupla\b|da capo|fazerina|geisha|dumle|pantteri|ässä|aarrearkku|remix|suffeli|julia\b|aakkoset|tv mix|daim\b|japp\b|pändy|fisherman|funky fish|super salty|giant strawberries|pätkis|metrilaku/.test(s)) return "Makeiset & keksit";
  if (/leipä|näkkileip|hapankorppu|korppu|sämpyl|pull|croissant|patonki|karjalanpiirakka|ruisleip|rieska/.test(s)) return "Leipomo";
  if (/keittojuures|pinaattikeitto/.test(s)) return "Pakasteet";
  if (/pizza|ateria|keitto|valmisruoka|wrap|caesar|salaattiateria|välipala/.test(s)) return "Valmisruoka";
  if (/lihaliemikuutio|lihaliemivalmiste|kanaliemikuutio|kanaliemivalmiste|liemikuutio|liemivalmiste/.test(s)) return "Kuivatuotteet";
  if (/kana|broiler|nauta|sika|pors|jauheliha|makkara|nakki|pekoni|kinkku|lihavalmiste|liha/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if (/maito|juusto|jogur|rahka|kerma|voi\b|margariin|raejuusto|viili|piim|kefir|vanukas/.test(s)) return "Maitotuotteet";
  if (/kahvi|katriina|espresso|tee\b|kaakao/.test(s)) return "Kahvi & tee";
  if (/smoothie|nektari|mehu|limon|virvoitus|energiajuoma|kivennäisves|vichy|cola|juoma|vesi\b/.test(s)) return "Juomat";
  if (/jäätel|tuut|multipack|pakaste/.test(s)) return "Pakasteet";
  if (/fusilli|penne|rigatoni|tagliatelle|rypsiöljy|rapsiöljy|pasta|spagetti|nuudeli|riisi|jauho|hiutale|muro|mysli|säilyke|kastike|ketsupp|ruokaöljy|oliiviöljy|mauste|liemikuutio|liemivalmiste|tortilla|kuivattu (?:aprikoosi|hedelmä)|aprikoosi.*kuivattu/.test(s)) return "Kuivatuotteet";
  if (/omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna\b|sipuli|porkkana|mango|marja|hedelm|vihann/.test(s)) return "Hevi";
  if (/koira|kissa|lemmik|kissanruoka|koiranruoka/.test(s)) return "Lemmikit";
  if (/wc-paper|talouspaper|nenäliina|astianpes|pyykin|puhdistus|pesuaine|talousliina|sieniliina/.test(s)) return "Kodinhoito";
  if (/shampoo|suihku|saippua|deodor|hammastahna|hammasharja|kosmeti|seerumi|huulivoi|intiimi|kosteuspyyhe|manikyyri|pedikyyri/.test(s)) return "Hygienia & kosmetiikka";
  return "Muut";
}

