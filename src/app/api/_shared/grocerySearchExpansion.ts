export const MEAT_SEARCH_ALIASES: Record<string, string[]> = {
  kana: ['broileri', 'kanan filee'],
  naudanliha: ['naudan', 'nauta'],
  sianliha: ['porsaan', 'porsas'],
  limsa: ['limonadi', 'virvoitusjuoma'],
  vesi: ['kivennäisvesi', 'lähdevesi', 'mineraalivesi'],
  omena: ['gala', 'pink lady', 'omena irto'],
  appelsiini: ['navel', 'appelsiini irto'],
  päärynä: ['conference', 'päärynä irto'],
  viinirypäle: ['rypäle', 'siemenetön'],
  paprika: ['punainen paprika', 'paprika vihreä'],
  mansikka: ['mansikka 250g', 'mansikka 500g'],
  roskapussi: ['jätepussi', 'roskapussit', 'roskapussi 30l'],
  'roskapussi 30l': ['roskapussi', 'jätepussi', 'jätepussi 30l'],
  roskapussit: ['roskapussi', 'jätepussi'],
};

/** Bounded retrieval synonyms for specific shopping-list queries.
 * These expand candidates only: callers must still validate category and package size.
 */
export const BASKET_SEARCH_ALIASES: Record<string, string[]> = {
  "päärynä 1kg": ["päärynä", "conference"],
  "kananmuna 10kpl": ["kananmuna", "kananmunat"],
  "banaani 1kg": ["banaani"],
  "omena 1kg": ["omena"],
  "appelsiini 1kg": ["appelsiini", "navel", "appelsiini irto"],
  "tomaatti 500g": ["tomaatti", "tomaatti irto"],
  "paprika 500g": ["paprika", "punainen paprika", "paprika vihreä"],
  "ruokakerma 2dl": ["ruokakerma"],
  "juusto 1kg": ["juusto"],
  "parsakaali 400g": ["parsakaali"],
  "sämpylä 6kpl": ["sämpylä"],
  "laktoositon maito 1l": ["laktoositon maito"],
  "kidneypavut 380g": ["kidneypavut", "kidneypapu"],
  "kikherneet 380g": ["kikherne", "kikherneet"],
  "kurkkusalaatti 400g": ["kurkkusalaatti"],
  "perunalastut 200g": ["perunalastut", "sipsit", "perunalastu"],
  "pakasteherneet 200g": ["pakasteherneet", "herne pakaste"],
  "ranskalaiset perunat 500g": ["ranskanperunat", "ranskalaiset pakaste"],
  "porsaan ulkofile 500g": ["porsaan ulkofile"],
};
