// Versioned test registry, persisted with rules in Neon. No database call per search.
import type { SearchIntent } from "../ziiplyCore";
export const CATEGORY_REGISTRY_VERSION = "2026-10-12.27";
export const SEARCH_INTENTS: SearchIntent[] = [
  {
    "category": "frozen_savory_pastry",
    "label": "Suolaiset leivonnaispakasteet",
    "variants": [
      "pasteijapakaste"
    ],
    "requiredAny": [
      "pasteija",
      "piirakka"
    ],
    "bannedAny": [],
    "parentCategory": "savory_pastry",
    "parentCategories": [
      "savory_pastry",
      "frozen"
    ]
  },
  {
    "category": "frozen_pastry",
    "label": "Leivonnaispakasteet",
    "variants": [
      "leivonnaispakaste"
    ],
    "requiredAny": [
      "pulla",
      "kakku",
      "viineri",
      "munkki",
      "croissant",
      "churros"
    ],
    "bannedAny": [],
    "parentCategory": "pastry",
    "parentCategories": [
      "pastry",
      "frozen"
    ]
  },
  {
    "category": "frozen_bread",
    "label": "Leipäpakasteet",
    "variants": [
      "leipäpakaste"
    ],
    "requiredAny": [
      "leipä",
      "rieska",
      "sämpylä"
    ],
    "bannedAny": [],
    "parentCategory": "bread",
    "parentCategories": [
      "bread",
      "frozen"
    ]
  },
  {
    "category": "experiences",
    "label": "Elämyslahjat",
    "variants": [
      "ajoelämys",
      "elämyslahja"
    ],
    "requiredAny": [
      "ajoelämys",
      "elämyslahja"
    ],
    "bannedAny": []
  },
  {
    "category": "ice_cubes",
    "label": "Jääpalat ja jääpallot",
    "variants": [
      "jääpala",
      "jääpallo"
    ],
    "requiredAny": [
      "jääpala",
      "jääpallo"
    ],
    "bannedAny": [],
    "parentCategory": "frozen"
  },
  {
    "category": "probiotic_drink",
    "label": "Maitohappobakteerijuomat",
    "variants": [
      "maitohappobakteerijuoma"
    ],
    "requiredAny": [
      "maitohappobakteerijuoma"
    ],
    "bannedAny": []
  },
  {
    "category": "fresh_dough",
    "label": "Tuoreet taikinat",
    "variants": [
      "tuoretaikina",
      "tuore pizzataikina"
    ],
    "requiredAny": [
      "tuoretaikina",
      "tuore pizzataikina"
    ],
    "bannedAny": []
  },
  {
    "category": "vegetable_paste",
    "label": "Kasvistahnat",
    "variants": [
      "paprikapyree"
    ],
    "requiredAny": [
      "paprikapyree"
    ],
    "bannedAny": []
  },
  {
    "category": "fruit_snacks",
    "label": "Hedelmänaposteltavat",
    "variants": [
      "hedelmänaposteltava",
      "fruitfunk"
    ],
    "requiredAny": [
      "hedelmänaposteltava",
      "fruitfunk"
    ],
    "bannedAny": []
  },
  {
    "category": "canned_meat",
    "label": "Lihasäilykkeet ja lihahyytelöt",
    "variants": [
      "lihahyytelö",
      "lihasäilyke",
      "hovihyytelö"
    ],
    "requiredAny": [
      "lihahyytelö",
      "lihasäilyke",
      "hovihyytelö"
    ],
    "bannedAny": []
  },
  {
    "category": "egg_products",
    "label": "Kananmunavalmisteet",
    "variants": [
      "valkuaisjauhe",
      "keitetty kananmuna"
    ],
    "requiredAny": [
      "valkuaisjauhe",
      "keitetty kananmuna"
    ],
    "bannedAny": []
  },
  {
    "category": "plant_cheese",
    "label": "Kasvipohjaiset juustovalmisteet",
    "variants": [
      "tuorevuusto",
      "kasvijuusto",
      "violife creamy"
    ],
    "requiredAny": [
      "tuorevuusto",
      "kasvijuusto",
      "violife creamy"
    ],
    "bannedAny": []
  },
  {
    "category": "baking_mix",
    "label": "Leivontaseokset",
    "variants": [
      "leipäsekoitus",
      "pizzamixjauhoseos"
    ],
    "requiredAny": [
      "leipäsekoitus",
      "pizzamixjauhoseos"
    ],
    "bannedAny": []
  },
  {
    "category": "drink_concentrate",
    "label": "Juomatiivisteet ja makusiirapit",
    "variants": [
      "juomatiiviste",
      "makusiirappi",
      "juomauute"
    ],
    "requiredAny": [
      "tiiviste",
      "siirappi",
      "juomauute",
      "mysoda"
    ],
    "bannedAny": []
  },
  {
    "category": "household_supplies",
    "label": "Kodin tarvikkeet",
    "variants": [
      "wc-paperiteline",
      "kuivausteline",
      "jätesäkki",
      "roskakassi",
      "kiuaskivi"
    ],
    "requiredAny": [
      "wc-paperiteline",
      "kuivausteline",
      "jätesäkki",
      "roskakassi",
      "kiuaskivi"
    ],
    "bannedAny": []
  },
  {
    "label": "Viinit ja viinipohjaiset juomat",
    "category": "wine",
    "variants": [
      "viini",
      "riesling"
    ],
    "bannedAny": [],
    "requiredAny": [
      "viini",
      "riesling"
    ]
  },
  {
    "label": "Äyriäiset ja nilviäiset",
    "category": "seafood",
    "variants": [
      "katkarapu",
      "jättikatkarapu"
    ],
    "bannedAny": [],
    "requiredAny": [
      "katkarapu",
      "jättikatkarapu"
    ]
  },
  {
    "label": "Siipikarjan jauhelihat",
    "category": "poultry_ground",
    "variants": [
      "siipikarjan jauheliha"
    ],
    "bannedAny": [
      "kastike",
      "ateria"
    ],
    "requiredAny": [
      "jauheliha"
    ],
    "parentCategory": "meat",
    "parentCategories": [
      "meat",
      "chicken"
    ]
  },
  {
    "label": "Perunamuusijauheet ja -hiutaleet",
    "category": "potato_flakes",
    "variants": [
      "perunamuusijauhe",
      "muusihiutale"
    ],
    "bannedAny": [],
    "requiredAny": [
      "perunamuusijauhe",
      "muusihiutale"
    ]
  },
  {
    "label": "Kasviproteiinit",
    "category": "plant_protein",
    "variants": [
      "tofu",
      "tempeh",
      "seitan",
      "härkäpapurouhe"
    ],
    "bannedAny": [],
    "requiredAny": [
      "tofu",
      "tempeh",
      "seitan",
      "härkäpapurouhe"
    ]
  },
  {
    "label": "Kasvipohjaiset välipalat",
    "category": "plant_dairy",
    "variants": [
      "kauravälipala",
      "soijavalmiste",
      "kauragurtti"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kauravälipala",
      "soijavalmiste",
      "kauragurtti"
    ]
  },
  {
    "label": "Kasvipohjaiset ruokakermat",
    "category": "plant_cream",
    "variants": [
      "kauraruoka"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kauraruoka"
    ]
  },
  {
    "label": "Henkilökohtaisen hoidon laitteet",
    "category": "personal_care_appliances",
    "variants": [
      "hiustenkuivain",
      "hiustenleikkuri",
      "suoristusrauta"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hiustenkuivain",
      "hiustenleikkuri",
      "suoristusrauta"
    ]
  },
  {
    "label": "Retkeily ja kalastustarvikkeet",
    "category": "outdoor_gear",
    "variants": [
      "onkimato",
      "retkisuihku"
    ],
    "bannedAny": [],
    "requiredAny": [
      "onkimato",
      "retkisuihku"
    ]
  },
  {
    "label": "Jääteet",
    "category": "iced_tea",
    "variants": [
      "jäätee"
    ],
    "bannedAny": [],
    "requiredAny": [
      "jäätee"
    ]
  },
  {
    "label": "Hyvinvoinnin tuotteet ja tarvikkeet",
    "category": "health_supplies",
    "variants": [
      "kinesioteippi",
      "selkätuki",
      "ryhtiliivi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kinesioteippi",
      "selkätuki",
      "ryhtiliivi"
    ]
  },
  {
    "label": "Grillit ja savustimet",
    "category": "grills",
    "variants": [
      "kaasugrilli",
      "kamado-grilli",
      "hiilisavustin"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kaasugrilli",
      "kamado-grilli",
      "hiilisavustin"
    ]
  },
  {
    "label": "Kalusteet",
    "category": "furniture",
    "variants": [
      "tuoli",
      "tilanjakajaseinä"
    ],
    "bannedAny": [],
    "requiredAny": [
      "tuoli",
      "tilanjakajaseinä"
    ]
  },
  {
    "label": "Pakastetut suklaahedelmät",
    "category": "frozen_confection",
    "variants": [
      "franui",
      "trü frü"
    ],
    "bannedAny": [],
    "requiredAny": [
      "franui",
      "trü frü"
    ],
    "parentCategory": "frozen"
  },
  {
    "label": "Paloturvatarvikkeet",
    "category": "fire_safety",
    "variants": [
      "palovaroitin",
      "jauhesammutin"
    ],
    "bannedAny": [],
    "requiredAny": [
      "palovaroitin",
      "jauhesammutin"
    ]
  },
  {
    "label": "Eteeriset öljyt",
    "category": "essential_oils",
    "variants": [
      "eteerinen öljy"
    ],
    "bannedAny": [],
    "requiredAny": [
      "eteerinen öljy"
    ]
  },
  {
    "label": "Munavoit",
    "category": "egg_spread",
    "variants": [
      "munavoi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "munavoi"
    ]
  },
  {
    "label": "Ruoanvalmistusrasvat",
    "category": "cooking_fats",
    "variants": [
      "ankanrasva",
      "kookosrasva"
    ],
    "bannedAny": [],
    "requiredAny": [
      "ankanrasva",
      "kookosrasva"
    ]
  },
  {
    "label": "Hiilet ja sytytystarvikkeet",
    "category": "charcoal",
    "variants": [
      "grillihiili",
      "sytytyspala"
    ],
    "bannedAny": [],
    "requiredAny": [
      "grillihiili",
      "sytytyspala"
    ]
  },
  {
    "label": "Kuivatut pavut",
    "category": "beans",
    "variants": [
      "mungpapu",
      "adukipapu"
    ],
    "bannedAny": [],
    "requiredAny": [
      "mungpapu",
      "adukipapu"
    ]
  },
  {
    "label": "Sisäilmalaitteet",
    "category": "air_care",
    "variants": [
      "ilmankostutin"
    ],
    "bannedAny": [],
    "requiredAny": [
      "ilmankostutin"
    ]
  },
  {
    "label": "Kodintekstiilit",
    "category": "home_textiles",
    "variants": [
      "matto",
      "keittiöpyyhe",
      "verho",
      "torkkuhuopa"
    ],
    "bannedAny": [],
    "requiredAny": [
      "matto",
      "keittiöpyyhe",
      "verho",
      "torkkuhuopa"
    ]
  },
  {
    "label": "Säilytys ja laukut",
    "category": "storage",
    "variants": [
      "säilytyslaatikko",
      "vetolaukku",
      "säilytysastia"
    ],
    "bannedAny": [],
    "requiredAny": [
      "säilytyslaatikko",
      "vetolaukku",
      "säilytysastia"
    ]
  },
  {
    "label": "Tuoksut",
    "category": "fragrance",
    "variants": [
      "hajuvesi",
      "eau de parfum",
      "eau de toilette"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hajuvesi",
      "eau de parfum",
      "eau de toilette"
    ]
  },
  {
    "label": "Kodinkoneet",
    "category": "home_appliances",
    "variants": [
      "pölynimuri",
      "robotti-imuri",
      "varsi-imuri"
    ],
    "bannedAny": [],
    "requiredAny": [
      "pölynimuri",
      "robotti-imuri",
      "varsi-imuri"
    ]
  },
  {
    "label": "Lämmitys ja sähkötarvikkeet",
    "category": "heating",
    "variants": [
      "sulanapitokaapeli",
      "kaasulämmitin",
      "seinälämpöpuhallin"
    ],
    "bannedAny": [],
    "requiredAny": [
      "sulanapitokaapeli",
      "kaasulämmitin",
      "seinälämpöpuhallin"
    ]
  },
  {
    "label": "Jälkiruoat",
    "category": "dessert",
    "variants": [
      "tiramisu",
      "mämmi",
      "kiisseli",
      "suklaavaahto",
      "mochi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "tiramisu",
      "mämmi",
      "kiisseli",
      "suklaavaahto",
      "mochi"
    ]
  },
  {
    "label": "Skyr-valmisteet",
    "category": "skyr",
    "variants": [
      "skyr"
    ],
    "bannedAny": [],
    "requiredAny": [
      "skyr"
    ]
  },
  {
    "label": "Valmiit lisukkeet",
    "category": "prepared_sides",
    "variants": [
      "kermaperuna",
      "bataattisose",
      "porkkanasose"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kermaperuna",
      "bataattisose",
      "porkkanasose"
    ]
  },
  {
    "label": "Hummukset",
    "category": "hummus",
    "variants": [
      "hummus",
      "hummis"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hummus",
      "hummis"
    ]
  },
  {
    "label": "Maustetut maitojuomat",
    "category": "flavored_milk",
    "variants": [
      "maitokaakaojuoma",
      "kaakaomaito"
    ],
    "bannedAny": [],
    "requiredAny": [
      "maitokaakaojuoma",
      "kaakaomaito"
    ]
  },
  {
    "label": "Suolaiset piirakat",
    "category": "savory_pastry",
    "variants": [
      "karjalanpiirakka",
      "riisipiirakka",
      "nakkipiilo",
      "börek"
    ],
    "bannedAny": [],
    "requiredAny": [
      "karjalanpiirakka",
      "riisipiirakka",
      "nakkipiilo",
      "börek"
    ]
  },
  {
    "label": "Alkoholijuomasekoitukset",
    "category": "mixed_drink",
    "variants": [
      "hard seltzer",
      "viinipohjainen juoma",
      "vodka lemonade"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hard seltzer",
      "viinipohjainen juoma",
      "vodka lemonade"
    ]
  },
  {
    "label": "Alkoholittomat drinkit",
    "category": "mocktail",
    "variants": [
      "mocktail",
      "alkoholiton kuohujuoma"
    ],
    "bannedAny": [],
    "requiredAny": [
      "mocktail",
      "alkoholiton kuohujuoma"
    ]
  },
  {
    "label": "Kombuchat",
    "category": "kombucha",
    "variants": [
      "kombucha"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kombucha"
    ]
  },
  {
    "label": "Urheilu- ja hyvinvointijuomat",
    "category": "sports_drink",
    "variants": [
      "urheilujuoma",
      "bcaa-juoma",
      "vitamiinijuoma"
    ],
    "bannedAny": [],
    "requiredAny": [
      "urheilujuoma",
      "bcaa-juoma",
      "vitamiinijuoma"
    ]
  },
  {
    "label": "Välipalapatukat",
    "category": "snack_bar",
    "variants": [
      "myslipatukka",
      "kaurapatukka",
      "välipalapatukka"
    ],
    "bannedAny": [],
    "requiredAny": [
      "myslipatukka",
      "kaurapatukka",
      "välipalapatukka"
    ]
  },
  {
    "label": "Riisi- ja maissikakut",
    "category": "rice_cakes",
    "variants": [
      "riisikakku",
      "maissikakku"
    ],
    "bannedAny": [],
    "requiredAny": [
      "riisikakku",
      "maissikakku"
    ]
  },
  {
    "label": "Hedelmäsoseet",
    "category": "fruit_puree",
    "variants": [
      "omenasose",
      "mangosose"
    ],
    "bannedAny": [],
    "requiredAny": [
      "omenasose",
      "mangosose"
    ]
  },
  {
    "label": "Huuhteluaineet",
    "category": "fabric_softener",
    "variants": [
      "huuhteluaine"
    ],
    "bannedAny": [],
    "requiredAny": [
      "huuhteluaine"
    ]
  },
  {
    "label": "Kynttilät",
    "category": "candles",
    "variants": [
      "lämpökynttilä",
      "lyhtykynttilä"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lämpökynttilä",
      "lyhtykynttilä"
    ]
  },
  {
    "label": "Puutarhatarvikkeet",
    "category": "garden_supplies",
    "variants": [
      "kukkamulta",
      "puutarhamulta",
      "lannoite"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kukkamulta",
      "puutarhamulta",
      "lannoite"
    ]
  },
  {
    "label": "Pekonit",
    "category": "bacon",
    "variants": [
      "pekoni",
      "pancetta"
    ],
    "bannedAny": [],
    "requiredAny": [
      "pekoni",
      "pancetta"
    ]
  },
  {
    "label": "Sisustus ja koristeet",
    "category": "home_decor",
    "variants": [
      "paperitähti",
      "paperienkeli",
      "paperikoriste"
    ],
    "bannedAny": [],
    "requiredAny": [
      "paperitähti",
      "paperienkeli",
      "paperikoriste"
    ]
  },
  {
    "label": "Elektroniikka",
    "category": "electronics",
    "variants": [
      "kuuloke",
      "paperisilppuri",
      "multimediasoitin"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kuuloke",
      "paperisilppuri",
      "multimediasoitin"
    ]
  },
  {
    "label": "Purukumit",
    "category": "chewing_gum",
    "variants": [
      "purukumi",
      "ksylitolipurukumi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "purukumi",
      "ksylitolipurukumi"
    ]
  },
  {
    "label": "Kuntoiluvälineet",
    "category": "sports_equipment",
    "variants": [
      "kahvakuula",
      "jumppapallo",
      "kuntopallo",
      "kuntoiluväline"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kahvakuula",
      "jumppapallo",
      "kuntopallo",
      "kuntoiluväline"
    ]
  },
  {
    "label": "Työkalut ja koneet",
    "category": "tools",
    "variants": [
      "jakoavain",
      "hylsyavainsarja",
      "vesuri",
      "aggregaatti",
      "plasmaleikkuri"
    ],
    "bannedAny": [],
    "requiredAny": [
      "jakoavain",
      "hylsyavainsarja",
      "vesuri",
      "aggregaatti",
      "plasmaleikkuri"
    ]
  },
  {
    "label": "Rakennustarvikkeet",
    "category": "building_supplies",
    "variants": [
      "liimapuulevy",
      "seinämaali",
      "akustiikkalevy",
      "rakennustarvike"
    ],
    "bannedAny": [],
    "requiredAny": [
      "liimapuulevy",
      "seinämaali",
      "akustiikkalevy",
      "rakennustarvike"
    ]
  },
  {
    "label": "Askartelu ja toimistotarvikkeet",
    "category": "craft_supplies",
    "variants": [
      "askartelupaperi",
      "silkkipaperi",
      "kopiopaperi",
      "paperiliitin",
      "pyöröpuikko"
    ],
    "bannedAny": [],
    "requiredAny": [
      "askartelupaperi",
      "silkkipaperi",
      "kopiopaperi",
      "paperiliitin",
      "pyöröpuikko"
    ]
  },
  {
    "label": "Valaistus",
    "category": "lighting",
    "variants": [
      "led-valo",
      "led-putki",
      "plafondi",
      "otsavalo"
    ],
    "bannedAny": [],
    "requiredAny": [
      "led-valo",
      "led-putki",
      "plafondi",
      "otsavalo"
    ]
  },
  {
    "label": "Vaatteet, jalkineet ja asusteet",
    "category": "clothing",
    "variants": [
      "nilkkuri",
      "talvisaapas",
      "neulepusero",
      "toppahaalari"
    ],
    "bannedAny": [],
    "requiredAny": [
      "nilkkuri",
      "talvisaapas",
      "neulepusero",
      "toppahaalari"
    ]
  },
  {
    "label": "Autotarvikkeet",
    "category": "automotive",
    "variants": [
      "moottoriöljy",
      "jääraappa",
      "kahvaraappa"
    ],
    "bannedAny": [],
    "requiredAny": [
      "moottoriöljy",
      "jääraappa",
      "kahvaraappa"
    ]
  },
  {
    "label": "Siivousvälineet",
    "category": "cleaning_tools",
    "variants": [
      "astiaharja",
      "hankaussieni",
      "siivousliina",
      "wc-harja",
      "rikkasetti"
    ],
    "bannedAny": [],
    "requiredAny": [
      "astiaharja",
      "hankaussieni",
      "siivousliina",
      "wc-harja",
      "rikkasetti"
    ]
  },
  {
    "label": "Dipit ja salsat",
    "category": "dip_sauce",
    "variants": [
      "dippikastike",
      "juustodippi",
      "salsakastike",
      "tacokastike",
      "guacamole"
    ],
    "bannedAny": [],
    "requiredAny": [
      "dippikastike",
      "juustodippi",
      "salsakastike",
      "tacokastike",
      "guacamole"
    ]
  },
  {
    "label": "Tortillat ja tacokuoret",
    "category": "tortilla",
    "variants": [
      "tortilla",
      "tacokuori",
      "tacokuoret"
    ],
    "bannedAny": [],
    "requiredAny": [
      "tortilla",
      "tacokuori",
      "tacokuoret"
    ]
  },
  {
    "label": "Pähkinät ja siemenet",
    "category": "nuts_seeds",
    "variants": [
      "pähkinä",
      "manteli",
      "siemensekoitus"
    ],
    "bannedAny": [],
    "requiredAny": [
      "pähkinä",
      "manteli",
      "siemensekoitus"
    ]
  },
  {
    "label": "Kuivatut hedelmät",
    "category": "dried_fruit",
    "variants": [
      "rusina",
      "kuivattu hedelmä",
      "kuivattu luumu"
    ],
    "bannedAny": [],
    "requiredAny": [
      "rusina",
      "kuivattu hedelmä",
      "kuivattu luumu"
    ]
  },
  {
    "label": "Hedelmäsäilykkeet",
    "category": "canned_fruit",
    "variants": [
      "hedelmäsäilyke",
      "säilykeananas",
      "päärynänpuolikkaat"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hedelmäsäilyke",
      "säilykeananas",
      "päärynänpuolikkaat"
    ]
  },
  {
    "label": "Viljalisukkeet",
    "category": "grain_side",
    "variants": [
      "kvinoa",
      "bulgur",
      "couscous"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kvinoa",
      "bulgur",
      "couscous"
    ]
  },
  {
    "label": "Perunapakasteet",
    "category": "frozen_potatoes",
    "variants": [
      "ranskanperuna",
      "röstiperuna",
      "muusiperuna"
    ],
    "bannedAny": [],
    "requiredAny": [
      "ranskanperuna",
      "röstiperuna",
      "muusiperuna"
    ],
    "parentCategory": "frozen"
  },
  {
    "label": "Makeat tahnat ja pähkinävoit",
    "category": "sweet_spread",
    "variants": [
      "maapähkinävoi",
      "hasselpähkinälevite",
      "kaakaolevite",
      "pistaasikreemi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "maapähkinävoi",
      "hasselpähkinälevite",
      "kaakaolevite",
      "pistaasikreemi"
    ]
  },
  {
    "label": "Juomajauheet",
    "category": "drink_powder",
    "variants": [
      "kahvijuomajauhe",
      "pikacappuccino",
      "kaakaojauhe"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kahvijuomajauhe",
      "pikacappuccino",
      "kaakaojauhe"
    ]
  },
  {
    "label": "Meikit",
    "category": "makeup",
    "variants": [
      "huulikiilto",
      "ripsiväri",
      "meikkivoide"
    ],
    "bannedAny": [],
    "requiredAny": [
      "huulikiilto",
      "ripsiväri",
      "meikkivoide"
    ]
  },
  {
    "label": "Glögit ja simat",
    "category": "seasonal_drink",
    "variants": [
      "glögi",
      "sima"
    ],
    "bannedAny": [],
    "requiredAny": [
      "glögi",
      "sima"
    ]
  },
  {
    "label": "Lemmikkitarvikkeet",
    "category": "pet_supplies",
    "variants": [
      "lintulauta",
      "lemmikkitarvike"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lintulauta",
      "lemmikkitarvike"
    ]
  },
  {
    "label": "Tuholaistorjunta",
    "category": "pest_control",
    "variants": [
      "kärpäspaperi",
      "etanasyötti",
      "kärpäspyydys"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kärpäspaperi",
      "etanasyötti",
      "kärpäspyydys"
    ]
  },
  {
    "label": "Pihvit, pyörykät ja kebabit",
    "category": "prepared_protein",
    "variants": [
      "lihapulla",
      "lihapyörykkä",
      "jauhelihapihvi",
      "kananugetti",
      "falafel",
      "kebab",
      "vegepihvi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lihapulla",
      "lihapyörykkä",
      "jauhelihapihvi",
      "kananugetti",
      "nugget",
      "falafel",
      "kebab",
      "vegepihvi",
      "fileebites",
      "fileefingers"
    ]
  },
  {
    "label": "Lastenruoat",
    "category": "baby_food",
    "variants": [
      "lastenruoka",
      "vauvanruoka",
      "äidinmaidonkorvike",
      "vieroitusvalmiste"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lastenruoka",
      "vauvanruoka",
      "vieroitusvalmiste",
      "korvike"
    ]
  },
  {
    "label": "Kookosmaidot ja kookoskermat",
    "category": "coconut_milk",
    "variants": [
      "kookosmaito",
      "kookoskerma"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kookosmaito",
      "kookoskerma"
    ]
  },
  {
    "label": "Urheiluravinteet",
    "category": "sports_nutrition",
    "variants": [
      "proteiinipatukka",
      "urheilujuomajauhe",
      "pre-workout",
      "gainer"
    ],
    "bannedAny": [],
    "requiredAny": [
      "proteiinipatukka",
      "urheilujuomajauhe",
      "pre-workout",
      "gainer"
    ]
  },
  {
    "label": "Kalat ja mädit",
    "category": "fish",
    "variants": [
      "kala",
      "lohi",
      "kirjolohi",
      "graavilohi",
      "kylmäsavulohi",
      "savulohi",
      "mäti"
    ],
    "bannedAny": [
      "keitto",
      "salaatti",
      "liemikuutio",
      "kalanruoka"
    ],
    "requiredAny": [
      "kala",
      "lohi",
      "mäti"
    ]
  },
  {
    "label": "Sulatejuustot",
    "category": "processed_cheese",
    "variants": [
      "sulatejuusto",
      "koskenlaskija"
    ],
    "bannedAny": [
      "kastike"
    ],
    "requiredAny": [
      "sulatejuusto",
      "sulateviipale",
      "koskenlaskija"
    ]
  },
  {
    "label": "Voita sisältävät rasvaseokset",
    "category": "butter_blend",
    "variants": [
      "rasvaseos",
      "oivariini",
      "ingmariini",
      "sipaisu"
    ],
    "bannedAny": [],
    "requiredAny": [
      "rasvaseos",
      "oivariini",
      "ingmariini",
      "sipaisu"
    ]
  },
  {
    "label": "Leivonta-ainekset",
    "category": "baking_ingredients",
    "variants": [
      "leivonta-aines",
      "kuivahiiva",
      "leivinjauhe",
      "ruokasooda",
      "rommiaromi",
      "vaniljatanko"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hiiva",
      "leivinjauhe",
      "ruokasooda",
      "aromi",
      "vaniljatanko"
    ]
  },
  {
    "label": "Kondensoidut maidot",
    "category": "condensed_milk",
    "variants": [
      "kondensoitu maito"
    ],
    "bannedAny": [],
    "requiredAny": [
      "kondensoitu maito"
    ]
  },
  {
    "label": "Jälkiruokakastikkeet",
    "category": "dessert_sauce",
    "variants": [
      "jälkiruokakastike",
      "suklaakastike",
      "kinuskikastike"
    ],
    "bannedAny": [
      "jäätelö"
    ],
    "requiredAny": [
      "suklaakastike",
      "kinuskikastike",
      "jälkiruokakastike"
    ]
  },
  {
    "label": "Valmisateriat",
    "category": "ready_meal",
    "variants": [
      "valmisateria",
      "mikroateria",
      "pyttipannu",
      "lasagne",
      "kiusaus"
    ],
    "bannedAny": [],
    "requiredAny": [
      "ateria",
      "pyttipannu",
      "lasagne",
      "kiusaus",
      "stroganoff"
    ]
  },
  {
    "label": "Valmissalaatit",
    "category": "prepared_salad",
    "variants": [
      "valmissalaatti",
      "italiansalaatti",
      "coleslaw",
      "punajuurisalaatti"
    ],
    "bannedAny": [],
    "requiredAny": [
      "salaatti",
      "coleslaw"
    ]
  },
  {
    "label": "Täytetyt leivät ja hampurilaiset",
    "category": "ready_sandwich",
    "variants": [
      "panini",
      "sandwich",
      "wrap",
      "hampurilainen",
      "hot dog"
    ],
    "bannedAny": [
      "sämpylä",
      "sampyla",
      "kastike"
    ],
    "requiredAny": [
      "panini",
      "sandwich",
      "wrap",
      "hampurilainen",
      "hot dog",
      "burgeri"
    ]
  },
  {
    "label": "Ohukaiset",
    "category": "pancakes",
    "variants": [
      "ohukainen",
      "pinaattiohukainen",
      "rahkaohukainen"
    ],
    "bannedAny": [],
    "requiredAny": [
      "ohukainen"
    ]
  },
  {
    "label": "Oluet",
    "category": "beer",
    "variants": [
      "olut",
      "lager",
      "ipa-olut",
      "kotikalja"
    ],
    "bannedAny": [
      "olutlasi",
      "shampoo"
    ],
    "requiredAny": [
      "olut",
      "lager",
      "kotikalja"
    ]
  },
  {
    "label": "Siiderit",
    "category": "cider",
    "variants": [
      "siideri",
      "omenasiideri",
      "päärynäsiideri"
    ],
    "bannedAny": [
      "etikka"
    ],
    "requiredAny": [
      "siideri",
      "cider"
    ]
  },
  {
    "label": "Lonkerot",
    "category": "long_drink",
    "variants": [
      "lonkero",
      "long drink"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lonkero",
      "long drink"
    ]
  },
  {
    "label": "Energiajuomat",
    "category": "energy_drink",
    "variants": [
      "energiajuoma"
    ],
    "bannedAny": [],
    "requiredAny": [
      "energiajuoma",
      "energy",
      "nocco",
      "mad croc"
    ]
  },
  {
    "label": "Valmiit kahvijuomat",
    "category": "coffee_drink",
    "variants": [
      "kahvijuoma",
      "maitokahvijuoma",
      "cold brew",
      "frezza"
    ],
    "bannedAny": [
      "kahvijuomajauhe"
    ],
    "requiredAny": [
      "kahvijuoma",
      "cold brew",
      "frezza"
    ]
  },
  {
    "label": "Virvoitusjuomat",
    "category": "soft_drink",
    "variants": [
      "virvoitusjuoma",
      "limonadi",
      "limsa"
    ],
    "bannedAny": [
      "mehujää",
      "limonadijää"
    ],
    "requiredAny": [
      "virvoitusjuoma",
      "limonadi",
      "limsa"
    ]
  },
  {
    "label": "Vedet",
    "category": "water",
    "variants": [
      "lähdevesi",
      "kivennäisvesi",
      "vichy"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lähdevesi",
      "kivennäisvesi",
      "vichy"
    ]
  },
  {
    "label": "Mehukeitot",
    "category": "fruit_soup",
    "variants": [
      "mehukeitto",
      "mansikkakeitto",
      "marjakeitto",
      "päärynäkeitto"
    ],
    "bannedAny": [],
    "requiredAny": [
      "mehukeitto",
      "mansikkakeitto",
      "marjakeitto",
      "päärynäkeitto"
    ]
  },
  {
    "label": "Smoothiet",
    "category": "smoothie",
    "variants": [
      "smoothie"
    ],
    "bannedAny": [],
    "requiredAny": [
      "smoothie"
    ]
  },
  {
    "label": "Ihonhoito",
    "category": "skin_care",
    "variants": [
      "kosteusvoide",
      "aurinkovoide",
      "kasvovoide",
      "vartalovoide",
      "kasvovoi",
      "vartalovoi",
      "shea voi",
      "puhdistusmaito",
      "kasvonaamio",
      "huulivoide"
    ],
    "bannedAny": [],
    "requiredAny": [
      "voide",
      "kasvovoi",
      "vartalovoi",
      "shea",
      "puhdistusmaito",
      "kasvonaamio",
      "huulivoide"
    ]
  },
  {
    "label": "Lelut ja pelit",
    "category": "toys",
    "variants": [
      "lelu",
      "muovailuvaha",
      "play doh",
      "nukke",
      "lautapeli",
      "palapeli"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lelu",
      "muovailuvaha",
      "play doh",
      "play-doh",
      "nukke",
      "peli"
    ]
  },
  {
    "label": "Ravintolisät",
    "category": "supplements",
    "variants": [
      "ravintolisä",
      "maitohappobakteeri",
      "monivitamiini",
      "proteiinijauhe",
      "heraproteiini"
    ],
    "bannedAny": [
      "koira",
      "kissa"
    ],
    "requiredAny": [
      "ravintolisä",
      "vitamiini",
      "maitohappobakteeri",
      "proteiinijauhe",
      "heraproteiini"
    ]
  },
  {
    "label": "Lemmikkien ruoat",
    "category": "pet_food",
    "variants": [
      "koiranruoka",
      "kissanruoka",
      "kissanmaito",
      "kissanherkku",
      "koiranherkku"
    ],
    "bannedAny": [
      "lelu",
      "hammastahna"
    ],
    "requiredAny": [
      "koiranruoka",
      "kissanruoka",
      "kissanmaito",
      "kissanherkku",
      "koiranherkku",
      "marsun täysravinto",
      "jyrsijänruoka"
    ]
  },
  {
    "label": "Keittiövälineet",
    "category": "kitchen_tools",
    "variants": [
      "keittiöväline",
      "kahvilusikka",
      "kahvimitta",
      "leipäveitsi",
      "kananmunaleikkuri",
      "raastin",
      "ruokalusikka"
    ],
    "bannedAny": [],
    "requiredAny": [
      "lusikka",
      "veitsi",
      "kahvimitta",
      "leikkuri",
      "raastin",
      "kaavin",
      "suti",
      "ruotopihdit",
      "keittiösakset"
    ]
  },
  {
    "label": "Astiat ja ruokarasiat",
    "category": "tableware",
    "variants": [
      "juomapullo",
      "kahvikuppi",
      "juomalasi",
      "uunivuoka",
      "ruokarasia",
      "termospullo",
      "pressopannu"
    ],
    "bannedAny": [],
    "requiredAny": [
      "juomapullo",
      "kahvikuppi",
      "juomalasi",
      "uunivuoka",
      "ruokarasia",
      "lounasrasia",
      "termospullo",
      "termoskaadin",
      "pressopannu",
      "teräskulho",
      "mikrokupu"
    ]
  },
  {
    "label": "Keittiökoneet",
    "category": "kitchen_appliances",
    "variants": [
      "kahvinkeitin",
      "kahvimylly",
      "kahviautomaatti",
      "airfryer"
    ],
    "bannedAny": [
      "lelu",
      "leikkisetti",
      "puhdistusneste"
    ],
    "requiredAny": [
      "kahvinkeitin",
      "kahvimylly",
      "kahviautomaatti",
      "airfryer"
    ]
  },
  {
    "label": "Hiusten hoitoaineet",
    "category": "hair_conditioner",
    "variants": [
      "hiustenhoitoaine",
      "hiusnaamio"
    ],
    "bannedAny": [
      "turkki"
    ],
    "requiredAny": [
      "hoitoaine",
      "hiusnaamio"
    ]
  },
  {
    "label": "Hiusten muotoilu",
    "category": "hair_styling",
    "variants": [
      "hiuslakka",
      "hiuskiinne",
      "muotovaahto"
    ],
    "bannedAny": [],
    "requiredAny": [
      "hiuslakka",
      "hiuskiinne",
      "muotovaahto"
    ]
  },
  {
    "label": "Hygieniatarvikkeet",
    "category": "hygiene_supplies",
    "variants": [
      "vanupuikko",
      "vanutyyny",
      "tamponi",
      "pikkuhousunsuoja"
    ],
    "bannedAny": [],
    "requiredAny": [
      "vanupuikko",
      "vanutyyny",
      "tamponi",
      "pikkuhousunsuoja"
    ]
  },
  {
    "label": "Kodin puhdistusaineet",
    "category": "cleaning_products",
    "variants": [
      "putkenavaaja",
      "wc-puhdistaja",
      "wc-puhdistusaine",
      "yleispuhdistusaine"
    ],
    "bannedAny": [
      "kasvo",
      "hius"
    ],
    "requiredAny": [
      "putkenavaaja",
      "puhdistaja",
      "puhdistusaine"
    ]
  },
  {
    "label": "Jäätelöt",
    "category": "ice_cream",
    "variants": [
      "jäätelö",
      "jaatelo",
      "mehujää",
      "limonadijää"
    ],
    "bannedAny": [
      "hiusharja",
      "lelu",
      "voide"
    ],
    "requiredAny": [
      "jäätelö",
      "mehujää",
      "limonadijää"
    ],
    "parentCategory": "frozen"
  },
  {
    "label": "Kasvispakasteet",
    "category": "frozen_vegetables",
    "variants": [
      "pakastevihannekset",
      "pakastekasvikset",
      "kasvispakaste",
      "pakasteherneet"
    ],
    "bannedAny": [],
    "requiredAny": [
      "pakaste",
      "vihannes",
      "kasvis",
      "herne",
      "maissi"
    ],
    "parentCategory": "frozen"
  },
  {
    "label": "Hedelmä- ja marjapakasteet",
    "category": "frozen_fruit",
    "variants": [
      "pakastemarjat",
      "marjapakaste",
      "pakastehedelmät"
    ],
    "bannedAny": [],
    "requiredAny": [
      "pakaste",
      "marja",
      "mansikka",
      "mustikka",
      "vadelma"
    ],
    "parentCategory": "frozen"
  },
  {
    "label": "Kala- ja äyriäispakasteet",
    "category": "frozen_fish",
    "variants": [
      "pakastekala",
      "kalapakaste",
      "pakastekatkarapu"
    ],
    "bannedAny": [],
    "requiredAny": [
      "pakaste",
      "kala",
      "lohi",
      "katkarapu",
      "mäti"
    ],
    "parentCategory": "frozen",
    "parentCategories": [
      "frozen",
      "fish"
    ]
  },
  {
    "label": "Taikinapakasteet",
    "category": "frozen_dough",
    "variants": [
      "pakastetaikina",
      "taikinapakaste",
      "voitaikina",
      "pizzataikina"
    ],
    "bannedAny": [],
    "requiredAny": [
      "taikina"
    ],
    "parentCategory": "frozen"
  },
  {
    "label": "Keitot",
    "category": "soup",
    "variants": [
      "keitto",
      "hernekeitto",
      "tomaattikeitto",
      "kanakeitto"
    ],
    "bannedAny": [
      "liemikuutio",
      "keittojuures"
    ],
    "requiredAny": [
      "keitto",
      "soup"
    ]
  },
  {
    "label": "Ruokakastikkeet",
    "category": "cooking_sauce",
    "variants": [
      "ruokakastike",
      "ruskeakastike",
      "bearnaisekastike",
      "hollandaise",
      "currykastike",
      "pippurikastike"
    ],
    "bannedAny": [
      "sipsi",
      "chips"
    ],
    "requiredAny": [
      "kastike",
      "sauce",
      "hollandaise"
    ]
  },
  {
    "label": "Liemet ja fondit",
    "category": "stock",
    "variants": [
      "liemikuutio",
      "kanaliemikuutio",
      "kasvisliemikuutio",
      "lihaliemikuutio",
      "fondi"
    ],
    "bannedAny": [],
    "requiredAny": [
      "liemikuutio",
      "fondi"
    ]
  },
  {
    "label": "Mausteet",
    "category": "seasoning",
    "variants": [
      "mauste",
      "mausteseos",
      "grillimauste",
      "jauhelihamauste",
      "mustapippuri",
      "kaneli"
    ],
    "bannedAny": [
      "sipsi",
      "chips",
      "pulla",
      "jogurtti"
    ],
    "requiredAny": [
      "mauste",
      "pippuri",
      "kaneli"
    ]
  },
  {
    "label": "Etikat",
    "category": "vinegar",
    "variants": [
      "etikka",
      "viinietikka",
      "omenasiiderietikka",
      "balsamico"
    ],
    "bannedAny": [
      "pyykkietikka",
      "siivousetikka"
    ],
    "requiredAny": [
      "etikka",
      "balsamico"
    ]
  },
  {
    "label": "Nuudelit",
    "category": "noodles",
    "variants": [
      "nuudeli",
      "nuudelit",
      "pikanuudeli"
    ],
    "bannedAny": [],
    "requiredAny": [
      "nuudeli",
      "noodle"
    ]
  },
  {
    "label": "Pizzat",
    "category": "pizza",
    "variants": [
      "pizza",
      "pakastepizza",
      "pinsa"
    ],
    "bannedAny": [
      "pizzamauste",
      "pizzajuusto",
      "pizzaraaste",
      "pizzakastike",
      "pizzataikina",
      "pizzapohja",
      "pizzaleikkuri"
    ],
    "requiredAny": [
      "pizza",
      "pinsa"
    ]
  },
  {
    "label": "Ateria-ainekset",
    "category": "meal_kit",
    "variants": [
      "ateria-aines",
      "ateria-ainekset",
      "pata-aines",
      "lasagne-aines"
    ],
    "bannedAny": [],
    "requiredAny": [
      "ateria",
      "pata-aines",
      "lasagne",
      "lasagnette",
      "snack pot",
      "spaghetteria"
    ]
  },
  {
    "label": "Kermaviilit",
    "category": "sour_cream",
    "variants": [
      "kermaviili"
    ],
    "bannedAny": [
      "sipsi",
      "chips",
      "maissikakku",
      "riisikakku"
    ],
    "requiredAny": [
      "kermaviili"
    ]
  },
  {
    "label": "Smetanat",
    "category": "smetana",
    "variants": [
      "smetana"
    ],
    "bannedAny": [
      "sipsi",
      "chips"
    ],
    "requiredAny": [
      "smetana"
    ]
  },
  {
    "label": "Ranskankermat",
    "category": "creme_fraiche",
    "variants": [
      "ranskankerma",
      "crème fraîche",
      "creme fraiche"
    ],
    "bannedAny": [
      "sipsi",
      "chips"
    ],
    "requiredAny": [
      "ranskankerma",
      "crème fraîche",
      "creme fraiche"
    ]
  },
  {
    "label": "Viilit",
    "category": "fermented_milk",
    "variants": [
      "viili",
      "kevytviili"
    ],
    "bannedAny": [
      "kermaviili"
    ],
    "requiredAny": [
      "viili"
    ]
  },
  {
    "label": "Vanukkaat",
    "category": "pudding",
    "variants": [
      "vanukas",
      "proteiinivanukas",
      "maitosuklaavanukas"
    ],
    "bannedAny": [
      "jäätelö"
    ],
    "requiredAny": [
      "vanukas"
    ]
  },
  {
    "label": "Kasvipohjaiset juomat",
    "category": "plant_drink",
    "variants": [
      "kauramaito",
      "kaurajuoma",
      "soijajuoma",
      "mantelijuoma",
      "kasvipohjainen juoma"
    ],
    "bannedAny": [
      "jäätelö"
    ],
    "requiredAny": [
      "kauramaito",
      "kaurajuoma",
      "soijajuoma",
      "mantelijuoma",
      "kasvipohjainen juoma"
    ]
  },
  {
    "label": "Maitojauheet",
    "category": "milk_powder",
    "variants": [
      "maitojauhe",
      "rasvaton maitojauhe"
    ],
    "bannedAny": [
      "äidinmaidonkorvike"
    ],
    "requiredAny": [
      "maitojauhe"
    ]
  },
  {
    "label": "Pullat ja leivonnaiset",
    "category": "pastry",
    "variants": [
      "pulla",
      "pullapitko",
      "korvapuusti",
      "wiener",
      "leivos"
    ],
    "bannedAny": [
      "jäätelö",
      "taikina"
    ],
    "requiredAny": [
      "pulla",
      "pitko",
      "korvapuusti",
      "wiener",
      "leivos"
    ]
  },
  {
    "label": "Kermat",
    "category": "cream",
    "variants": [
      "kerma",
      "kuohukerma",
      "ruokakerma",
      "vispikerma"
    ],
    "bannedAny": [
      "jäätelö",
      "kermajuusto",
      "kermaviili"
    ],
    "requiredAny": [
      "kerma",
      "kuohukerma",
      "ruokakerma",
      "vispikerma"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Rahkat",
    "category": "quark",
    "variants": [
      "rahka",
      "maitorahka",
      "proteiinirahka"
    ],
    "bannedAny": [
      "rahkapiirakka",
      "rahkapulla"
    ],
    "requiredAny": [
      "rahka",
      "maitorahka",
      "proteiinirahka"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Raejuustot",
    "category": "cottage_cheese",
    "variants": [
      "raejuusto"
    ],
    "bannedAny": [
      "raejuustosalaatti"
    ],
    "requiredAny": [
      "raejuusto"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Tuorejuustot",
    "category": "cream_cheese",
    "variants": [
      "tuorejuusto"
    ],
    "bannedAny": [
      "tuorejuustokakku"
    ],
    "requiredAny": [
      "tuorejuusto"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Voit",
    "category": "butter",
    "variants": [
      "voi",
      "meijerivoi"
    ],
    "bannedAny": [
      "voitaikina",
      "voileipä",
      "sheavoi",
      "shea voi",
      "kasvovoi",
      "vartalovoi",
      "play doh",
      "play-doh",
      "popcorn",
      "sipsi",
      "chips",
      "maissikakku",
      "piparkakku",
      "piparkakut",
      "pullaset",
      "superpuusti",
      "annospuuro",
      "jäätelö",
      "grilliperuna",
      "maustepurkki",
      "muna & voi",
      "munavoi",
      "maapähkinävoi",
      "kaakaovoi"
    ],
    "requiredAny": [
      "voi",
      "meijerivoi"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Margariinit",
    "category": "margarine",
    "variants": [
      "margariini",
      "kasvirasvalevite"
    ],
    "bannedAny": [
      "keksi"
    ],
    "requiredAny": [
      "margariini",
      "kasvirasvalevite"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Teet",
    "category": "tea",
    "variants": [
      "tee",
      "mustatee",
      "vihreä tee",
      "teepussi"
    ],
    "bannedAny": [
      "jäätee",
      "teejuoma"
    ],
    "requiredAny": [
      "tee",
      "mustatee",
      "vihreä tee",
      "teepussi"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Mehut",
    "category": "juice",
    "variants": [
      "mehu",
      "appelsiinimehu",
      "omenamehu"
    ],
    "bannedAny": [
      "mehujää",
      "mehukatti jäätelö"
    ],
    "requiredAny": [
      "mehu",
      "appelsiinimehu",
      "omenamehu"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Makkarat",
    "category": "sausage",
    "variants": [
      "makkara",
      "grillimakkara",
      "lenkkimakkara",
      "nakki"
    ],
    "bannedAny": [
      "makkarakeitto",
      "makkarakastike"
    ],
    "requiredAny": [
      "makkara",
      "grillimakkara",
      "lenkkimakkara",
      "nakki"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Leikkeleet",
    "category": "cold_cuts",
    "variants": [
      "leikkele",
      "kinkkuleikkele",
      "kalkkunaleikkele"
    ],
    "bannedAny": [
      "pizza",
      "salaatti"
    ],
    "requiredAny": [
      "leikkele",
      "kinkkuleikkele",
      "kalkkunaleikkele"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Hammastahnat",
    "category": "toothpaste",
    "variants": [
      "hammastahna"
    ],
    "bannedAny": [
      "hammasharja"
    ],
    "requiredAny": [
      "hammastahna"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Deodorantit",
    "category": "deodorant",
    "variants": [
      "deodorantti",
      "antiperspirantti"
    ],
    "bannedAny": [
      "suihkugeeli"
    ],
    "requiredAny": [
      "deodorantti",
      "antiperspirantti"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Sinapit",
    "category": "mustard",
    "variants": [
      "sinappi",
      "dijonsinappi",
      "hunajasinappi"
    ],
    "bannedAny": [
      "majoneesi",
      "sinappikastike"
    ],
    "requiredAny": [
      "sinappi",
      "dijonsinappi",
      "hunajasinappi"
    ]
  },
  {
    "label": "Majoneesit",
    "category": "mayonnaise",
    "variants": [
      "majoneesi",
      "mayonnaise",
      "majo"
    ],
    "bannedAny": [
      "sinappi",
      "salaattikastike"
    ],
    "requiredAny": [
      "majoneesi",
      "mayonnaise",
      "majo"
    ]
  },
  {
    "label": "Tomaattimurskat",
    "category": "tomato_crush",
    "variants": [
      "tomaattimurska",
      "tomaatti murska",
      "passata"
    ],
    "bannedAny": [
      "ketsuppi",
      "tomaattipyree"
    ],
    "requiredAny": [
      "tomaattimurska",
      "tomaatti murska",
      "passata"
    ]
  },
  {
    "label": "Tomaattipyreet",
    "category": "tomato_paste",
    "variants": [
      "tomaattipyree",
      "tomaattitahna"
    ],
    "bannedAny": [
      "ketsuppi",
      "tomaattimurska"
    ],
    "requiredAny": [
      "tomaattipyree",
      "tomaattitahna"
    ]
  },
  {
    "label": "Salaattikastikkeet",
    "category": "salad_dressing",
    "variants": [
      "salaattikastike",
      "salaatin kastike"
    ],
    "bannedAny": [
      "majoneesi"
    ],
    "requiredAny": [
      "salaattikastike",
      "salaatin kastike"
    ]
  },
  {
    "label": "Kaurahiutaleet",
    "category": "oatmeal",
    "variants": [
      "kaurahiutale",
      "kaurahiutaleet",
      "pikakaurahiutale"
    ],
    "bannedAny": [
      "kaurajuoma",
      "kauramaito"
    ],
    "requiredAny": [
      "kaurahiutale",
      "kaurahiutaleet",
      "pikakaurahiutale"
    ]
  },
  {
    "label": "Puurot",
    "category": "porridge",
    "variants": [
      "puuro",
      "puurohiutale",
      "mannapuuro",
      "riisipuuro"
    ],
    "bannedAny": [
      "puuropata"
    ],
    "requiredAny": [
      "puuro",
      "puurohiutale",
      "mannapuuro",
      "riisipuuro"
    ]
  },
  {
    "label": "Myslit",
    "category": "muesli",
    "variants": [
      "mysli",
      "müsli",
      "granola"
    ],
    "bannedAny": [
      "myslipatukka"
    ],
    "requiredAny": [
      "mysli",
      "müsli",
      "granola"
    ]
  },
  {
    "label": "Aamiaismurot",
    "category": "breakfast_cereal",
    "variants": [
      "aamiaismuro",
      "murot",
      "corn flakes",
      "maissihiutale"
    ],
    "bannedAny": [
      "suklaapatukka"
    ],
    "requiredAny": [
      "aamiaismuro",
      "murot",
      "corn flakes",
      "maissihiutale"
    ]
  },
  {
    "label": "Jauhot",
    "category": "flour",
    "variants": [
      "vehnäjauho",
      "ruisjauho",
      "jauhot",
      "sämpyläjauho"
    ],
    "bannedAny": [
      "jauheliha"
    ],
    "requiredAny": [
      "vehnäjauho",
      "ruisjauho",
      "jauhot",
      "sämpyläjauho"
    ]
  },
  {
    "label": "Sokerit",
    "category": "sugar",
    "variants": [
      "sokeri",
      "hillosokeri",
      "tomusokeri",
      "ruokosokeri"
    ],
    "bannedAny": [
      "sokeriton"
    ],
    "requiredAny": [
      "sokeri",
      "hillosokeri",
      "tomusokeri",
      "ruokosokeri"
    ]
  },
  {
    "label": "Suolat",
    "category": "salt",
    "variants": [
      "suola",
      "merisuola",
      "hienosuola",
      "vuorisuola"
    ],
    "bannedAny": [
      "suolapähkinä"
    ],
    "requiredAny": [
      "suola",
      "merisuola",
      "hienosuola",
      "vuorisuola"
    ]
  },
  {
    "label": "Keksit",
    "category": "cookies",
    "variants": [
      "keksi",
      "keksit",
      "digestive",
      "piparkakku"
    ],
    "bannedAny": [
      "keksijäätelö"
    ],
    "requiredAny": [
      "keksi",
      "keksit",
      "digestive",
      "piparkakku"
    ]
  },
  {
    "label": "Makeiset",
    "category": "candy",
    "variants": [
      "karkki",
      "makeiset",
      "irtokarkki",
      "lakritsi",
      "salmiakki"
    ],
    "bannedAny": [
      "karkkipussi koira"
    ],
    "requiredAny": [
      "karkki",
      "makeiset",
      "irtokarkki",
      "lakritsi",
      "salmiakki"
    ]
  },
  {
    "label": "Suklaat",
    "category": "chocolate",
    "variants": [
      "suklaalevy",
      "suklaa",
      "konvehti"
    ],
    "bannedAny": [
      "suklaamaito",
      "suklaajäätelö"
    ],
    "requiredAny": [
      "suklaalevy",
      "suklaa",
      "konvehti"
    ]
  },
  {
    "label": "Hillot",
    "category": "jam",
    "variants": [
      "hillo",
      "mansikkahillo",
      "vadelmahillo",
      "marmeladi"
    ],
    "bannedAny": [
      "hillosokeri"
    ],
    "requiredAny": [
      "hillo",
      "mansikkahillo",
      "vadelmahillo",
      "marmeladi"
    ]
  },
  {
    "label": "Hunajat",
    "category": "honey",
    "variants": [
      "hunaja",
      "juokseva hunaja"
    ],
    "bannedAny": [
      "hunajasinappi"
    ],
    "requiredAny": [
      "hunaja",
      "juokseva hunaja"
    ]
  },
  {
    "label": "Kalasäilykkeet",
    "category": "canned_fish",
    "variants": [
      "tonnikala",
      "sardiini",
      "makrilli säilyke"
    ],
    "bannedAny": [
      "tonnikalapizza"
    ],
    "requiredAny": [
      "tonnikala",
      "sardiini",
      "makrilli säilyke"
    ]
  },
  {
    "label": "Kasvissäilykkeet",
    "category": "canned_vegetables",
    "variants": [
      "säilykemaissi",
      "herne-maissi-paprika",
      "säilykeherne",
      "kidneypapu"
    ],
    "bannedAny": [
      "pakaste"
    ],
    "requiredAny": [
      "säilykemaissi",
      "herne-maissi-paprika",
      "säilykeherne",
      "kidneypapu"
    ]
  },
  {
    "label": "WC-paperit",
    "category": "toilet_paper",
    "variants": [
      "wc-paperi",
      "vessapaperi",
      "toalettipaperi"
    ],
    "bannedAny": [
      "talouspaperi"
    ],
    "requiredAny": [
      "wc-paperi",
      "vessapaperi",
      "toalettipaperi"
    ]
  },
  {
    "label": "Talouspaperit",
    "category": "paper_towels",
    "variants": [
      "talouspaperi",
      "keittiöpaperi"
    ],
    "bannedAny": [
      "wc-paperi"
    ],
    "requiredAny": [
      "talouspaperi",
      "keittiöpaperi"
    ]
  },
  {
    "label": "Pyykinpesuaineet",
    "category": "laundry_detergent",
    "variants": [
      "pyykinpesuaine",
      "pyykkipulveri",
      "pyykinpesuneste"
    ],
    "bannedAny": [
      "astianpesuaine"
    ],
    "requiredAny": [
      "pyykinpesuaine",
      "pyykkipulveri",
      "pyykinpesuneste"
    ]
  },
  {
    "label": "Astianpesuaineet",
    "category": "dishwashing",
    "variants": [
      "astianpesuaine",
      "konetiskitabletti",
      "käsitiskiaine"
    ],
    "bannedAny": [
      "pyykinpesuaine"
    ],
    "requiredAny": [
      "astianpesuaine",
      "konetiskitabletti",
      "käsitiskiaine"
    ]
  },
  {
    "label": "Saippuat",
    "category": "soap",
    "variants": [
      "saippua",
      "nestesaippua",
      "palasaippua"
    ],
    "bannedAny": [
      "astianpesuaine"
    ],
    "requiredAny": [
      "saippua",
      "nestesaippua",
      "palasaippua"
    ]
  },
  {
    "label": "Shampoot",
    "category": "shampoo",
    "variants": [
      "shampoo",
      "hiusshampoo"
    ],
    "bannedAny": [
      "suihkusaippua"
    ],
    "requiredAny": [
      "shampoo",
      "hiusshampoo"
    ]
  },
  {
    "label": "Maidot",
    "category": "milk",
    "variants": [
      "maito",
      "kevytmaito",
      "rasvaton maito",
      "täysmaito",
      "ykkösmaito",
      "laktoositon maito",
      "luomu maito",
      "pirkka maito",
      "valio maito",
      "arla maito"
    ],
    "bannedAny": [
      "maitorahka",
      "rahka",
      "kerma",
      "jogurtti",
      "jogurt",
      "kaakao",
      "suklaa",
      "kondensoitu",
      "maitojuoma",
      "proteiini",
      "latte",
      "maitojauhe",
      "cappuccino",
      "rasvaseos",
      "rasvasekoite",
      "rasvasekoitus",
      "voi",
      "levite",
      "margariini",
      "piimä",
      "piima"
    ],
    "requiredAny": [
      "maito",
      "kevytmaito",
      "rasvaton",
      "täysmaito",
      "taysmaito",
      "ykkösmaito",
      "ykkosmaito"
    ],
    "preferredAny": [
      "kevytmaito",
      "rasvaton",
      "täysmaito",
      "taysmaito",
      "ykkösmaito",
      "ykkosmaito",
      "laktoositon"
    ],
    "preferredSizes": [
      {
        "max": 1100,
        "min": 900,
        "boost": 95,
        "unitGroup": "volume"
      }
    ],
    "preferredBrands": [
      "kotimaista",
      "coop",
      "rainbow",
      "valio",
      "arla"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Piimät",
    "category": "buttermilk",
    "variants": [
      "piimä",
      "piima",
      "rasvaton piimä",
      "laktoositon piimä",
      "valio piimä",
      "kotimaista piimä"
    ],
    "bannedAny": [
      "maito",
      "kerma",
      "jogurtti",
      "jogurt",
      "rahka",
      "raejuusto",
      "juusto",
      "kaakao",
      "proteiinijuoma",
      "maitojuoma"
    ],
    "requiredAny": [
      "piimä",
      "piima"
    ],
    "preferredAny": [
      "piimä",
      "piima",
      "rasvaton",
      "laktoositon"
    ],
    "preferredSizes": [
      {
        "max": 1100,
        "min": 900,
        "boost": 95,
        "unitGroup": "volume"
      }
    ],
    "preferredBrands": [
      "valio",
      "kotimaista",
      "arla"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Ruokaöljyt",
    "category": "cooking_oil",
    "variants": [
      "öljy",
      "oljy",
      "ruokaöljy",
      "ruokaoljy",
      "rypsiöljy",
      "rypsioljy",
      "rapsiöljy",
      "rapsioljy",
      "oliiviöljy",
      "oliivioljy",
      "auringonkukkaöljy",
      "auringonkukkaoljy"
    ],
    "bannedAny": [
      "iho",
      "iholle",
      "kasvo",
      "kasvoille",
      "huuli",
      "huulikiilto",
      "arpi",
      "arville",
      "hius",
      "hiuksille",
      "vartalo",
      "hieronta",
      "hoitava",
      "kosmetiikka",
      "meikki",
      "meikinpoisto",
      "öljypohjainen",
      "oljyphjainen",
      "moottori",
      "voitelu"
    ],
    "requiredAny": [
      "öljy",
      "oljy",
      "ruokaöljy",
      "ruokaoljy",
      "rypsiöljy",
      "rypsioljy",
      "rapsiöljy",
      "rapsioljy",
      "oliiviöljy",
      "oliivioljy",
      "auringonkukkaöljy",
      "auringonkukkaoljy"
    ],
    "preferredAny": [
      "ruokaöljy",
      "ruokaoljy",
      "rypsiöljy",
      "rypsioljy",
      "rapsiöljy",
      "rapsioljy",
      "oliiviöljy",
      "oliivioljy",
      "paisto",
      "leivonta"
    ],
    "preferredSizes": [
      {
        "max": 1000,
        "min": 400,
        "boost": 45,
        "unitGroup": "volume"
      }
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Kahvit",
    "category": "coffee",
    "variants": [
      "kahvi",
      "suodatinkahvi",
      "kahvi suodatinjauhatus",
      "jauhettu kahvi",
      "juhla mokka",
      "presidentti kahvi",
      "kulta katriina",
      "paulig kahvi",
      "meira kahvi",
      "kahvipapu",
      "espresso kahvi",
      "pikakahvi"
    ],
    "bannedAny": [
      "kahvikuppi",
      "muki",
      "kahvimitta",
      "suodatinpussi",
      "kahvinkeitin",
      "energiajuoma",
      "proteiinijuoma",
      "jogurtti",
      "rahka",
      "jäätelö",
      "jaatelo",
      "patukka"
    ],
    "requiredAny": [
      "kahvi",
      "suodatinkahvi",
      "suodatinjauhatus",
      "jauhettu",
      "kahvipapu",
      "espresso",
      "pikakahvi",
      "juhla mokka",
      "presidentti",
      "kulta katriina"
    ],
    "preferredAny": [
      "suodatinkahvi",
      "suodatinjauhatus",
      "jauhettu",
      "juhla mokka",
      "presidentti",
      "kulta katriina",
      "paulig",
      "meira"
    ],
    "preferredSizes": [
      {
        "max": 550,
        "min": 400,
        "boost": 65,
        "unitGroup": "weight"
      }
    ],
    "preferredBrands": [
      "juhla mokka",
      "presidentti",
      "kulta katriina",
      "paulig",
      "meira"
    ]
  },
  {
    "label": "Cola-juomat",
    "category": "cola",
    "variants": [
      "cola",
      "coca cola",
      "coca-cola",
      "pepsi",
      "pepsi max",
      "cola zero",
      "coca cola zero",
      "virvoitusjuoma cola"
    ],
    "bannedAny": [
      "tiiviste",
      "siirappi",
      "syrup",
      "jauhe",
      "karkki",
      "makeinen",
      "jäätelö",
      "jaatelo",
      "kastike",
      "alkoholi",
      "olut",
      "siideri"
    ],
    "requiredAny": [
      "cola",
      "coca-cola",
      "coca cola",
      "pepsi",
      "pepsi max"
    ],
    "preferredAny": [
      "coca-cola",
      "coca cola",
      "pepsi",
      "pepsi max",
      "zero",
      "virvoitusjuoma"
    ],
    "parentCategory": "soft_drink",
    "preferredSizes": [
      {
        "max": 1600,
        "min": 1400,
        "boost": 42,
        "unitGroup": "volume"
      },
      {
        "max": 550,
        "min": 300,
        "boost": 24,
        "unitGroup": "volume"
      }
    ],
    "preferredBrands": [
      "coca-cola",
      "coca cola",
      "pepsi",
      "pepsi max"
    ]
  },
  {
    "label": "Ketsupit",
    "category": "ketchup",
    "variants": [
      "ketsuppi",
      "ketchup",
      "tomaattiketsuppi",
      "tomaatti ketsuppi"
    ],
    "bannedAny": [
      "sipsi",
      "maustettu",
      "dippi",
      "majoneesi",
      "sinappi",
      "kastikejauhe",
      "mausteseos"
    ],
    "requiredAny": [
      "ketsuppi",
      "ketchup"
    ],
    "preferredAny": [
      "ketsuppi",
      "ketchup",
      "tomaattiketsuppi"
    ],
    "preferredSizes": [
      {
        "max": 1100,
        "min": 400,
        "boost": 25,
        "unitGroup": "weight"
      }
    ]
  },
  {
    "label": "Juustot",
    "category": "cheese",
    "variants": [
      "juusto",
      "edam juusto",
      "emmental juusto",
      "oltermanni",
      "kermajuusto",
      "viipalejuusto",
      "raastejuusto"
    ],
    "bannedAny": [
      "tuorejuusto",
      "sulatejuusto",
      "raejuusto",
      "juustodippi",
      "dippi",
      "nacho",
      "kastike"
    ],
    "requiredAny": [
      "juusto",
      "edam",
      "emmental",
      "gouda",
      "oltermanni"
    ],
    "preferredAny": [
      "viipale",
      "raaste",
      "kermajuusto",
      "edam",
      "emmental",
      "oltermanni"
    ],
    "preferredSizes": [
      {
        "max": 1000,
        "min": 350,
        "boost": 35,
        "unitGroup": "weight"
      }
    ],
    "preferredBrands": [
      "valio",
      "arla",
      "kotimaista",
      "pirkka",
      "oltermanni"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Jogurtit",
    "category": "yogurt",
    "variants": [
      "jogurtti",
      "jogurt",
      "maustamaton jogurtti",
      "turkkilainen jogurtti",
      "kreikkalainen jogurtti",
      "jogurtti 1kg"
    ],
    "bannedAny": [
      "rahka",
      "vanukas",
      "proteiinijuoma",
      "raejuusto",
      "tuorejuusto",
      "jäätelö",
      "jaatelo"
    ],
    "requiredAny": [
      "jogurtti",
      "jogurt"
    ],
    "preferredAny": [
      "maustamaton",
      "turkkilainen",
      "kreikkalainen"
    ],
    "preferredSizes": [
      {
        "max": 1100,
        "min": 750,
        "boost": 35,
        "unitGroup": "weight"
      }
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Jauhelihat ja lihat",
    "category": "meat",
    "variants": [
      "liha",
      "jauheliha",
      "naudan jauheliha",
      "sika-nauta jauheliha",
      "broilerin jauheliha",
      "jauheliha 400g"
    ],
    "bannedAny": [
      "kastike",
      "keitto",
      "ateria",
      "pizza",
      "piirakka"
    ],
    "requiredAny": [
      "jauheliha",
      "nauta",
      "sika-nauta",
      "broilerin jauheliha"
    ],
    "preferredAny": [
      "jauheliha",
      "naudan",
      "sika-nauta"
    ],
    "preferredSizes": [
      {
        "max": 450,
        "min": 300,
        "boost": 45,
        "unitGroup": "weight"
      }
    ],
    "preferredBrands": [
      "atria",
      "hk",
      "snellman",
      "kotimaista"
    ]
  },
  {
    "label": "Kananmunat",
    "category": "egg",
    "variants": [
      "kananmuna",
      "kananmunat",
      "kananmunia",
      "munat",
      "kananmuna 10 kpl",
      "kananmunat 10 kpl",
      "vapaan kanan munat",
      "luomu kananmunat"
    ],
    "bannedAny": [
      "suklaa",
      "pääsiäis",
      "paasiais",
      "yllätys",
      "yllatys",
      "makeinen",
      "karkki",
      "lelu",
      "majoneesi",
      "munavoi",
      "munakas",
      "kastike",
      "nuudeli",
      "pasta"
    ],
    "requiredAny": [
      "kananmuna",
      "kananmunat",
      "kananmunia",
      "munat"
    ],
    "preferredAny": [
      "kananmuna",
      "kananmunat",
      "kananmunia",
      "munat",
      "10 kpl",
      "15 kpl",
      "6 kpl"
    ],
    "preferredSizes": [
      {
        "max": 0,
        "min": 0,
        "boost": 0,
        "unitGroup": "weight"
      }
    ],
    "preferredBrands": [
      "kotimaista",
      "pirkka",
      "k-menu",
      "munax",
      "dava"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Kana ja broileri",
    "category": "chicken",
    "variants": [
      "kana",
      "broileri",
      "kanasuikale",
      "broilerisuikale",
      "broilerin fileesuikale",
      "kanan filee"
    ],
    "bannedAny": [
      "kastike",
      "keitto",
      "pizza",
      "salaatti",
      "ateria"
    ],
    "requiredAny": [
      "kana",
      "broileri",
      "kanasuikale",
      "broilerisuikale",
      "fileesuikale"
    ],
    "preferredAny": [
      "suikale",
      "filee",
      "broileri"
    ],
    "preferredSizes": [
      {
        "max": 700,
        "min": 300,
        "boost": 35,
        "unitGroup": "weight"
      }
    ]
  },
  {
    "label": "Leivät",
    "category": "bread",
    "variants": [
      "leipä",
      "ruisleipä",
      "paahtoleipä",
      "kauraleipä",
      "sämpylä",
      "rieska"
    ],
    "bannedAny": [
      "keksi",
      "pullapitko",
      "kakku",
      "muro"
    ],
    "requiredAny": [
      "leipä",
      "leipa",
      "ruis",
      "paahto",
      "kaura",
      "sämpylä",
      "sampyla",
      "rieska"
    ],
    "preferredAny": [
      "ruisleipä",
      "paahtoleipä",
      "kauraleipä",
      "sämpylä"
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Pastat",
    "category": "pasta",
    "variants": [
      "pasta",
      "spagetti",
      "makaroni",
      "fusilli",
      "penne",
      "lasagnelevy"
    ],
    "bannedAny": [
      "kastike",
      "ateria",
      "salaatti"
    ],
    "requiredAny": [
      "pasta",
      "spagetti",
      "makaroni",
      "fusilli",
      "penne",
      "lasagne"
    ],
    "preferredAny": [
      "spagetti",
      "makaroni",
      "fusilli",
      "penne"
    ],
    "preferredSizes": [
      {
        "max": 1000,
        "min": 400,
        "boost": 35,
        "unitGroup": "weight"
      }
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Riisit",
    "category": "rice",
    "variants": [
      "riisi",
      "jasmiiniriisi",
      "basmatiriisi",
      "pitkäjyväinen riisi",
      "puuroriisi"
    ],
    "bannedAny": [
      "ateria",
      "salaatti",
      "riisipiirakka"
    ],
    "requiredAny": [
      "riisi",
      "jasmiini",
      "basmati",
      "pitkäjyväinen",
      "pitkajyvainen",
      "puuroriisi"
    ],
    "preferredAny": [
      "jasmiini",
      "basmati",
      "pitkäjyväinen",
      "puuroriisi"
    ],
    "preferredSizes": [
      {
        "max": 1100,
        "min": 900,
        "boost": 35,
        "unitGroup": "weight"
      }
    ],
    "ownBrandFriendly": true
  },
  {
    "label": "Hedelmät ja vihannekset",
    "category": "fruit_veg",
    "variants": [
      "banaani",
      "omena",
      "tomaatti",
      "kurkku",
      "peruna",
      "sipuli",
      "porkkana",
      "mandariini"
    ],
    "bannedAny": [
      "mehu",
      "sose",
      "hillo",
      "kastike",
      "karkki"
    ],
    "requiredAny": [
      "banaani",
      "omena",
      "tomaatti",
      "kurkku",
      "peruna",
      "sipuli",
      "porkkana",
      "mandariini"
    ],
    "preferredAny": [
      "suomi",
      "kotimainen",
      "luomu"
    ]
  },
  {
    "label": "Pakasteet",
    "category": "frozen",
    "variants": [
      "pakaste",
      "kalapuikot",
      "ranskanperunat"
    ],
    "bannedAny": [
      "tuore",
      "säilyke",
      "sailyke"
    ],
    "requiredAny": [
      "pakaste",
      "kalapuikko",
      "kalapuikot",
      "ranskanperuna",
      "ranskanperunat",
      "jäätelö",
      "jaatelo"
    ],
    "preferredAny": [
      "pakaste",
      "kalapuikot",
      "ranskanperunat"
    ]
  },
  {
    "label": "Herkut ja naposteltavat",
    "category": "snacks",
    "variants": [
      "sipsit",
      "chips",
      "tortilla chips",
      "suolapähkinä"
    ],
    "bannedAny": [
      "kastike",
      "dippi",
      "jogurtti"
    ],
    "requiredAny": [
      "sipsi",
      "chips",
      "tortilla",
      "karkki",
      "suklaa",
      "keksi"
    ],
    "preferredAny": [
      "sipsi",
      "chips",
      "tortilla",
      "suklaa"
    ]
  }
];
