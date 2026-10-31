# Neonin ja normaalin tuotehaun live-testit

Ensimmäinen sarja sisältää 100 yleistä elintarvikehakua. Laajennus sisältää 900 muuta tuotenimihakua: yhdeksän 100 haun erää, 900 erillistä vertailu-EANia eikä yhtään ensimmäisen sarjan hakusanan toistoa. Nämä ovat oikeista luettelotuotteista muodostettuja nimihakuja, eivät 900 yksisanaista elintarvikeryhmää. Painot ja pakkausmäärät on poistettu ja nimestä säilytetty enintään kuusi sanaa. Otosta ei ole valikoitu testattavan hakusuodattimen hyväksymien tuotteiden mukaan.

| Erä | Tuoteryhmä |
|---|---|
| 1 | Maitotuotteet, juustot ja rasvat |
| 2 | Liha ja lihavalmisteet |
| 3 | Kalat ja kalavalmisteet |
| 4 | Kasvikset ja juurekset |
| 5 | Hedelmät ja marjat |
| 6 | Leivät ja leipomotuotteet |
| 7 | Viljatuotteet ja kuivaruoat |
| 8 | Juomat, kahvit ja teet |
| 9 | Pakasteet, mausteet ja muut elintarvikkeet |

## Käynnistys GitHubista

1. Avaa https://github.com/ziipli2026/ziiply/actions/workflows/ziiply-live-relevance-audit.yml.
2. Paina **Run workflow** ja valitse **Use workflow from: preview/legacy-desktop-ui**. Tämä haaravalinta on välttämätön: main-haarassa samalla polulla on aiempi 127 tuotteen testi.
3. Paina **Run workflow**. Oikean ajon nimi on **Neon 900 named-food searches on desktop preview**.
4. Yhdeksän `audit`-työtä ajavat kukin oman 100 haun erän. Ne ajetaan peräkkäin. Yksittäisen epäonnistuneen työn voi uusia GitHubin **Re-run jobs** -valikosta.
5. Katso `report`-työn yhteenveto ja `neon-900-complete-report`-artefakti. Jokaisella erällä on lisäksi oma JSON-artefakti.

Käynnistys käyttää jo main-haarassa rekisteröityä workflow-polkua. Sovelluksen main-haaraa ei muuteta.

## Tarkistukset

Ajo lukitsee desktopin kestolinkin READY-julkaisun yksilölliseen osoitteeseen ja varmistaa, että julkaistut haku- ja asiakastiedostot vastaavat valitun haaran lähdettä. Kaikki yhdeksän erää käyttävät samaa julkaisua.

Kustakin hausta tallennetaan alkuperäiset Neon-ehdokkaat, normalisoidut desktop-Neon-tulokset sekä oikean `runDesktopNormalSearch`-käsittelijän muodostama tulos live-kauppavastauksista. Nimihakujen lisäksi jokaisella uudella tapauksella on aiemmin luettelosta havaittu vertailu-EAN. Sen puuttuminen normalisoidusta Neon-hausta on virhe.

Näytettävien tuotteiden nimen vastaavuus, positiivinen hinta ja nouseva ostohintajärjestys tarkistetaan. Jos tuotteen havaittiin aiemmin olevan hinnallinen valituissa Hyvinkään S- ja K-kaupoissa, tyhjä normaali tulos merkitään tarkistettavaksi virheeksi. Muille tuotteille hinnan puuttuminen kirjataan saatavuus-/hakukattavuushavaintona, koska Neon-luettelossa oleminen ei takaa valitun myymälän saatavuutta.

Luettelon alkuperäiset raakakandidaatit voivat sisältää laajoja osumia ja hinnattomia metatietoja. Ne raportoidaan erikseen, eivätkä ne saa päätyä normaalin haun hinnalliseen lopputulokseen. Testi käyttää aitoa hakukäsittelijää mutta ei automatisoi selaimen piirtämistä. Erillinen ravintotietojen rikastus on rajattu tämän hakutestin ulkopuolelle. Kaikki testit ovat lukevia.
