// src/app/components/ziiply/offerSearch/providers/kruokaProvider.ts
// ZIIPLY_KRUOKA_PROVIDER_V31_HTML_FIXTURE_DEBUG_NULL_SAFE
//
// DEV/fixture-debug: EI tee yhtään verkkokutsua K-Ruokaan.
// Syy: Vercel/server fetch saa K-Ruoalta Cloudflare 403:n, ja browser-fetch Ziiply-originista voi kaatua CORSiin.
// Tämä versio käyttää käyttäjän ottamasta K-Ruoka tarjouslehden HTML:stä purettua applicationState-fixtureä.
// Tarkoitus: varmistaa Göstan UI, K-tarjouskorttien normalisointi, hinnat, kuvat, EANit ja tarjouskorttien näyttö.
// Kun tämä näyttää kortit oikein, fixture korvataan myöhemmin Playwright/proxy-lähteellä.

import type {
  ZiiplyOfferSearchResult,
  ZiiplyOfferSearchSourceConfig,
} from "../types";

export type KruokaOfferProviderOptionsV10 = {
  storeId?: string | number | null;
  storeName?: string | null;
  kStoreId?: string | number | null;
  kStoreName?: string | null;
};

type FixtureOffer = {
  Id?: string;
  Name?: string;
  ProductName?: string;
  Brand?: string | null;
  Price?: number | string | null;
  DiscountPrice?: string | null;
  AdditionalInfo?: string | null;
  DiscountUnitPrice?: string | null;
  UnitPriceUnit?: string | null;
  Unit?: string | null;
  Image?: string | null;
  Eans?: string[];
  ValidFrom?: string | null;
  ValidUntil?: string | null;
  IsPlussaOffer?: boolean;
  isBatchOffer?: boolean;
  isSetOffer?: boolean;
  OfferMedia?: string[];
};

