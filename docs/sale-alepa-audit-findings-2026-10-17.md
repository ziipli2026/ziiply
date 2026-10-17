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
