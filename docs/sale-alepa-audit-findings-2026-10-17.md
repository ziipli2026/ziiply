# Sale / Alepa — tuotetietohaun tarkistuksen havainnot (17.10.2026)

## Lähdeajot
- [Ajo 39012139726](https://github.com/ziipli2026/ziiply/actions/runs/39012139726): sisältää kaikkien 434 myymälän luokituksen; Sale-ajossa myöhemmin 403-esto.
- [Ajo 39012333130](https://github.com/ziipli2026/ziiply/actions/runs/39012333130): 403-pysäytys käytössä.

## Viimeisin pysäytyksen sisältävä ajo

| Ketju | Myymälöitä | Tarkistettu | Toimiva haku | 200 mutta 0 tuotetta | GraphQL-virhe | HTTP 403 |
|---|---:|---:|---:|---:|---:|---:|
| Sale | 303 | 144 | 68 | 60 | 10 | 6 |
| Alepa | 131 | 131 | 61 | 60 | 10 | 0 |

Sale-ajon 159 jäljelle jäänyttä myymälää **ei tarkistettu**, koska HTTP 403 -esto katkaisi ajon.

## Virheiden tulkinta

1. **GraphQL `Store not found`**: molempien ketjujen 10 GraphQL-virhettä/ketju ovat tätä tyyppiä. Lähde-ID voi olla vanhentunut, väärä tai kyseinen myymälä puuttua S-kaupat-palvelusta. Älä päättele yksin virheestä, että myymälä on suljettu.
2. **HTTP 200 ja `data.store.products`, mutta 0 hakutulosta**: ei ole sama asia kuin `Store not found`. Tarvitsee tunnuksen ja hakutuloksen erillisen tarkistuksen.
3. **HTTP 403**: palvelun pääsynesto. Ei todista mitään myymälän olemassaolosta tai tuotteista. Älä käynnistä uutta massakyselyä automaattisesti.

## Esimerkkejä `Store not found` -virheistä
- Sale: Haukiluoma Tampere, Kortepohja VANHA, Loue, Multia vanha, Automaatti Tampere, Kaijonharju Oulu, Kotkansaari, Uurainen, Hanko, Mouhijärvi Sastamala.
- Alepa: Kilo, Viherniemenkatu, Rajatorppa, Keilaniemi, Jamppa, Hämeenkatu, Sitratori, Tapulikaupunki, Pasilanraitio, Pukinmäki.

## Turvallinen jatkosuunnitelma
- Erota sovelluksessa ja diagnostiikassa `store_not_found`, `empty_products`, `access_denied` ja `temporary_error`; älä näytä HTTP 403 -virhettä tyhjänä tuotevalikoimana.
- Tarkista vanhentuneelta näyttävät nimet ja myymälätunnukset luotettavasta ajantasaisesta myymäläluettelosta ennen korvaavaa ID:tä.
- Selvitä 403-tilanteen syy ja palvelun sallittu käyttö ennen uusia laajoja rajapintatestejä.
- Säilytä 126+ aiemmin vahvistetun myymälän toimivat haut. Tulokset vaihtelevat ajosta toiseen, joten älä yhdistä eri ajojen lukumääriä yksittäisen ajon kattavuusluvuksi.

Tuotantokoodia ei muutettu tätä raporttia varten.


## Päivitys: viimeisin kattava ajo 39055107119 (17.10.2026)

[Lähdeajo ja kuusi rinnakkaista osaa](https://github.com/ziipli2026/ziiply/actions/runs/39055107119). Alla olevat luvut korvaavat yllä olevan **osittaisen ajon** luvut kattavuuden lähtötilanteena; vanha osittainen ajo on jätetty näkyviin vertailua varten.

| Ketju | Tarkistettu | Tuotteita löytyi | HTTP 200, 0 tuotetta | GraphQL Store not found |
|---|---:|---:|---:|---:|
| Sale | 303 | 166 | 120 | 17 |
| Alepa | 131 | 64 | 57 | 10 |
| **Yhteensä** | **434** | **230** | **177** | **27** |

**Tarkka tulkinta:** Nollatapauksissa sekä hakusana `maito` että tyhjä hakusana palauttivat `data.store.products.total = 0` (HTTP 200). Tämä ei todista, että myymälän koko tuoteryhmävalikoima olisi tyhjä. Kaikissa 27 GraphQL-tapauksessa virheilmoitus oli `Store not found`. Näiden 204 ongelmallisen myymälän virallisen tuotetietotunnuksen selvitys jäi ajossa ratkaisematta. Se ei todista, että kaikki lähde-ID:t olisivat vääriä.

**Lisähuomio pääsynrajoituksesta:** [Virallisen hakemiston tarkistusajossa 39056971312](https://github.com/ziipli2026/ziiply/actions/runs/39056971312) kaikki 303 Sale- ja 132 Alepa-hakemistopyyntöä palauttivat HTTP 429. Näitä ei saa luokitella puuttuviksi myymälöiksi eikä tuotetietojen nollatuloksiksi. Myymälämäärien ero (131 vs. 132 Alepaa) johtuu eri tarkistuslähteistä eikä ole vahvistettu myymälämuutos.

**Koodimuutokset:** `5f322d8` käyttää virallisen hakemiston ketjukohtaisia polkuja. `5c618f5` estää hakemistohakujen jatkumisen HTTP 403/429 -tilanteessa. Molempien Vercel-tuotantobuild on ollut READY; tuotetietojen kattavuutta ei ole vahvistettu näiden korjausten jälkeen. `723d6a9` vaatii erillisen KYLLA-vahvistuksen koko 434 myymälän auditointiin.

**Jatko ilman massapyyntöjä:** 1) Käsittele 27 `Store not found` -tapausta omana tunnusluokkanaan; tarkista ensin vanhalta näyttävät nimet. 2) Käsittele 177 HTTP 200 -nollatulosta erillisenä luokkana; varmista tunnus ennen tuoteryhmien korjaamista. 3) Tee myöhemmin rajattu testi vasta pääsynrajoituksen hellitettyä. Älä tee automaattista ID-korvausta tämän raportin perusteella.


## Täsmällinen tarkistuslista: 27 Store not found -tapausta

Lähde: kattavan ajon 39055107119 kuuden osan `FAST_SUMMARY.bad`-tiedot. Alla olevat tunnukset ovat **alkuperäisiä lähde-ID:itä**, eivät vahvistettuja korvaavia S-kaupat-tuotetietotunnuksia. Älä korvaa tuotannon ID:tä näillä ilman vahvistusta.

| Ketju | Myymälä | Lähde-ID | Virhe |
|---|---|---|---|
| Alepa | Alepa Hämeenkatu | `726435584` | Store not found |
| Alepa | Alepa Jamppa | `726425715` | Store not found |
| Alepa | Alepa Keilaniemi | `726171742` | Store not found |
| Alepa | Alepa Kilo | `660931411` | Store not found |
| Alepa | Alepa Pasilanraitio | `531632420` | Store not found |
| Alepa | Alepa Pukinmäki | `552108425` | Store not found |
| Alepa | Alepa Rajatorppa | `512415167` | Store not found |
| Alepa | Alepa Sitratori | `584813356` | Store not found |
| Alepa | Alepa Tapulikaupunki | `726256638` | Store not found |
| Alepa | Alepa Viherniemenkatu | `538460205` | Store not found |
| Sale | Sale Automaatti Tampere | `697945889` | Store not found |
| Sale | Sale Hanko | `500608831` | Store not found |
| Sale | Sale Haukiluoma Tampere | `725884549` | Store not found |
| Sale | Sale Intiö Oulu | `697947828` | Store not found |
| Sale | Sale Kaijonharju Oulu | `519814305` | Store not found |
| Sale | Sale Kolinportti | `501903587` | Store not found |
| Sale | Sale Kortepohja VANHA | `653574384` | Store not found |
| Sale | Sale Kotkansaari | `509165767` | Store not found |
| Sale | Sale Kyröskoski Hämeenkyrö | `677311136` | Store not found |
| Sale | Sale Lapua | `501521892` | Store not found |
| Sale | Sale Loue | `502111040` | Store not found |
| Sale | Sale Mouhijärvi Sastamala | `500854872` | Store not found |
| Sale | Sale Multia vanha | `512045139` | Store not found |
| Sale | Sale Piippola | `502133952` | Store not found |
| Sale | Sale Raksila | `516522828` | Store not found |
| Sale | Sale Uurainen | `501589857` | Store not found |
| Sale | Sale Vaskio | `500978176` | Store not found |

Nimissä `VANHA` ja `vanha` on mahdollinen vanhentuneen lähdetiedon merkki, **ei vahvistus myymälän sulkemisesta**. Tunnuksen korjaaminen vaatii ajantasaisen virallisen lähteen tai onnistuneen tuotehaun.


## Lähdetarkistus ilman massahakuja — Kortepohja ja Multia (17.10.2026)

Tämä on **nimien ja toimipaikkojen lähdetarkistus**, ei tuotetietotunnusten vahvistus. Mitään tuotannon ID:tä ei muutettu eikä S-kaupat-rajapinnan massahakua käynnistetty.

| Virheluettelon nimi | Vanha lähde-ID | Ulkoisista lähteistä todettu | Tunnuksen tila |
|---|---|---|---|
| Sale Kortepohja VANHA | `653574384` | S-kaupat listaa nykyisen **Sale Kortepohjan**, Kartanonkuja 11, 40740 Jyväskylä. Osuuskauppa Keskimaa ilmoitti vuonna 2024 tulevasta muutosta uusiin tiloihin keväällä 2025. Vanhaa Isännäntie 1 -osoitetta esiintyy vanhemmissa lähteissä. | **Korvaava tuotetieto-ID vahvistamatta**; nimi viittaa vanhaan toimipaikkakirjaukseen. |
| Sale Multia vanha | `512045139` | S-kaupat listaa **Sale Multian**, Keskustie 18, 42600 Multia. Keskimaa kertoi uuden Sale Multian avautuneen kesäkuussa 2024. Aiemmassa toimipaikkaluettelossa on erikseen Sale Multia ja Sale Multia Uusi samalla osoitteella. | **Korvaava tuotetieto-ID vahvistamatta**; vanha/uusi-toimipaikka pitää erottaa toisistaan. |

Lähteet:
- https://www.s-kaupat.fi/myymalat?query=Sale
- https://www.sttinfo.fi/tiedote/70623571/keskimaan-paivittaistavarakaupan-vahva-kehitys-jatkuu-ravintolakauppa-haastaa?lang=fi&publisherId=68574138
- https://assets.ctfassets.net/8122zj5k3sy9/2sj8MRHT6lp4azDoTbSwCZ/2b1b922c769f2362c2f25b521aebebe3/Invoicing_addresses_for_suppliers.pdf

**Päätös:** merkitse nämä kaksi vanhoiksi epäillyiksi lähdekirjauksiksi (ei poistetuksi myymäläksi); jätä 25 muuta `Store not found` -tapausta avoimiksi. Päivitä koodin myymälä-ID vain, kun nykyinen S-kaupat-tuotetietotunnus on luotettavasti varmennettu. Erilliset yritys-/toimipaikkanumerot eivät kelpaa GraphQL-tuotetieto-ID:ksi.


## Jatkotyö: 25 avoimen tunnusvirheen käsittelyjono (17.10.2026)

Alla on **selvitysjärjestys, ei uusi tunnusvahvistus**. Nimet ja lähde-ID:t perustuvat yllä olevaan 434 myymälän auditointiin. Ulkoinen haku ei tuottanut vahvistettuja korvaavia S-kaupat-tuotetietotunnuksia. Kaikki 25 jäävät avoimiksi; Kortepohja ja Multia käsiteltiin erikseen edellä.

**Ensimmäinen ryhmä — mahdollisesti erityinen toimipaikka tai nimimuutos (tarkistettava):**
- Sale Automaatti Tampere — `697945889` (automaattimyymälän identiteetti ja tuotevalikoiman rajapintatuki)
- Sale Raksila — `516522828` (nykyinen nimi ja toimipaikka)
- Sale Intiö Oulu — `697947828` (nykyinen nimi ja toimipaikka)
- Sale Kaijonharju Oulu — `519814305` (nykyinen nimi ja toimipaikka)
- Sale Haukiluoma Tampere — `725884549` (nykyinen nimi ja toimipaikka)

**Toinen ryhmä — muut Sale-tunnukset (vertaa ajantasaiseen viralliseen myymäläkirjaukseen):**
- Sale Hanko `500608831`; Sale Kolinportti `501903587`; Sale Kotkansaari `509165767`; Sale Kyröskoski Hämeenkyrö `677311136`; Sale Lapua `501521892`; Sale Loue `502111040`; Sale Mouhijärvi Sastamala `500854872`; Sale Piippola `502133952`; Sale Uurainen `501589857`; Sale Vaskio `500978176`.

**Kolmas ryhmä — Alepa-tunnukset:**
- Alepa Hämeenkatu `726435584`; Alepa Jamppa `726425715`; Alepa Keilaniemi `726171742`; Alepa Kilo `660931411`; Alepa Pasilanraitio `531632420`; Alepa Pukinmäki `552108425`; Alepa Rajatorppa `512415167`; Alepa Sitratori `584813356`; Alepa Tapulikaupunki `726256638`; Alepa Viherniemenkatu `538460205`.

**Todentamiskriteeri:** jokaisesta myymälästä kirjataan erikseen (1) nykyinen virallinen myymälänimi ja osoite, (2) virallinen S-kaupat-tuotetietotunnus lähdeviitteineen, (3) myöhemmin onnistunut rajattu tuotehaku. Pelkkä saman niminen myymälä, ulkoinen toimipaikka-ID tai HTTP 200/0 tuotetta ei riitä vahvistukseksi. HTTP 403/429 estää testauksen eikä oikeuta toistuviin pyyntöihin. Ei automaattisia tuotantokorvauksia.


## Vahvistettu historiallinen tapaus: Sale Automaatti Tampere (17.10.2026)

**Lähde-ID:** `697945889`. S-ryhmän oma tiedote vahvistaa, että Sale Automaatti avattiin Tampereen Puutarhakadulle 31.8.2023. Ylen 16.9.2024 julkaisema uutinen kertoo, että kokeilumyymälä suljettiin syyskuun 2024 lopussa. Tästä syystä vuoden 2026 `Store not found` -tulos on yhteensopiva **historiallisen, suljetun toimipaikan** kanssa. Se ei ole näyttö väärästä tunnuksesta eikä perustelu vaihtaa sitä toisen kaupan tunnukseen.

Lähteet:
- https://s-ryhma.fi/uutinen/tamperelaiset-paasevat-nyt-testaamaan-uniikkia-its/6QAZ0xZChvcsRA42sxDfgU
- https://yle.fi/a/74-20111801

**Ehdotettu käsittely:** merkitse `Sale Automaatti Tampere` tarkistusraportissa `historical_closed_store`-ehdokkaaksi (sulkemisesta vahva näyttö), älä tee automaattista tunnuskorvausta, äläkä laske tätä nykyisten aktiivisten myymälöiden tunnuskorjausjonoon ennen aktiivisen myymäläluettelon vertailua. Kattavan alkuperäisauditoinnin 27 virhettä säilyvät ennallaan historiatietona. Aktiivisen myymäläluettelon tuotantopäivitys vaatii erillisen vahvistuksen.


## Lähdetarkistus: Sale Kaijonharju Oulu (17.10.2026)

**Alkuperäinen lähde-ID:** `519814305` — kattavan auditoinnin `Store not found`.

Osuuskauppa Arinan 31.8.2026 julkaistun tiedotteen mukaan **Sale Kaijonharju suljetaan 5.9.2026**, ja viereen rakennetaan uusi **S-market Kaijonharju**. Näin vanhan Sale-myymälän virheellä on uskottava historiallinen selitys. Älä korvaa vanhaa Sale-ID:tä uuden S-marketin ID:llä: kyseessä on eri myymäläkonsepti ja tuleva toimipaikka, eikä tuotetietotunnusta ole varmennettu.

Virallinen lähde: https://api.sttinfo.fi/tiedote/72271453/kaijonharjun-palvelut-uudistuvat-nykyisen-salen-viereen-rakennetaan-uusi-s-market?lang=fi&publisherId=68574190

**Luokitus:** `historical_closed_store` (sulkemisilmoitus vahvistettu). Auditoinnin 27 virhettä säilytetään ennallaan; tuotanto-ID:tä ei muuteta. Historiallisiksi suljetuiksi todettuja tapauksia on nyt kaksi: Sale Automaatti Tampere ja Sale Kaijonharju Oulu. Muut 25 alkuperäistä tapausta ovat edelleen vailla vahvistettua korvaavaa tuotetieto-ID:tä.


## Lähdetarkistus: Sale Raksila Oulu (17.10.2026)

Alkuperäinen lähde-ID: `516522828`; auditoinnin tulos `Store not found`.

Osuuskauppa Arina ilmoitti 13.9.2024 sulkevansa Sale Raksilan syyskuun 2024 loppuun mennessä. Huhtikuussa 2026 entinen Sale-liiketila kuvattiin jo tyhjentyneeksi. Kyseessä on vahvasti vahvistettu **historiallinen suljettu toimipaikka**, ei korvaavan tuotetietotunnuksen hakukohde. Viereinen Prisma Raksila on eri myymälä, eikä sen tunnusta saa käyttää Salen tilalla.

Lähteet:
- https://yle.fi/a/74-20111366
- https://www.kaleva.fi/tyhja-liiketila-varjaytyi-vihreaksi-raksilan-marke/13453894
- https://www.s-kaupat.fi/myymala/prisma-raksila-oulu/516528759

**Raportin tilanne:** 3 suljetuksi tunnistettua (Sale Automaatti Tampere, Sale Kaijonharju Oulu, Sale Raksila), 2 historiallista tai muuttunutta kirjausta (Sale Kortepohja VANHA, Sale Multia vanha), 22 muuta selvittämätöntä. Alkuperäisen 434 myymälän auditoinnin 27 `Store not found` -tulosta pidetään ennallaan. Ei ID-korvauksia eikä tuotantopäivitystä.


## Lähdetarkistus: Sale Intiö Oulu (17.10.2026)

**Alkuperäinen lähde-ID:** `697947828` — `Store not found` kattavassa auditoinnissa.

Osuuskauppa Arinan 16.12.2024 julkaisema tiedote vahvistaa, että **Sale Intiö suljettiin viimeistään 31.1.2025** vuokrasopimuksen päättyessä. Aiempi Arinan myymäläesittely kertoo Sale Intiön sijainneen Kenttätie 9:ssä, Oulussa. Näin kyseessä on historiallinen, suljettu Sale-toimipaikka. Tiedote kertoo viimeisen mahdollisen sulkemispäivän, ei täsmällistä toteutunutta päivää.

Lähteet:
- https://www.sttinfo.fi/tiedote/70759732/sale-intion-toiminta-loppuu-vuokrasopimus-paattyy?lang=fi&publisherId=68574190
- https://arina.fi/artikkeli/oulun-intion-m-market-uudistuu-huhtikuussa-sale-lahimyymalaksi

**Päätös:** `historical_closed_store`; ei ID-korvausta eikä tuotantokoodin muutosta. Alkuperäisen auditoinnin 27 virhettä säilytetään. Suljetuksi vahvistettuja on nyt neljä (Automaatti Tampere, Kaijonharju, Raksila, Intiö), kaksi vanhaa/muuttunutta toimipaikkakirjausta ja 21 muuta vielä selvittämätöntä.


## Lähdetarkistus: Sale Hanko (17.10.2026)

Alkuperäinen lähde-ID: `500608831`; auditoinnissa `Store not found`.

Osuuskauppa Varuboden-Oslan 15.4.2024 julkaisema virallinen tiedote vahvistaa Sale Hangon sulkemisen viimeistään perjantaina 19.4.2024. S-market Hanko jatkoi toimintaansa, mutta on eri myymälä eikä sen tunnusta saa korvata Sale Hangon tunnuksen tilalle.

Virallinen lähde: https://vbo.fi/news/sale-hanko-sulkee-ovensa-s-market-palvelee-normaalisti/

Luokitus: `historical_closed_store`; ei ID-korvausta. Suljetuiksi vahvistettuja on nyt 5, vanhoja/muuttuneita kirjauksia 2, muita avoimia 20. Alkuperäisen auditoinnin 27 `Store not found` -havaintoa säilytetään ennallaan. Sale Haukiluoma Tampere jää avoimeksi: luotettavaa sulkemisvahvistusta ei tässä vaiheessa löytynyt. Ei tuotantokoodin muutosta eikä massahakua.


## Lähdetarkistus: Sale Loue (17.10.2026)

Alkuperäinen lähde-ID `502111040`, auditoinnissa `Store not found`.

Ylen 2023 uutinen kertoo Osuuskauppa Arinan sulkevan Sale Louen vuodenvaihteessa 2023–2024. Tervolan kunnan 13.6.2025 artikkeli vahvistaa S-ryhmän Sale-myymälän sulkeutuneen ja tilalle perustetun yksityisen Louen kyläkaupan. Kunnan 2.9.2026 uutinen kertoo myös tämän myöhemmän kyläkaupan sulkeutumisesta. Nämä ovat eri kauppatoimijoita: myöhempää kyläkauppaa ei saa tulkita Sale Louen jatkavaksi S-kaupat-tuotetietotunnukseksi.

Lähteet:
- https://yle.fi/a/74-20054194
- https://tervola.fi/ajankohtaista/lahiruokaan-erikoistunut-louen-kylakauppa-tayttaa-vuoden-yksikaan-paiva-ei-ole-sellainen-ettei-tekisi-mieli-lahtea-toihin/
- https://tervola.fi/ajankohtaista/louen-kylakauppa-sulki-ovensa-kannattamattomana-paikalle-suunnitteilla-kauppatoimintaa-itsepalveluperiaatteella/

Luokitus `historical_closed_store`, ei tunnuskorvausta. Nyt 6 vahvistettua suljettua, 2 vanhaa/muuttunutta kirjausta ja 19 muuta avoinna alkuperäisestä 27 virheestä. Alkuperäistä auditointia tai tuotantokoodia ei muutettu.


## Jatkoselvitys: Kotkansaari, Piippola ja Haukiluoma (17.10.2026)

Kolme alkuperäisen `Store not found` -luettelon toimipaikkaa voidaan luokitella historiallisiksi. Nämä eivät ole uusia tuotetieto-ID-vahvistuksia.

| Myymälä | Alkuperäinen ID | Sulkemisnäyttö | Luokitus |
|---|---|---|---|
| Sale Kotkansaari | `509165767` | Kymen Seudun Osuuskauppa: viimeinen aukiolopäivä 27.9.2025 | `historical_closed_store` |
| Sale Piippola | `502133952` | Osuuskauppa Arina: sulkeminen päätetty viikolle 51/2025 | `historical_closed_store` (päätöksen mukainen) |
| Sale Haukiluoma Tampere | `725884549` | Tampereen kaupungin 2026 asemakaava-aineiston mukaan Tyvikatu 13:n päivittäistavarakauppa on purettu kannattamattomana | `historical_closed_store` (tarkka sulkemispäivä avoin) |

Lähteet:
- https://kymenseudunosuuskauppa.fi/artikkeli/sale-kotkansaari-suljetaan-pysyvasti
- https://arina.fi/artikkeli/arina-sulkee-sale-piippolan
- https://tampere.cloudnc.fi/fi-FI/Toimielimet/Yhdyskuntalautakunta/Kokous_332026/Asemakaavaehdotuksen_asettaminen_nahtavi%28492653%29

**Yhteenveto:** 9 historialliseksi suljetuksi tunnistettua, 2 vanhaa/muuttunutta kirjausta, 16 muuta avoinna = alkuperäiset 27 virhettä. Ei ID-korvauksia, tuotantokoodin muutoksia tai massahakuja. Suljettuja ei tule automaattisesti yhdistää lähialueen nykyisiin S-marketeihin.


## Virallisten sulkemistiedotteiden tarkistus: kolme Salea (17.10.2026)

Seuraaville kolmelle alkuperäisen auditoinnin `Store not found` -myymälälle löytyi osuuskaupan oma sulkemistiedote. Tämä ei vahvista mitään korvaavaa tuotetietotunnusta.

| Myymälä | Lähde-ID | Virallinen tieto | Luokitus |
|---|---|---|---|
| Sale Kyröskoski Hämeenkyrö | `677311136` | Pirkanmaan Osuuskauppa 22.10.2025: suljetaan viimeistään 31.10.2025 | `historical_closed_store` |
| Sale Mouhijärvi Sastamala | `500854872` | Pirkanmaan Osuuskauppa 7.8.2025: viimeinen ilmoitettu palvelupäivä 29.8.2025, loppuunmyynti 27.8. alkaen | `historical_closed_store` |
| Sale Vaskio | `500978176` | Suur-Seudun Osuuskauppa 5.8.2025: suljetaan lokakuun 2025 loppuun mennessä | `historical_closed_store` |

Viralliset lähteet:
- https://pirkanmaanosuuskauppa.fi/artikkeli/sale-kyroskoski-sulkee-ovensa-lokakuun-lopussa
- https://pirkanmaanosuuskauppa.fi/artikkeli/sale-mouhijarven-toiminta-paattyy-elokuussa-palvelubussi-kuljettaa-jatkossakin-asiakkaita-s-market-haijaaseen
- https://sso.fi/artikkeli/sale-vaskion-vuokrasopimus-paattyy

**Tilanne:** 12 historialliseksi suljetuksi tunnistettua, 2 vanhaa/muuttunutta kirjausta ja 13 muuta selvittämätöntä = 27 alkuperäistä virhettä. Suljettujen lähimyymälöiden tunnuksia ei korvata niiden seuraajilla tai lähikaupoilla. Ei massahakuja eikä tuotantokoodin muutoksia.


## Tarkennus: Alepa Jamppa ja Sale Lapua (17.10.2026)

**Alepa Jamppa**, lähde-ID `726425715`: S-kaupat-verkkosivun myymäläosoite on `https://www.s-kaupat.fi/myymala/alepa-jamppa/726425715`, osoite Pihkakatu 4, 04440 Järvenpää. Sivun polussa on **täsmälleen sama numerotunnus** kuin auditoinnin `Store not found` -lähde-ID. Tämä todistaa, että tunnus on virallisen julkisen myymäläsivun tunniste; se **ei todista**, että sama tunnus kelpaa käytettyyn GraphQL-tuotehakukyselyyn. Älä korvaa ID:tä äläkä merkitse myymälää suljetuksi. Luokitus `official_page_id_matches_source_but_graphql_not_found`.

**Sale Lapua**, lähde-ID `501521892`: S-kaupat listaa Sale Lapuan Kauppakatu 5:ssä, 62100 Lapua, mutta hakemiston hakutuloksessa näkyy `Suljettu`. Sana voi viitata hetkelliseen aukiolotilaan eikä yksin osoita pysyvää sulkemista. Samalla paikkakunnalla on myös erillinen S-market Lapua (Latojantie 9). Kumpaakaan myymälää ei saa käyttää toisen tunnuksen korvikkeena. Luokitus `official_store_listing_found_identity_unresolved`.

Lähteet:
- https://www.s-kaupat.fi/myymala/alepa-jamppa/726425715
- https://www.s-kaupat.fi/myymalat/alepa
- https://www.s-kaupat.fi/myymalat/sale
- https://www.s-kaupat.fi/myymalat/s-market

**Tilanne:** aiemmin luokitellut 12 historiallista suljettua ja 2 vanhaa/muuttunutta kirjausta pysyvät ennallaan. Kahdesta jäljellä olevasta 13 tapauksesta löytyi nyt virallinen sivu tai hakemistomerkintä, mutta **GraphQL-tunnusongelmaa ei ole ratkaistu**. Muita täysin lähdetasolla selvittämättömiä on 11. Ei tuotantokoodin muutoksia, tunnuskorvauksia tai uusia massahakuja.
