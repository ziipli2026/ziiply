# Desktopin reseptihaun 20 reseptin auditointi – 14.10.2026

20 erillistä reseptiä Valion ja K-Ruoan alkuperäisistä sivuista. Aineslistat luettiin sivujen Recipe/JSON-LD-tiedoista, eikä lähtöaineksia keksitty testin tulosten perusteella.

## Toteutus ja rajat

- Kauppa: Prisma Hyvinkää, Ruoanhinta storeId 292. Oikeat julkisen API:n vastaukset haettiin 14.10.2026; enintään kolme 80 tuotteen sivua hakusanaa kohti.
- Käytössä desktopin omat `parseRecipeText`, `prepareRecipeSearch`, `recipeCoverageQueries`, `getNormalSearchQueries`, `recipeProductCompatible`, tuoreusjärjestys, relevanssi/hinta-järjestys ja pakkauslaskenta. Tavallisten kyselyiden ensimmäinen sopiva vastaus ja täydentävien kyselyiden yhdistäminen simuloitiin desktopin logiikan mukaisesti.
- Kyse on hakumoottorin simulaatiosta oikeilla kauppavastauksilla. Selainikkunan käyttöä, ostoskorin painikkeita tai Vercelin julkaisun tilaa ei tässä ajossa vahvistettu. Paikallinen Next-kehityspalvelin saatiin käyntiin eksplisiittisellä osoitteella, mutta toinen työkaluprosessi ei päässyt sen paikalliseen porttiin.
- Ruoanhinta-vastaukset haettiin suoraan samasta julkisesta lähteestä kuin desktopin S-reitti. S-reitin automaattista tyhjän tuloksen S-kaupat-varahakua ja sen aikarajoja ei jäljennetty tässä ajossa; ne voivat tuottaa lisää vaihtoehtoja.
- API:n täsmällisen vastineen puuttuminen ei tarkoita, että tuote olisi oikeasti loppunut kaupasta. Muun ketjun omaa tuotetta ei odoteta löytyvän tästä kaupasta. Täsmällisiä makuja ja sekoituksia ei korvata mielivaltaisesti.
- Määrät vertaillaan vain yhteismitallisina. Ruokalusikoita ei muunnettu grammoiksi ilman tietoa aineen tiheydestä, eikä irtotuotteen kappalepainoa keksitty. Näissä tapauksissa pakkausmäärä jää epävarmaksi. API:n painotuotteiden €/kg-hinnan ja pakkauksen kokonaishinnan eroa ei tällä auditilla ratkaista.

## Vertailu

Ennen muutoksia 39 aineskohtaista hakua jäi ilman sopivaa tulosta samasta kauppa-aineistosta. Muutosten jälkeen 195 hakurivistä 189 sai sopivia tuotteita ja 6 jäi täsmällisenä puuttumaan. Hakurivien lukumäärä muuttuu hieman, koska tyypit, taivutusmuodot ja yhdistetyt määrät tulkitaan korjatussa versiossa eri tavalla. Tämä ei ole yleispätevä onnistumisprosentti kaikille resepteille tai kaupoille.

