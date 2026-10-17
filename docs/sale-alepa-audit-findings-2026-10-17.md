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
