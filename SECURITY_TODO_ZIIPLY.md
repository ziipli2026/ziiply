# Ziiply Security TODO

Tavoite: tehdä Ziiplyn hakumoottorista, datalogiikasta ja oppivasta kerroksesta mahdollisimman vaikeasti kopioitava.

## 1. Periaate

Frontend saa olla vain käyttöliittymä.

```txt
Frontend = UI, kortit, napit, kevyet tilat
Backend = haku, scoring, AI-intent, cache, rate limit
Tietokanta = oppiminen, analytiikka, käyttäjäsignaalit
```

Kaikki, mikä on selaimessa, on käytännössä julkista.

## 2. Mitä ei saa pitää frontendissä

Älä pidä näitä `page.tsx`:ssä tai client-komponenteissa:

- API-avaimet
- kauppojen oikeat endpointit
- scoringin täysi logiikka
- AI-intent promptit
- oppivan haun muistimallit
- premium-/käyttöoikeuslogiikka
- raakadata kaupoilta
- debug-scoret tuotannossa
- source mapping siitä, mistä tuotteet haettiin

## 3. Ehdotettu kansiorakenne

Luo nämä myöhemmin:

```txt
src/app/api/search/route.ts
src/app/api/compare/route.ts
src/app/api/ean/route.ts
src/app/api/feedback/route.ts

src/server/ziiply/searchEngine.ts
src/server/ziiply/searchIntent.ts
src/server/ziiply/searchMemory.ts
src/server/ziiply/rateLimit.ts
src/server/ziiply/productNormalize.ts
src/server/ziiply/storeClients.ts
```

## 4. Frontendin tavoitetila

Frontend kutsuu vain Ziiplyn omaa API:a:

```ts
fetch("/api/search", {
  method: "POST",
  body: JSON.stringify({ query, area, mode })
});
```

Frontend ei kutsu suoraan kauppojen API:a.

## 5. Backendin tavoitetila

Backend tekee:

```txt
1. tarkistaa kutsukoodin / session
2. rate limit
3. normalisoi hakusanan
4. tunnistaa intentin
5. hakee kauppadatasta
6. suodattaa kategoriat
7. pisteyttää
8. soveltaa oppivaa muistia
9. palauttaa vain UI:n tarvitseman datan
```

## 6. API:n palauttama data

Palauta vain tämä:

```ts
type PublicProductResult = {
  id: string;
  name: string;
  price: number;
  comparisonPrice?: string;
  storeName: string;
  chain: "S" | "K" | "LIDL" | "OTHER";
  image?: string;
  badge?: string;
};
```

Älä palauta:

```txt
rawScore
intentScore
learnedBoost
sourceEndpoint
fullCategoryTree
internalDebug
rawProductJson
```

## 7. Rate limit

Minimit tuotantoon:

```txt
20 hakua / minuutti / IP
100 hakua / päivä / kutsukoodi
10 EAN-skannausta / tunti / IP
```

Jos raja ylittyy:

```json
{
  "error": "rate_limited",
  "message": "Liikaa hakuja hetkeen. Kokeile kohta uudelleen."
}
```

## 8. Beta-portti

Ennen avointa julkaisua lisää kutsukoodi:

```txt
ZIIPLY_BETA_CODE
```

Ilman kutsukoodia API ei vastaa oikeilla hakutuloksilla.

## 9. Noindex / robots

Lisää:

```txt
public/robots.txt
```

sisällöllä:

```txt
User-agent: *
Disallow: /
```

Lisää myös metadataan:

```ts
robots: {
  index: false,
  follow: false,
}
```

## 10. Debug pois productionista

Kaikki debug-paneelit:

```ts
const showDebug = process.env.NODE_ENV !== "production";
```

Productionissa ei saa näkyä:

- hakuscoreja
- state-debugia
- raw JSONia
- API endpointteja
- intent debugia
- memory debugia

## 11. Oppiva haku turvallisesti

Oppiminen ei saa ohittaa guardraileja.

```txt
Hard exclude > AI intent > learned boost
```

Esimerkki:

```txt
"maito" ei saa palauttaa maitosuklaata,
vaikka käyttäjä olisi joskus klikannut suklaatuotetta.
```

## 12. Ensimmäinen käytännön vaihe

Seuraava turvallinen toteutusjärjestys:

1. lisää `robots.txt`
2. lisää kutsukoodi / beta-portti
3. siirrä `/api/search` serverille
4. siirrä intent- ja memory-logiikka serverille
5. poista debug-paneelit productionista
6. lisää rate limit
7. lisää analytiikka vain aggregate-tasolla

## 13. Mitä voi tehdä heti

Tämän tiedoston voi lisätä repoosi dokumentaatioksi:

```txt
docs/SECURITY_TODO_ZIIPLY.md
```

Tai jos `docs`-kansiota ei vielä ole:

```txt
SECURITY_TODO_ZIIPLY.md
```

Ei vaikuta buildiin eikä appin toimintaan.