const FIXTURE_STORE_ID = "L654";
const FIXTURE_SOURCE = "K-Market tarjouslehti / applicationState fixture";
const FIXTURE_OFFERS: FixtureOffer[] = [
  {
    "Id": "310488P",
    "Name": "HK Viljaporsaan fileepihvit 600-640 g",
    "ProductName": "Viljaporsaan fileepihvit 600-640 g",
    "Brand": "HK",
    "Price": 6.99,
    "DiscountPrice": "6,99",
    "AdditionalInfo": "(10,92-11,65/kg)",
    "DiscountUnitPrice": "10,92-11,65",
    "UnitPriceUnit": "kg",
    "Unit": "rs",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313323/be2cfa67-2cb9-4f55-9355-945e5c8f5f8f",
    "Eans": [
      "6409100032401",
      "6409100032944",
      "6409100033781",
      "6409100034757"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU"
    ]
  },
  {
    "Id": "310493P",
    "Name": "Atria kanan minuuttifileet 190-260 g",
    "ProductName": "Kanan minuuttifileet 190-260 g",
    "Brand": "Atria",
    "Price": 2.99,
    "DiscountPrice": "2,99",
    "AdditionalInfo": "(11,50-15,74/kg)",
    "DiscountUnitPrice": "11,50-15,74",
    "UnitPriceUnit": "kg",
    "Unit": "rs",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313328/e91ea874-f833-4bec-b0eb-b6cb5478a1d2",
    "Eans": [
      "6407800019395",
      "6407800019425",
      "6407800019463",
      "6407800019616"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU",
      "SÄHKÖINEN ASIAKASKIRJE"
    ]
  },
  {
    "Id": "310444P",
    "Name": "Atria Hiillos grillimakkarat 400 g tai makkarapihvi 320 g",
    "ProductName": "Hiillos grillimakkarat 400 g tai makkarapihvi 320 g",
    "Brand": "Atria",
    "Price": 2.48,
    "DiscountPrice": "2,48",
    "AdditionalInfo": "(6,20-7,75/kg)",
    "DiscountUnitPrice": "6,20-7,75",
    "UnitPriceUnit": "kg",
    "Unit": "kpl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313282/19b2c4e5-0055-433c-84ab-ba699ae12524",
    "Eans": [
      "6407870070227",
      "6407870074881",
      "6407870075512",
      "6407870077141",
      "6407880080582"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU"
    ]
  },
  {
    "Id": "310446P",
    "Name": "Hetki Suosikkisalaatit 220-280 g ",
    "ProductName": "Hetki Suosikkisalaatit 220-280 g ",
    "Brand": "Fresh",
    "Price": 3.97,
    "DiscountPrice": "3,97",
    "AdditionalInfo": "(14,18-18,05/kg)",
    "DiscountUnitPrice": "14,18-18,05",
    "UnitPriceUnit": "kg",
    "Unit": "rs",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313284/28205fee-de41-4954-a581-4b1cabb52255",
    "Eans": [
      "6406510091196",
      "6406510094562",
      "6406510094852",
      "6406510096474",
      "6406510096719",
      "6406510096726",
      "6406510096795",
      "6406510096801",
      "6406510096818",
      "6406510701361",
      "6406510702429",
      "6406510702702",
      "6406510703952"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU"
    ]
  },
  {
    "Id": "310497P",
    "Name": "Vaasan Ruispalat 12 kpl/660 g",
    "ProductName": "Ruispalat 12 kpl/660 g",
    "Brand": "Vaasan",
    "Price": 2.24,
    "DiscountPrice": "2,24",
    "AdditionalInfo": "(3,39/kg)",
    "DiscountUnitPrice": "3,39",
    "UnitPriceUnit": "kg",
    "Unit": "ps",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313332/12dcbb35-25b6-4f95-b850-b75a5cdc2db2",
    "Eans": [
      "6437002001454"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU"
    ]
  },
  {
    "Id": "310467P",
    "Name": "Pingviini laktoosittomat maustetut kermajäätelöt 1 l",
    "ProductName": "Laktoosittomat maustetut kermajäätelöt 1 l",
    "Brand": "Pingviini",
    "Price": 2.99,
    "DiscountPrice": "2,99",
    "AdditionalInfo": "Ei vanilja. (2,99/l)",
    "DiscountUnitPrice": "2,99",
    "UnitPriceUnit": "l",
    "Unit": "kpl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313302/8ef34047-5191-413a-9990-e6dca938637c",
    "Eans": [
      "6430064400890",
      "6430064401439",
      "6430064405048",
      "6430064405055",
      "6430064407554",
      "6430064407707",
      "6430064408001",
      "6430064408049",
      "6430064408445",
      "6430064408506"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU"
    ]
  },
  {
    "Id": "310477P",
    "Name": "Pingviini maustetut kermajäätelöt 1 l",
    "ProductName": "Maustetut kermajäätelöt 1 l",
    "Brand": "Pingviini",
    "Price": 2.25,
    "DiscountPrice": "2,25",
    "AdditionalInfo": "Ei laktoosittomat eikä vanilja. (2,25/l)",
    "DiscountUnitPrice": "2,25",
    "UnitPriceUnit": "l",
    "Unit": "pkt",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313312/c8d11829-bfca-497e-ba69-a2564ed84c93",
    "Eans": [
      "6430064403624",
      "6430064403631",
      "6430064403648",
      "6430064403662",
      "6430064403679",
      "6430064403686"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, ETUSIVU",
      "SÄHKÖINEN ASIAKASKIRJE"
    ]
  },
  {
    "Id": "333366P",
    "Name": "Pirkka kirsikka 500 g, Kreikka",
    "ProductName": "Kirsikka 500 g, Kreikka",
    "Brand": "Pirkka",
    "Price": 2.89,
    "DiscountPrice": "2,89",
    "AdditionalInfo": "(5,78/kg)",
    "DiscountUnitPrice": "5,78",
    "UnitPriceUnit": "kg",
    "Unit": "rs",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200085938_P333563/60065250-d06d-4cb8-898c-32d880d66f8b",
    "Eans": [
      "6410405123657",
      "8420982902253"
    ],
    "ValidFrom": "2026-06-29T00:00:00+03:00",
    "ValidUntil": "2026-07-05T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "SÄHKÖINEN ASIAKASKIRJE",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "333373P",
    "Name": "Pirkka syöntikypsä mango, Brasilia / Chile",
    "ProductName": "Syöntikypsä mango, Brasilia / Chile",
    "Brand": "Pirkka",
    "Price": 3.99,
    "DiscountPrice": "3,99",
    "AdditionalInfo": "(3,99/kg)",
    "DiscountUnitPrice": "3,99",
    "UnitPriceUnit": "kg",
    "Unit": "kg",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200085938_P333569/21372997-a0db-48b4-a0ea-e4e8e1eeb843",
    "Eans": [
      "2000326600005"
    ],
    "ValidFrom": "2026-06-29T00:00:00+03:00",
    "ValidUntil": "2026-07-05T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "SÄHKÖINEN ASIAKASKIRJE",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "333367P",
    "Name": "Pirkka suippopaprika 200 g, Alankomaat / Belgia / Espanja",
    "ProductName": "Suippopaprika 200 g, Alankomaat / Belgia / Espanja",
    "Brand": "Pirkka",
    "Price": 1.29,
    "DiscountPrice": "1,29",
    "AdditionalInfo": "(6,45/kg)",
    "DiscountUnitPrice": "6,45",
    "UnitPriceUnit": "kg",
    "Unit": "kpl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200085938_P333564/319360da-1159-49d1-a5ca-2f8e4fbd6f8e",
    "Eans": [
      "6410405051844"
    ],
    "ValidFrom": "2026-06-29T00:00:00+03:00",
    "ValidUntil": "2026-07-05T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "SÄHKÖINEN ASIAKASKIRJE",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "333363P",
    "Name": "Järvikylä Nopsa salaattisekoitus 40 g, Suomi",
    "ProductName": "Nopsa salaattisekoitus 40 g, Suomi",
    "Brand": "Järvikylä",
    "Price": 2,
    "DiscountPrice": "2,00",
    "AdditionalInfo": "(25,00/kg)",
    "DiscountUnitPrice": "25,00",
    "UnitPriceUnit": "kg",
    "Unit": "2 ps",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200085938_01/1621d632-30ca-433d-b18a-37f945ac712a",
    "Eans": [
      "6416046731305"
    ],
    "ValidFrom": "2026-06-29T00:00:00+03:00",
    "ValidUntil": "2026-07-05T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "SÄHKÖINEN ASIAKASKIRJE",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "333371P",
    "Name": "Pirkka Amppari kesäkukkakimppu, Alankomaat",
    "ProductName": "Amppari kesäkukkakimppu, Alankomaat",
    "Brand": "Pirkka",
    "Price": 9.9,
    "DiscountPrice": "9,90",
    "AdditionalInfo": null,
    "DiscountUnitPrice": null,
    "UnitPriceUnit": "kpl",
    "Unit": "pack",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200085939_P333568/d65b49f1-8a60-480f-99a5-56e1f3d2c9c6",
    "Eans": [
      "6410405330802"
    ],
    "ValidFrom": "2026-07-02T00:00:00+03:00",
    "ValidUntil": "2026-07-05T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "SÄHKÖINEN ASIAKASKIRJE",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "310451P",
    "Name": "Via mikroateriat 320-335 g",
    "ProductName": "Via mikroateriat 320-335 g",
    "Brand": "HK",
    "Price": 3.97,
    "DiscountPrice": "3,97",
    "AdditionalInfo": "(11,85-12,41/kg)",
    "DiscountUnitPrice": "11,85-12,41",
    "UnitPriceUnit": "kg",
    "Unit": "rs",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313289/c74a07e1-d7ef-4c1a-bbfe-e7f3e7feb3dc",
    "Eans": [
      "6409100062071",
      "6409100070311",
      "6409100070328",
      "6409100070434",
      "6409100071257",
      "6409100071288",
      "6409100071356",
      "6409100071899",
      "6409100072070",
      "6409100078034"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "310496P",
    "Name": "Vaasan kauratyynyt 6 kpl/360 g",
    "ProductName": "Kauratyynyt 6 kpl/360 g",
    "Brand": "Vaasan",
    "Price": 1.58,
    "DiscountPrice": "1,58",
    "AdditionalInfo": "Ei täysjyvä  (4,14/kg)",
    "DiscountUnitPrice": "4,39",
    "UnitPriceUnit": "kg",
    "Unit": "ps",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313331/e31f5bf8-cc86-4a2c-adaf-600eafe19f02",
    "Eans": [
      "6437005053368"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU",
      "SÄHKÖINEN ASIAKASKIRJE"
    ]
  },
  {
    "Id": "317001P",
    "Name": "Valio Hedelmätarha mehut 1l",
    "ProductName": "Hedelmätarha mehut 1l",
    "Brand": "Valio",
    "Price": 2.99,
    "DiscountPrice": "2,99",
    "AdditionalInfo": "Mandariini-hedelmä-, tropiikki-, mansikka-raparperi-, omena-mango-, luomuomena- tai luomumustikkamehut (2,99/l)",
    "DiscountUnitPrice": "2,99",
    "UnitPriceUnit": "l",
    "Unit": "tlk",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P318944/bdcc5c1e-626e-4b05-9498-b202c8a3d674",
    "Eans": [
      "6408430061587",
      "6408430061686",
      "6408430670307",
      "6408430690190",
      "6408430690367",
      "6408430690510"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "317007P",
    "Name": "Valio Hedelmätarha puolukka- tai appelsiinimehu 1 l",
    "ProductName": "Hedelmätarha puolukka- tai appelsiinimehu 1 l",
    "Brand": "Valio",
    "Price": 2.89,
    "DiscountPrice": "2,89",
    "AdditionalInfo": "(2,89/l)",
    "DiscountUnitPrice": "2,89",
    "UnitPriceUnit": "l",
    "Unit": "tlk",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P318952/15a2496c-bc4b-4caf-b4bc-f9f81c95eac1",
    "Eans": [
      "6408430671120",
      "6408430671168"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "310486P",
    "Name": "Valio laktoositon Play maitokaakaojuomat 1 l tai Valio Latte maitokahvijuomat 1 l",
    "ProductName": "Laktoositon Play maitokaakaojuomat 1 l tai Valio Latte maitokahvijuomat 1 l",
    "Brand": "Valio",
    "Price": 2.89,
    "DiscountPrice": "2,89",
    "AdditionalInfo": "Ei plus. (2,89/l)",
    "DiscountUnitPrice": "2,89",
    "UnitPriceUnit": "l",
    "Unit": "tlk",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313321/d163e3c0-f1f5-43fe-92d7-44a21ebad024",
    "Eans": [
      "6408430046652",
      "6408430048441",
      "6408430102822",
      "6408430103256",
      "6408430103447"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "310465P",
    "Name": "Valio Hyvä suomalainen Arkirae 450-500 g",
    "ProductName": "Hyvä suomalainen Arkirae 450-500 g",
    "Brand": "Valio",
    "Price": 2.89,
    "DiscountPrice": "2,89",
    "AdditionalInfo": "(5,78-6,42/kg)",
    "DiscountUnitPrice": "5,78-6,42",
    "UnitPriceUnit": "kg",
    "Unit": "rs",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313301/18a3286b-3e1b-41b1-bc6c-62fcdb2f1e99",
    "Eans": [
      "6408430043200",
      "6408430141487",
      "6408430142798"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "310475P",
    "Name": "Valiojogurtti laktoositon 1 kg, myös rasvaton ja juotava 0,95 l",
    "ProductName": "Valiojogurtti laktoositon 1 kg, myös rasvaton ja juotava 0,95 l",
    "Brand": "Valio",
    "Price": 1.99,
    "DiscountPrice": "1,99",
    "AdditionalInfo": "Ei A+, Balans eikä Luomu (1,99-2,09/kg)",
    "DiscountUnitPrice": "1,99-2,09",
    "UnitPriceUnit": "kg",
    "Unit": "tlk",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313310/102a191c-ed1b-41e0-81f9-e1292a28c9b3",
    "Eans": [
      "6408430020072",
      "6408430020539",
      "6408430021024",
      "6408430021031",
      "6408430021048",
      "6408430023431",
      "6408430024933",
      "6408430026432",
      "6408430401215",
      "6408430401277",
      "6408430401444",
      "6408430401611",
      "6408430408665",
      "6408430408832"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU",
      "SÄHKÖINEN ASIAKASKIRJE"
    ]
  },
  {
    "Id": "310489P",
    "Name": "Valio Oltermanni kermajuustopalat 450-500 g",
    "ProductName": "Oltermanni kermajuustopalat 450-500 g",
    "Brand": "Valio",
    "Price": 4.93,
    "DiscountPrice": "4,93",
    "AdditionalInfo": "(9,86-10,96/kg)",
    "DiscountUnitPrice": "9,86-10,96",
    "UnitPriceUnit": "kg",
    "Unit": "pkt",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_P313324/a07928c1-3ecb-426a-8f71-ecb6b8973239",
    "Eans": [
      "6408430033805",
      "6408430039371"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": false,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU"
    ]
  },
  {
    "Id": "310466P",
    "Name": "Coca-Cola, Fanta ja Sprite virvoitusjuomat sekä Bonaqua kivennäisvedet 0,5 l/pl",
    "ProductName": "Coca-Cola, Fanta, Sprite virvoitusjuomat sekä Bonaqua kivennäisvedet 0,5 l/pl",
    "Brand": null,
    "Price": 4,
    "DiscountPrice": "4,00",
    "AdditionalInfo": "(3,60/l) sis. pantit 0,40",
    "DiscountUnitPrice": "3,60",
    "UnitPriceUnit": "l",
    "Unit": "2 pl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200084511_01/4833cdd4-a19d-4bcf-8553-7d7dd56d34e0",
    "Eans": [
      "0000057095431",
      "6415600501781",
      "6415600502054",
      "6415600506434",
      "6415600545754",
      "6415600546072",
      "6415600546126",
      "6415600546157",
      "6415600546188",
      "6415600546607",
      "6415600549493",
      "6415600555722",
      "6415600563697",
      "6415600564878",
      "6415600570992",
      "6415600571081",
      "6415600574488",
      "6415600577632",
      "6415600577861",
      "6415600581301",
      "6415600581776",
      "6415600584661",
      "6415600587457",
      "6415600591843",
      "6415600592239",
      "6415600594684",
      "6415600594868"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": false,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, SISÄSIVU",
      "SÄHKÖINEN ASIAKASKIRJE"
    ]
  },
  {
    "Id": "316761P",
    "Name": "Pirkka ohukaiset 400 g",
    "ProductName": "Ohukaiset 400 g",
    "Brand": "Pirkka",
    "Price": 4,
    "DiscountPrice": "4,00",
    "AdditionalInfo": "(5,00/kg)",
    "DiscountUnitPrice": "5,00",
    "UnitPriceUnit": "kg",
    "Unit": "2 kpl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_11/5f7f4e24-84f6-4142-8c88-92e4ac6cce9d",
    "Eans": [
      "6410400032848",
      "6410400032855",
      "6410400049013",
      "6410402007059"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316764P",
    "Name": "Pirkka juustoburgeri 2 kpl/280 g",
    "ProductName": "Juustoburgeri 2 kpl/280 g",
    "Brand": "Pirkka",
    "Price": 5,
    "DiscountPrice": "5,00",
    "AdditionalInfo": "(8,93/kg)",
    "DiscountUnitPrice": "8,93",
    "UnitPriceUnit": "kg",
    "Unit": "2 kpl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_13/05781652-0837-45c0-97ba-15c2123ec94e",
    "Eans": [
      "6410405050458"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316747P",
    "Name": "Pirkka Parhaat smoothiet 250 ml",
    "ProductName": "Parhaat smoothiet 250 ml",
    "Brand": "Pirkka",
    "Price": 4.5,
    "DiscountPrice": "4,50",
    "AdditionalInfo": "(8,60/l) sis. pantit 0,20",
    "DiscountUnitPrice": "8,60",
    "UnitPriceUnit": "l",
    "Unit": "2 pl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_02/35c83daf-6ee3-4c7c-af7d-e720cb43c997",
    "Eans": [
      "6410405199874",
      "6410405199898",
      "6410405199911",
      "6410405199935",
      "6410405328854",
      "6410405328885"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316760P",
    "Name": "Pirkka laktoosittomat kermaviilit 200 g",
    "ProductName": "Laktoosittomat kermaviilit 200 g",
    "Brand": "Pirkka",
    "Price": 1.5,
    "DiscountPrice": "1,50",
    "AdditionalInfo": "(3,75/kg)",
    "DiscountUnitPrice": "3,75",
    "UnitPriceUnit": "kg",
    "Unit": "2 prk",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_03/2625855d-8792-47ea-a75a-a5af732ba0e9",
    "Eans": [
      "6410405323521",
      "6410405358202"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316753P",
    "Name": "Pirkka emmental-mozzarella juustoraaste 150 g",
    "ProductName": "Emmental-mozzarella juustoraaste 150 g",
    "Brand": "Pirkka",
    "Price": 4,
    "DiscountPrice": "4,00",
    "AdditionalInfo": "(13,33/kg)",
    "DiscountUnitPrice": "13,33",
    "UnitPriceUnit": "kg",
    "Unit": "2 ps",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_05/50bbff27-8128-4613-ab0f-e493437c1600",
    "Eans": [
      "6410405048561"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316750P",
    "Name": "Pirkka mozzarellatikut tai cheddar-jalapenot 250 g",
    "ProductName": "Mozzarellatikut tai cheddar-jalapenot 250 g",
    "Brand": "Pirkka",
    "Price": 7,
    "DiscountPrice": "7,00",
    "AdditionalInfo": "Pakaste (14,00/kg)",
    "DiscountUnitPrice": "14,00",
    "UnitPriceUnit": "kg",
    "Unit": "2 pkt",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_16/4828b075-7354-490c-8534-edaf89215b71",
    "Eans": [
      "6410405053749",
      "6410405053763",
      "6410405355461",
      "6410405355492"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316746P",
    "Name": "Pirkka Amppari tuoteperheen juomajäät 83 g",
    "ProductName": "Amppari tuoteperheen juomajäät 83 g",
    "Brand": "Pirkka",
    "Price": 1,
    "DiscountPrice": "1,00",
    "AdditionalInfo": "(6,02/kg)",
    "DiscountUnitPrice": "6,02",
    "UnitPriceUnit": "kg",
    "Unit": "2 kpl",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083863_10/6149fa86-2e94-4a44-96a6-cbb4fb94c50b",
    "Eans": [
      "6410405251411",
      "6410405251435",
      "6410405251459",
      "6410405251473",
      "6410405251497",
      "6410405261038",
      "6410405303172"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316730P",
    "Name": "Pirkka valmisriisit 250 g",
    "ProductName": "Valmisriisit 250 g",
    "Brand": "Pirkka",
    "Price": 3,
    "DiscountPrice": "3,00",
    "AdditionalInfo": "(6,00/kg)",
    "DiscountUnitPrice": "6,00",
    "UnitPriceUnit": "kg",
    "Unit": "2 ps",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083862_02/78967c61-90d6-4a6d-84ec-728d07c10db0",
    "Eans": [
      "6410405222893",
      "6410405222916",
      "6410405222930",
      "6410405222954"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  },
  {
    "Id": "316732P",
    "Name": "Pirkka kuppinuudelit 65 g",
    "ProductName": "Kuppinuudelit 65 g",
    "Brand": "Pirkka",
    "Price": 4,
    "DiscountPrice": "4,00",
    "AdditionalInfo": "(15,38/kg)",
    "DiscountUnitPrice": "15,38",
    "UnitPriceUnit": "kg",
    "Unit": "4 prk",
    "Image": "https://public.keskofiles.com/f/k-ruoka-offers/200083862_26/1f8fa838-0166-4da2-b104-4028c7899828",
    "Eans": [
      "6410405364920",
      "6410405364951",
      "6410405364982",
      "6410405365019"
    ],
    "ValidFrom": "2026-05-04T00:00:00+03:00",
    "ValidUntil": "2026-08-26T23:59:59+03:00",
    "IsPlussaOffer": true,
    "isBatchOffer": true,
    "isSetOffer": false,
    "OfferMedia": [
      "HYLLYNPÄÄTY",
      "DIGILEHTI, TAKASIVU"
    ]
  }
];

function normalizeStoreId(options?: KruokaOfferProviderOptionsV10): string | null {
  const raw = options?.kStoreId ?? options?.storeId ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw);
}

function normalizeStoreName(options?: KruokaOfferProviderOptionsV10): string {
  return String(options?.kStoreName ?? options?.storeName ?? "K-Ruoka fixture");
}

function asDebugResult(args: {
  id: string;
  title: string;
  detail?: string;
  storeId?: string | null;
  storeName?: string | null;
  debug?: unknown;
}): ZiiplyOfferSearchResult {
  const title = args.detail ? `${args.title} — ${args.detail}` : args.title;

  return {
    id: `k-debug-v30-${args.id}`,
    title,
    name: title,
    price: null,
    unitPrice: null,
    imageUrl: null,
    storeId: args.storeId ?? FIXTURE_STORE_ID,
    storeName: args.storeName ?? "K DEBUG",
    chain: "K-Ruoka",
    source: "kruoka",
    provider: "kruoka",
    url: "https://www.k-ruoka.fi/k-market/tarjouslehti",
    debug: args.debug ?? null,
  } as unknown as ZiiplyOfferSearchResult;
}

function toPrice(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function toOfferResult(args: {
  offer: FixtureOffer;
  index: number;
  storeId: string | null;
  storeName: string;
}): ZiiplyOfferSearchResult {
  const offerId = String(args.offer.Id ?? `fixture-${args.index}`);
  const name = String(args.offer.Name ?? args.offer.ProductName ?? "K-Ruoka tarjous");
  const eans = (args.offer.Eans ?? []).map(String);
  const price = toPrice(args.offer.Price ?? args.offer.DiscountPrice ?? null);

  return {
    id: `kruoka-v31-fixture-${offerId}-${args.index}`,
    title: name,
    name,
    price,
    unitPrice: args.offer.DiscountUnitPrice ?? null,
    unitPriceUnit: args.offer.UnitPriceUnit ?? null,
    imageUrl: args.offer.Image ?? null,
    storeId: args.storeId ?? FIXTURE_STORE_ID,
    storeName: args.storeName,
    chain: "K-Ruoka",
    source: "kruoka",
    provider: "kruoka",
    offerId,
    ean: eans[0] ?? null,
    eans,
    brand: args.offer.Brand ?? null,
    unit: args.offer.Unit ?? null,
    additionalInfo: args.offer.AdditionalInfo ?? null,
    validFrom: args.offer.ValidFrom ?? null,
    validUntil: args.offer.ValidUntil ?? null,
    isPlussaOffer: Boolean(args.offer.IsPlussaOffer),
    url: `https://www.k-ruoka.fi/k-market/tarjouslehti?tarjous=${encodeURIComponent(offerId)}`,
    debug: {
      fixture: true,
      fixtureSource: FIXTURE_SOURCE,
      rawOffer: args.offer,
      eanCount: eans.length,
    },
  } as unknown as ZiiplyOfferSearchResult;
}

function matchesQuery(offer: FixtureOffer, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    offer.Id,
    offer.Name,
    offer.ProductName,
    offer.Brand,
    offer.AdditionalInfo,
    ...(offer.Eans ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export async function fetchKruokaOffers(
  query: string,
  _source: ZiiplyOfferSearchSourceConfig,
  options?: KruokaOfferProviderOptionsV10,
): Promise<ZiiplyOfferSearchResult[]> {
  const wantedStoreId = normalizeStoreId(options);
  const storeName = normalizeStoreName(options);
  const totalEans = new Set(FIXTURE_OFFERS.flatMap((offer) => offer.Eans ?? [])).size;

  const debugCards: ZiiplyOfferSearchResult[] = [
    asDebugResult({
      id: "01-fixture-mode",
      title: "[K DEBUG V30] fixture käytössä",
      detail: "ei K-Ruoka verkkokutsuja",
      storeId: wantedStoreId,
      storeName,
    }),
    asDebugResult({
      id: "02-counts",
      title: "[K DEBUG V30] applicationState fixture OK",
      detail: `offers=${FIXTURE_OFFERS.length}, uniqueEans=${totalEans}, fixtureStore=${FIXTURE_STORE_ID}`,
      storeId: wantedStoreId,
      storeName,
    }),
    asDebugResult({
      id: "03-selected-store",
      title: "[K DEBUG V30] valittu kauppa",
      detail: `wanted=${wantedStoreId ?? "NULL"}, name=${storeName}`,
      storeId: wantedStoreId,
      storeName,
      debug: { options },
    }),
  ];

  const offers = FIXTURE_OFFERS
    .filter((offer) => matchesQuery(offer, query))
    .slice(0, 30)
    .map((offer, index) =>
      toOfferResult({
        offer,
        index,
        storeId: wantedStoreId ?? FIXTURE_STORE_ID,
        storeName,
      }),
    );

  return [...debugCards, ...offers];
}
