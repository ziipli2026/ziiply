# Desktop-reseptihaun auditointi – 14.10.2026

Lähtöhaara: `preview/legacy-desktop-ui`, lähtöcommit `d1b0d249`.

## Testin rajaus

Kymmenen verkosta valittua reseptiä ja kustakin neljä kirjoitusasuvarianttia. Aineslistat on siirretty testifixtureihin; otsikoita, rivijakoa ja yksiköiden kirjoitusasuja on tarkoituksella vaihdeltu. Valion sivuilla näkyneet 0 kg:n koristeluainesmäärät käsitellään määrättöminä. Vaihtoehdoista käytetään ensimmäistä ja epävarmuus säilytetään.

Tuotevalinta simuloidaan desktopin samalla järjestysfunktiolla ja korin määrälaskennalla. Simuloitu API palauttaa tunnetut tuotenimet sekä erittäin halpoja vääriä ehdokkaita. Testi valitsee ensimmäisen järjestetyn kelvollisen tuotteen; käyttöliittymässä käyttäjä tekee valinnan. Hinnat ja saatavuus ovat testiarvoja. Live-kauppatuloksia tai käyttöliittymää ei ole vahvistettu: suojattu Vercel-preview palautti 403, ja paikallisen selaimen lataus epäonnistui.

## Tulokset

| Resepti | Ostettavia ainesrivejä | Hakuvaiheita yhdistämisen jälkeen | Ennen korjausta |
|---|---:|---:|---|
| Lohikeitto | 8 | 8 | Ei aineksia |
| Makaronilaatikko | 7 | 7 | Virheellisiä hakusanoja tai ainesotsikoita |
| Pannukakku | 6 | 6 | Ei aineksia |
| Linssikeitto | 12 | 12 | Ei aineksia |
| Kanapasta | 9 | 9 | Virheellisiä hakusanoja tai ainesotsikoita |
| Linssicurry | 10 | 10 | Virheellisiä hakusanoja tai ainesotsikoita |
| Korvapuustit | 13 | 10 | Virheellisiä hakusanoja tai ainesotsikoita |
| Lihapullat ja muusia | 10 | 9 | Virheellisiä hakusanoja tai ainesotsikoita |
| Kreikkalainen salaatti | 7 | 7 | Ei aineksia |
| Tonnikalapasta | 9 | 9 | Virheellisiä hakusanoja tai ainesotsikoita |

Yhteensä 87 tuotevalintaa. Kymmenen alkuperäistapausta ja 40 kirjoitusasuvarianttia läpäisevät tunnistustestit.

## Korjaukset

- Ainesosat-, Tarvitset-, englanninkieliset ja otsikottomat listat sekä yhden rivin listat tunnistetaan.
- Murtoluvut, määrävälit, desimaalipilkku, ruukku-/rasia-/tölkkiyksiköt ja erilliselle riville jääneet tuotenimet säilyvät.
- Ainesryhmien otsikot eivät mene tuotehakuun. Vesi ja pastan keitinvesi ohitetaan.
- Purkkien sisältömäärä, à-merkintä, valutettu paino ja monipakkaus käsitellään määrälaskennassa.
- Hakusana säilyttää ruokalajin vaatimukset, kuten kirjolohen, fetan, kookoskerman, maustamattoman kanan ja laktoosittoman juustokerman.
- Desktopin reseptihaussa käytetään aineskohtaista tuotetyypin tarkistusta ennen hinnan mukaista järjestystä.
- Reseptit eivät enää kulje puhelistan pilkkomisen kautta, joten hakuvaihe ja ainesmäärä pysyvät samassa järjestyksessä.
- Ilman kelvollista osumaa jääneet ainekset ilmoitetaan korissa.

## Simuloidut korit

Määrä = pakkausten määrä. Merkki † tarkoittaa, ettei reseptin yksikköä tai pakkauskokoa voi muuntaa tarkasti; tällöin nykyinen kori käyttää yhtä pakkausta. Esimerkiksi jauhon desilitrojen muuntaminen grammoiksi tarvitsee raaka-ainekohtaisen muunnoksen. Koko tekstin semanttista ymmärtämistä tai kaikkien mahdollisten reseptien virheettömyyttä ei luvata.

### Lohikeitto

Lähde: https://www.valio.fi/reseptit/lohikeitto/

- 1 × Peruna yleisperuna 1 kg
- 1 × Apetit kasvissuikaleet 250 g
- 1 × Meira laakerinlehti 4 g †
- 1 × Meira maustepippuri kokonainen 35 g †
- 1 × Kirjolohifilee 500 g
- 1 × Valio ruokakerma Kolme juustoa 2,5 dl
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Tilli ruukku 1 kpl †

### Makaronilaatikko

Lähde: https://snellman.fi/fi/reseptit/makaronilaatikko/

- 1 × Myllyn Paras tumma makaroni 400 g †
- 1 × Snellman Kunnon naudan jauheliha 10 % 400 g †
- 1 × Sipuli 1 kpl
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Meira mustapippuri kokonainen 35 g †
- 1 × Valio kevytmaito 1 l
- 1 × Kotimaista kananmunia 10 kpl

