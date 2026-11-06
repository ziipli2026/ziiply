# GPS- ja kauppaan saapumisen kenttätestit — 5.11.2026

**Sovellus:** Ziiply, mobiili / tuotanto (`main`, Vercel)  
**Testipaikka:** S-market Jokela  
**Tulos:** Hyväksytty havaittujen tilanteiden osalta; sisätilojen GPS-häiriötilanne vaatii edelleen erillisen testin.  
**Kirjauspäivä:** 6.11.2026. **Testipäivä:** 5.11.2026.

## Testin yhteydessä käytetty koodiversio

- GPS:n vahvistetun kaupassaolon säilytyskorjaus: `7839e1e184340cc5ff2a809df533e12a7a589de0` (`main`).
- GPS-debug-ikkunan painikkeiden asettelukorjaus: `8e8d875232186c4bf55400901594312542e480a5` (`main`).
- Vercel vahvisti jälkimmäisen commitin tuotantojulkaisun `READY`: deployment `dpl_57Gt6mmPTBKqpVTENXtSEFUqg2AK`, https://vercel.com/ziipli2026s-projects/ziiply/57Gt6mmPTBKqpVTENXtSEFUqg2AK.
- **Versiorajaus:** yllä on viimeisin tässä testikokonaisuudessa yksilöity GPS-korjausversio, jonka tuotantojulkaisu on vahvistettu. GPS-debug-JSON ei sisällä Git-commit-SHA:ta tai Vercel-deployment-ID:tä, joten 5.11. klo 20.52–20.54 ajossa selaimen tarkkaa build-SHA:ta ei voi todistaa pelkän lokin perusteella. Muut mahdolliset välissä julkaistut commitit eivät ole tässä lokissa yksilöitävissä.

## Kenttähavainnot 5.11.2026

### Ajonaikainen ohitus — GPS-debug 18
- Käyttäjä ajoi autolla kauppojen läheisyydessä.
- Käyttäjälle ei tullut saapumisilmoituksia, eikä niitä pitänytkään tulla.
- Aiemmassa tarkastelussa havaittiin taustalla kauppojen lähestymis-/ohitushavaintoja, mutta ei saapumisen vahvistusta.
- **Tulos:** hyväksytty ajonaikaisen virheilmoituksen eston osalta.
- Lähde: keskustelussa tarkastettu `ziiply-gps-debug 18.json`. Tätä raakadataa ei liitetä tähän GitHub-tiedostoon.

### Pysähtyminen ja saapuminen — GPS-debug 19
- Lähde: `ziiply-gps-debug 19.json` (123 tapahtumaa, joista 51 GPS-mittausta ja 51 saapumispäätöstä).
- Lokin aika (Suomi, UTC+02): **5.11.2026 klo 20.52.44–20.54.51**.
- Tilapäätökset: `checking/white` 12; `near-store/white` 11; `near-store/yellow` 3; `moving/white` 3; `in-store/green` 22.
- S-market Jokela oli valittuna. Ajon aikana kauppa tunnistettiin `near-store`-tilassa ilman virheellistä saapumista.
- Pysähdyksen jälkeen kolme peräkkäistä lähestymiskandidaattia johti yhteen `in-store`-vahvistukseen (`arrival: true`, `radar: green`).
- Saapumisilmoitus käynnistyi **kerran** ja eteni vaiheissa `approach → list → offers → done`.
- Vahvistuksen jälkeen **22 peräkkäistä** päätöstä pysyi vihreänä `in-store`-tilassa; uusia saapumisilmoituksia ei käynnistynyt.
- **Tulos:** hyväksytty tämän lokin kattaman pysähtymis-/saapumisjakson osalta.

## Rajaukset ja seuraava regressiotesti

- Tämä loki ei yksin osoita, että vihreä tila pysyy myös **heikon sisätilapaikannuksen**, pitkäkestoisen GPS-katkoksen tai kauppatietojen katoamisen yli.
- Testaa seuraavaksi: vihreä vahvistetaan ulkona, skanneri avataan sisällä, GPS-tarkkuus heikkenee / kauppakandidaatti katoaa, vihreä säilyy, eikä ilmoitusta toisteta; poistuminen kaupasta purkaa tilan vasta uskottavan poistumisen jälkeen.
- Säilytä alkuperäiset GPS-debug 18/19 JSON:t testin todisteina erillään lähdekoodista (sisältävät tarkkoja sijaintitietoja).