| Lähderesepti | Hakuja korjattuna | Puuttui ennen | Puuttuu jälkeen | Jäljelle jäävä täsmällinen puute |
|---|---:|---:|---:|---|
| [Lohikeitto](https://www.valio.fi/reseptit/lohikeitto/) | 8 | 0 | 0 | Kaikille löytyi sopivia tuotteita |
| [Pannukakku](https://www.valio.fi/reseptit/pannukakku/) | 6 | 0 | 0 | Kaikille löytyi sopivia tuotteita |
| [Linssicurry](https://www.valio.fi/reseptit/linssicurry/) | 11 | 1 | 0 | Kaikille löytyi sopivia tuotteita |
| [Tonnikalapasta](https://www.valio.fi/reseptit/tonnikalapasta/) | 9 | 1 | 0 | Kaikille löytyi sopivia tuotteita |
| [Helppo uunilohi](https://www.valio.fi/reseptit/helppo-uunilohi/) | 7 | 2 | 0 | Kaikille löytyi sopivia tuotteita |
| [Savulohisalaatti](https://www.valio.fi/reseptit/savulohisalaatti/) | 13 | 5 | 0 | Kaikille löytyi sopivia tuotteita |
| [Juustoinen savukalakeitto](https://www.valio.fi/reseptit/juustoinen-savukalakeitto/) | 7 | 3 | 0 | Kaikille löytyi sopivia tuotteita |
| [Tomaatti-linssikeitto](https://www.valio.fi/reseptit/tomaatti-linssikeitto/) | 11 | 2 | 0 | Kaikille löytyi sopivia tuotteita |
| [Bataattisosekeitto](https://www.valio.fi/reseptit/bataattisosekeitto/) | 7 | 3 | 1 | ancho chilimaustetta |
| [Pinaattikeitto tuorepinaatista](https://www.valio.fi/reseptit/pinaattikeitto-tuorepinaatista/) | 7 | 2 | 0 | Kaikille löytyi sopivia tuotteita |
| [Liha-makaronilaatikko](https://www.k-ruoka.fi/reseptit/liha-makaronilaatikko) | 11 | 1 | 1 | Pirkka emmental-mozzarellajuustoraastetta |
| [Kanapasta](https://www.k-ruoka.fi/reseptit/kanapasta) | 11 | 2 | 0 | Kaikille löytyi sopivia tuotteita |
| [Linssikeitto](https://www.k-ruoka.fi/reseptit/linssikeitto) | 14 | 1 | 0 | Kaikille löytyi sopivia tuotteita |
| [Kreikkalainen salaatti](https://www.k-ruoka.fi/reseptit/kreikkalainen-salaatti) | 12 | 2 | 1 | vihreä paprika |
| [Korvapuustit](https://www.valio.fi/reseptit/korvapuustit/) | 11 | 0 | 0 | Kaikille löytyi sopivia tuotteita |
| [Mustikkapiirakka](https://www.valio.fi/reseptit/mustikkapiirakka/) | 9 | 1 | 0 | Kaikille löytyi sopivia tuotteita |
| [Kanamakaronilaatikko](https://www.k-ruoka.fi/reseptit/kanamakaronilaatikko) | 11 | 2 | 2 | Pirkka Italian yrtit tuorejuustoa; Pirkka emmental-mozzarellajuustoraastetta |
| [Perunamuusi](https://www.valio.fi/reseptit/perunamuusi/) | 4 | 2 | 0 | Kaikille löytyi sopivia tuotteita |
| [Broileri-makaronilaatikko, kananmunaton](https://www.k-ruoka.fi/reseptit/broileri-makaronilaatikko-kananmunaton) | 10 | 3 | 0 | Kaikille löytyi sopivia tuotteita |
| [Kanakeitto](https://www.valio.fi/reseptit/kanakeitto/) | 16 | 6 | 1 | villiriisisekoitusta |

## Korjatut löydökset

- `ps` tarkoittaa pussia; `1 ps (400 g)` säilyttää 400 g määrän. `1 iso (125 g)` ja `2 (n. 300 g)` luetaan oikein. Purjon 15 cm mittaa ei tulkita 15 pakkaukseksi. Sulkeissa oleva vapaaehtoinen aines ei katoa.
- Taivutukset ja puuttuvat ruoka-aineryhmät: timjami, korianteri, persilja, purjo, fenkoli, bataatti, pinaatti, kapris, raejuusto, maitojauhe, villiriisisekoitus ja monet muut.
- Kananjauheliha säilyy kanana; nauta-kana-sekoitus ei kelpaa sen vastineeksi. Hunajamarinoitu fileesuikale vaatii oikean marinadin ja leikkaustyypin. Nauta-sika tunnistetaan sekoitteeksi.
- Sitruunan juomat/makeiset, inkiväärin tonnikala, basilikan vauvanruoka ja voin sipsit poistetaan raaka-ainevaihtoehdoista. Savulohikukko ei kelpaa savuloheksi.
- Tuore, kuivattu ja jauhettu yrtti/inkivääri erotetaan ainesrivin ja mittayksikön avulla. Kokonaiset mausteet säilyvät kokonaisina. Jauhoinen peruna ei muutu kiinteäksi perunaksi.
- Täydentävät haut löytävät mm. murennetun Auran, viherpippurin lyhennetyn `viherpip`-tuotenimen, keitetyt linssit ja juoksevat kasviöljyvalmisteet. Kuorittu tomaatti tunnistetaan myös monikossa.
- Tuorejuuston, juustoraasteen ja marinadin nimetyt maut säilyvät vaatimuksina. Eila/laktoositon maitojuoma ei muutu tavalliseksi maidoksi.
- Munapakkausten M6/XL6-merkinnät luetaan kappalemääriksi.
- Reseptin otsikko voi tarkentaa olemassa olevaa yleistä jauhelihariviä (esim. kanamakaronilaatikko). Nimetty aines on otsikkoa vahvempi. Otsikko ei luo uusia ainesrivejä eikä määriä.

## Uusinta ja regressiot

`node scripts/test-recipe-audit-20.cjs` tarkistaa 20 alkuperäistä aineslistaa, kaikki 195 hakuriviä sekä edellä mainittuja väärien tuotteiden, määrien ja pelkän otsikon regressioita. Tuotefixture on tarkoituksella otos oikeista API-vastauksista: mukana oikeat vaihtoehdot ja edustavat hylättävät tuotteet. Se ei ole täysi kauppaluettelo. Tallennettu `fetchedCount` kertoo alkuperäisen vastauksen koon.

Lisäksi aiemmat 10 reseptin/40 muotovariaation testit, käyttäjän todelliset kala-, sokeri- ja suoladebugit sekä proteiinien käsittely-/säilytysmuototestit ajettiin. TypeScript ja tuotantobuild tarkistetaan ennen commitia.