### Pannukakku

Lähde: https://www.valio.fi/reseptit/pannukakku/

- 1 × Kotimaista kananmunia 10 kpl
- 1 × Valio kevytmaito 1 l
- 1 × Myllyn Paras vehnäjauho 2 kg †
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Dansukker taloussokeri 1 kg †
- 1 × Valio Oivariini juokseva 400 ml

### Linssikeitto

Lähde: https://www.k-ruoka.fi/reseptit/linssikeitto

- 1 × Sipuli 1 kpl †
- 2 × Valkosipuli 1 kpl
- 1 × Kotimaista rypsiöljy 1 l
- 1 × Pirkka curry mausteseos 23 g †
- 1 × Pirkka juustokumina jauhettu 23 g †
- 1 × Inkivääri tuore 100 g †
- 1 × Urtekram punainen linssi kuivattu 400 g †
- 1 × Pirkka kookosmaito 400 ml
- 2 × K-Menu kuorittu tomaatti tomaattitäysmehussa 400/240 g
- 1 × Pirkka tomaattisose 70 g †
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Meira mustapippuri kokonainen 35 g †

### Kanapasta

Lähde: https://www.k-ruoka.fi/reseptit/kanapasta

- 1 × Pirkka kanan fileesuikale maustamaton 400 g
- 1 × Pirkka pennepasta 500 g
- 1 × Sipuli 1 kpl
- 2 × Valkosipuli 1 kpl
- 1 × Kotimaista rypsiöljy 1 l
- 1 × Pirkka curry mausteseos 23 g †
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Meira mustapippuri kokonainen 35 g †
- 1 × Pirkka laktoositon juustokerma 2 dl

### Linssicurry

Lähde: https://www.valio.fi/reseptit/linssicurry/

- 1 × Sipuli 1 kpl
- 3 × Valkosipuli 1 kpl
- 1 × Inkivääri tuore 100 g †
- 1 × Santa Maria punainen currytahna 110 g †
- 1 × Valio Oivariini juokseva 400 ml
- 1 × Pirkka tomaattimurska 400 g
- 1 × Dansukker taloussokeri 1 kg †
- 1 × JOZO jodioitu hienosuola 1 kg †
- 3 × GoGreen punainen linssi esikeitetty 380/230 g
- 1 × Santa Maria kookoskerma 250 ml

### Korvapuustit

Lähde: https://www.valio.fi/reseptit/korvapuustit/

- 1 × Suomen Hiiva hiiva 50 g
- 1 × Valio kevytmaito 1 l
- 1 × Kotimaista kananmunia 10 kpl †
- 1 × Dansukker taloussokeri 1 kg †
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Meira kardemumma 8 g †
- 1 × Myllyn Paras vehnäjauho 2 kg †
- 1 × Valio Oivariini normaalisuolainen levite 400 g
- 1 × Meira kaneli 37 g †
- 1 × Meira mantelirouhe 80 g †

### Lihapullat ja muusia

Lähde: https://www.valio.fi/reseptit/lihapullat-ja-muusia/

- 1 × Valio Oivariini juokseva 400 ml
- 1 × Oolannin perunamuusiaines 400 g
- 1 × JOZO jodioitu hienosuola 1 kg †
- 1 × Valio ruokakerma Kolme sipulia 2,5 dl
- 1 × Varsiparsakaali 150 g
- 1 × Snellman Kunnon naudan jauheliha 10 % 400 g
- 1 × Valio Koskenlaskija Ruoka & Dippi jalapeno-cheddar 250 g
- 1 × Kotimaista kananmunia 10 kpl
- 1 × Myllyn Paras korppujauho 400 g †

### Kreikkalainen salaatti

Lähde: https://www.k-ruoka.fi/reseptit/kreikkalainen-salaatti

- 1 × Pirkka kirsikkatomaatti 250 g
- 1 × Kurkku 1 kpl †
- 1 × Punasipuli 1 kpl †
- 1 × Vihreä paprika 1 kpl †
- 1 × Pirkka Parhaat kalamataoliivi 200 g †
- 1 × Pirkka Parhaat fetajuusto 150 g
- 1 × Meira oregano 5 g †

### Tonnikalapasta

Lähde: https://www.valio.fi/reseptit/tonnikalapasta/

- 1 × Pirkka pennepasta 500 g
- 1 × Valio Oivariini juokseva 400 ml
- 1 × Sipuli 1 kpl
- 1 × Pirkka tomaattipyree 70 g †
- 1 × Tomaatti 1 kpl †
- 1 × Pirkka tonnikala paloina 185/140 g
- 1 × Sicilia sitruunamehu 200 ml
- 1 × Valio Koskenlaskija viherpippuri sulatejuusto 250 g
- 1 × Tilli ruukku 1 kpl †

## Toistaminen

```sh
node scripts/test-recipe-search.cjs
```

Muut tarkistukset: TypeScript, tuotanto-build, normaalihakujen fallback-testit ja hakusivutuksen 10 regressiotapausta.
