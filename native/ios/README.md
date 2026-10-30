# Arvo iPhone – paikallinen terveysseuranta

Tämä on olemassa olevan `ZiiplyArvoTest`-testin jatko, samalla bundle identifierillä `fi.ziiply.arvotest`.

## Asennus Macilla

1. Hae tämän haaran (`feature/arvo-health-consent-foundation`) uusin versio.
2. Asenna XcodeGen (`brew install xcodegen`) ja suorita `cd native/ios && xcodegen generate`.
3. Avaa `ZiiplyArvoTest.xcodeproj`, valitse oma Signing Team ja oma iPhone, paina Run.
4. Vaihtoehto nykyiseen Macin projektiin: korvaa `ContentView.swift` tämän hakemiston `ArvoApp/ContentView.swift`-tiedostolla ja lisää `ArvoHealthKitReader.swift` sekä `ArvoSleepNormalizer.swift` samaan sovellustargetiin. Säilytä projektin nykyinen @main App, joka avaa ContentView:n. Varmista HealthKit capability ja NSHealthShareUsageDescription.

## Ravinto ja terveys samassa sovelluksessa

Sovellus avaa tuotannon `https://ziiply.fi/arvo-tilastot`-sivun Ravintotilastot-välilehteen. Terveys-välilehti avaa paikallisen HealthKit-näkymän. Ravintotilastojen linkki `/arvo-terveystiedot` vaihtaa Terveys-välilehdelle vain käyttäjän linkkipainalluksesta Ziiplyn pääkehyksessä. Linkki ei anna suostumusta eikä käynnistä lukua.

Terveystietoja, suostumuslokia tai lupatilaa ei palauteta verkkonäkymään. Yhteistä ravinto–terveyslaskentaa ei vielä ole. Safariin tallennetut ateriat eivät automaattisesti siirry sovelluksen WKWebView-tallennustilaan. Ravintotilastot vaativat verkkoyhteyden; Terveys-välilehti toimii paikallisesti. Terveys-välilehdeltä poistuminen peruu istunnon ja tyhjentää lukemat.

## Toteutus

- Nimenomainen lupa ja valitut tietoryhmät kirjataan suojattuun paikalliseen auditointitiedostoon ennen HealthKit-oikeuspyyntöä. Oletuksena ei valintoja.
- Päivä, 7 ja 30 päivää: askeleet, aktiivisuusenergia, leposyke, HRV SDNN, uni ja saatavilla olevat univaiheet.
- Puuttuva tai estetty tieto on viiva; HealthKit ei paljasta, estettiinkö lukulupa.
- Uni rajataan paikallisiin kalenteripäiviin. Päällekkäisiä näytteitä ei summata kahdesti; yleinen asleep ei keksi univaiheita.
- Peruutus mitätöi myös keskeneräisten lukujen tulokset. Taustalle siirtyminen peruu istunnon ja tyhjentää muistissa olevat lukemat. Seuraavalla käyttökerralla annetaan uusi lupa.
- Ei verkkosiirtoa, analytiikkaa, browser-storagea tai terveystietojen levytallennusta. Suostumusmetadata on laitteessa, ei pilvivarmuuskopiossa.

## Todellinen rajaus

Terveysnäkymä on natiivi. Se ei siirrä tietoja Safariin eikä Next.js:n `/arvo-tilastot`-sivulle; nämä avautuvat nyt saman sovelluksen eri välilehdissä. Verkkosivun ruokapäiväkirjaa ei vielä yhdistetä natiiviseurannan laskentaan. Palvelinsynkronointi ja käyttäjäkirjautuminen pysyvät erillään; palvelinrajapinnat ovat edelleen suljettuja.

## Varmistus

GitHub Actions `Arvo iPhone build and tests` generoi projektin, kääntää sovelluksen ja ajaa XCTest-unilaskentatestit iPhone-simulaattorissa. Oikean HealthKit-datan hyväksyntä vaatii lisäksi iPhone-testin: luvan hylkäys, tietoryhmän rajaus, Apple Health -lukemien vertailu, jakson vaihto ja peruutus kesken luvun. Simulaattoritesti ei vahvista näitä.
