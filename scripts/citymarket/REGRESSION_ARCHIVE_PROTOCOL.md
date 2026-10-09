# K-Citymarket tarjouslehtien pysyvä arkistointi ja parserin hyväksymisportti

## Pakollinen arkistointi jokaisesta lehdestä
- Tallenna alkuperäinen lähde muuttumattomana: PDF, julkaisuportaalin HTML/JSON tai sivukohtaiset korkearesoluutioiset kuvat (PNG/WebP). Pelkkä linkki ei riitä, koska vanhat julkaisuosoitteet vanhenevat.
- Tallenna myös lehden tunnus (esim. 41AV), julkaisu- ja voimassaoloajat, sivumäärä, lähde-URL, tiedostojen SHA-256-tiivisteet, parserin versio ja hyväksytty tuotekohtainen tulos (fixture).
- Sivukuvien on katettava **jokainen sivu** ja säilytettävä luettavat tuote-, hinta- ja ehtotekstit. Arkistoi lisäksi rakenteinen lähdeteksti ja mahdolliset koordinaattitiedot, jotta spatiaalista parseria voi ajaa offline myös myöhemmin.
- Säilytä arkisto versionhallinnassa tai pysyvässä objektitallennuksessa; manifestiin tulee osoitin ja tarkistussumma. Älä poista vanhaa lähdeaineistoa uuden lehden tullessa.
- Jos vanhaa lehteä ei enää saa talteen, merkitse se eksplisiittisesti **puuttuvaksi regressiolähteeksi**, älä testatuksi.

## Parserimuutoksen pakollinen ristikkäistestaus
1. Aja **sama ehdotettu parseriversio** uusimman lehden ja jokaisen arkistoidun historiallisen lehden muuttumatonta lähdeaineistoa vasten.
2. Vertaa hyväksyttyihin tuotekohtaisiin odotusarvoihin: tuote, sivu, tarjous- ja normaalihinta, määrä ja yksikkö, €/kg tai €/l, monikappale-ehto, kategoria, voimassaolo ja kuvan kytkentä.
3. Hylkää puuttuvat, ylimääräiset ja kahdentuneet tarjoukset sekä viereisen hintalapun, yksikköhinnan tai monikappaleen kokonaishinnan virheellinen tulkinta.
4. Kaikki poikkeamat selvitetään alkuperäisestä sivusta; korjaa **yleinen sääntö** ja aja **kaikki lehdet uudestaan**. Älä muuta hyväksyttyä fixtureä vain siksi, että testi menisi vihreäksi.
5. Julkaisun portti on **nolla selittämätöntä poikkeamaa**. Pelkkä 90 % kattavuus ei ole hyväksyntä. Jos arkistot ovat puutteelliset, raportoi testikattavuus rehellisesti eikä väitetä koko historiaa läpäistyksi.
6. Varmista lisäksi käyttöliittymästä sekä ostoskorista, että monikappaleen kokonaishinta ja vertailuyksikköhinta pysyvät erillisinä.

## Nykyinen tila (2026-10-09)
- `scripts/citymarket/leaflet-regression-publications.json` sisältää 41AV-hyväksytyn fixture-aineiston.
- 39LV- ja 40AV-lehtien täydelliset jäädytetyt lähteet puuttuvat; nykyinen historiallinen testi ei siis aja niitä kokonaisuudessaan.
- `.github/workflows/kcitymarket-40av-audit.yml` sallii nykyisin 90 % kattavuuden. Tätä ei saa tulkita yllä kuvatun hyväksymisportin läpäisyksi.
- Ennen seuraavaa parserin laajaa muutosta on rakennettava lähdearkisto ja offline-rerun, sitten korjattava viimeisimmän lehden poikkeamat ja ajettava kaikki saatavilla olevat lehdet.
