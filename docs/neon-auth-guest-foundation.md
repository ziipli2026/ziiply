# Ziiply: vierastila ja Neon Auth — kehityspohja

Tarkastus 9.10.2026. Päähaaran lähtöcommit `9dc95022db91992d2cadf9b284323aaa37ac666b`.
Desktop tarkastettu haarasta `preview/legacy-desktop-ui`, commit `ffd40c93c6ecb16eb27c3ef59d4a5184d069419b`.
Kehityshaara `dev/neon-auth-guest-foundation` perustuu mainiin; desktop-haaraa ei yhdistetä tai muuteta.

## Tarkastettu lähtötilanne

Repossa ei ollut käyttäjien kirjautumista, henkilökohtaista omistajuusmallia tai Auth-riippuvuutta. Next 15.5.9, React 19.1.1, Neon serverless SQL. PWA-asennus ei luo tunnusta eikä takaa saman localStoragen jakamista Safarin ja asennetun PWA:n välillä. Tallennus on selain-/origin-kohtaista; preview-osoitteella ei näy tuotanto-originin vieraskoria.

| Tieto | Mobiili / main | Desktop / preview |
|---|---|---|
| Aktiivinen kori | localStorage `ziiply-cart-v1`, legacy array tai `{version:2,savedAt,items}` | sessionStorage `ziiply-desktop-current-cart-v1`, array |
| Tallennetut listat | localStorage `ziiply-saved-shopping-lists-v1`, `{version:1,savedAt,lists}` | localStorage `ziiply-desktop-ostelusvihko-v1`, array |
| Keräilymerkinnät | `ziiply-shopping-checks-v1`, erillinen hydratointi | aktiivisen korin tiedot; ei erillistä samannimistä pysyvyyttä |
| Vertailu | `ziiply-comparison-snapshot-v1`, esitysmuisti v821 | desktopin oma state; ei yhteistä tilimallia |
| Kauppavalinnat | `ziiply-store-selection-v536`, manuaaliohjaukset v786/v791; sisältää myös GPS-tietoja | nykyinen desktopin kauppavalintalogiikka |
| Haku/cache | sessionStorage normaalihaussa; sää/sähkö/EAN-muistit localStoragessa | sessionStorage tarjouscache |

Mainin palautus varmistaa hydratoinnin ennen tyhjien oletusarvojen kirjoitusta. Kori, kaupat ja vertailusnapshot palautetaan yhdessä. Nämä efektit ja vertailuhinnat jätettiin koskemattomiksi. Desktopin aktiivinen kori ja mobiilikori ovat eri formaatteja: niitä ei pidä yhdistää naiivisti eikä vaihtaa avaimia ennen yhteisen CartItem-sopimuksen regressiotestejä.

Neon: projektin `floral-recipe-40673204` oletuskannasta luettiin vain information_schema-taululuettelo. Löytyivät public-taulut `ziiply_ean_products`, `ziiply_lidl_ean_prices`, `ziiply_fuel_stations`, `ziiply_fuel_price_observations`, `ziiply_offer_publications`, `ziiply_publication_run_log`, `ziiply_skaupat_protocol`, `playing_with_neon`. Ei `neon_auth`-skeemaa tai henkilökohtaisia koritauluja. Tämä tarkastus ei todenna muiden Neon-haarojen tilaa.

`src/lib/eanBank.ts` ja `skaupatProtocol.ts` sekä EAN-/Lidl-API:t käyttävät palvelimella DATABASE_URL:ia yhteiseen tuoteaineistoon. `api/ean-scan-events` tekee taulun luontia ajon aikana; uuteen tilijärjestelmään tätä toimintatapaa ei kopioida. Käyttäjätilien tietoja ei yhdistetä EAN-havaintoihin, analytiikkaan tai polttoainekantaan tässä muutoksessa.

## Toteutettu kehityspohja

- `/account-lab`: vapaaehtoinen kehitysnäkymä. Vierastila, sähköpostirekisteröinti ja kirjautuminen, Google, istunnon palautus ja uloskirjautuminen SDK:n kautta. Ei pakollista kirjautumista eikä globaalia redirect-middlewarea.
- `/api/auth/[...path]`: Neonin oma same-origin Next SDK -proxy; SDK hoitaa HTTP-only-session/callback-käytännöt. Ei salasanoja/JWT:tä localStorageen.
- `guest.ts`: paikallinen satunnainen vierastunniste, estetty/corrupt storage sallii käytön edelleen. Tunniste ei ole palvelimen käyttöoikeus. Moduulia ei asenneta nykyisten näkymien mount-polkuun.
- `/api/account/import`: GET palauttaa vain palvelimella tunnistetun käyttäjän 20 viimeisintä tuontia ilman jaettua cachea. POST on vain käyttäjän erikseen käynnistämä, same-origin tarkistus ja palvelimen SDK-istunto. user_id tulee istunnosta, ei pyynnöstä. Tallentaa deduplikoidun snapshotin; ei poista paikallista dataa eikä korvaa tilin koria. Tiedot ovat varmuuskopio, eivät vielä aktiivinen pilvikori.
- Tiukka tuontiavainten sallintalista, formaatti- ja kokorajat. Ei kauppavalinta/GPS-, analytiikka-, hintavertailu- tai cache-avainten massatuontia. Korin omat hinnat voivat olla snapshotissa historiallisina tietoina, mutta niitä ei saa myöhemmin ottaa nykyhinnoiksi ilman alkuperäisen kaupan ja tuoreuden tarkistusta.
- Manuaalinen SQL-tiedosto omaan `ziiply_accounts`-skeemaan. Sovellus ei tee DDL:ää. RLS päällä ilman selainroolille annettuja policyja; palvelinroolin käyttö ja omistajuus pitää auditoida ennen lisä-CRUDia. Neon SQL-omistajarooli voi ohittaa RLS:n, joten palvelimen user_id-rajaus on aina pakollinen.
- Flag oletusarvoisesti pois; VERCEL_ENV=production estää tämän toteutuksen myös flagin ollessa päällä. Tuonti käyttää yksinomaan erillistä ZIIPLY_ACCOUNT_DATABASE_URL:ia ja ennalta määritettyä endpoint-hostia; sama tuote-endpoint estetään myös pooled/direct-osoitteen eroista huolimatta.

## Apple ja vierastilin yhdistäminen

Neonin live OAuth-ohje listaa Google/GitHub/Vercel, ei Applea. Anonyymi Data API JWT ei ole pysyvä vieraskäyttäjä tai Better Auth anonymous-account plugin. Siksi ei toteuteta keksittyä signIn.anonymous/linkAnonymous-API:a eikä Apple-nappia, joka ei toimi.

Vieraan paikallinen aineisto kopioidaan vasta todennetulle tilille. Käyttäjän ei tarvitse ensin luoda palvelimen vierastiliä. Sama tili toisella laitteella antaa myöhemmin pääsyn pilvikoriin; paikallisen vierastunnisteen kopioiminen ei saa antaa pääsyä.

Jos Apple on ehdoton, ratkaise ennen Auth-tuotantovalintaa: vahvista Managed Apple -tuki Neonilta tai käytä Neoniin tallentavaa itse hallittua Better Authia tuetulla Apple-providerilla. Tämä on tietoinen vaihtoehtoinen arkkitehtuuripäätös, ei tässä toteutettu integraatio. Google/sähköpostitilien linkitys jo olemassa olevaan tiliin pitää testata erikseen; pelkkä sama sähköpostiosoite ei oikeuta yhdistämistä.

## Kehityksen käyttöönotto — toteutettu 9.10.2026

Erillinen Neon-kehityshaara `dev-ziiply-auth-20261009`, id `br-spring-truth-b137mloi`, luotiin projektin main-haarasta. Managed Better Auth aktivoitiin ja manuaalinen migraatio ajettiin vain kehityshaaraan. `neon_auth` ja `ziiply_accounts.guest_imports` ovat testikannassa. Tuotannon main-haarasta tehty read-only-jälkitarkastus vahvisti, ettei sinne tullut kumpaakaan skeemaa.

Kehitystestissä käytetään erillisiä asetuksia: ZIIPLY_ACCOUNT_LAB=true, VERCEL_ENV=preview, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET (32+ merkkiä), ZIIPLY_ACCOUNT_DATABASE_URL, ZIIPLY_ACCOUNT_DATABASE_HOST ja ZIIPLY_ACCOUNT_ORIGIN. Esimerkiksi testiorigin `http://127.0.0.1:3222` pitää asettaa täsmälleen ja sallia Neonin trusted domains -asetuksessa. POST ei luota pyynnön Host/forwarded-host-arvoon. Kehityksen alkuperäistä DATABASE_URL:ia ei käytetä käyttäjätilien yhteyteen.

Neon-kehityshaaran sähköpostirekisteröinti on käytössä ilman varmennusta ja Google käyttää Neonin jaettuja kehitystunnuksia. Integraatiotestit loivat synteettisiä `example.invalid`-käyttäjiä; oikeille ihmisille ei lähetetty viestejä. Tuotanto edellyttää sähköpostivarmennuksen ja toimituksen testaamista, omia Google OAuth -tunnuksia ja SMTP-asetuksia. Googlen palveluntarjoajan callback on Auth-haaran `/callback/google`, myöhempi sovelluksen callback on `/account-lab`.

SDK on lukittu versioon 0.5.0-beta ja kehityshaara Next 16.4.0:aan SDK:n ilmoittaman Next-peer-vaatimuksen mukaisesti. React säilyi 19.1.1:ssä. Build käyttää Webpackia ja ESLint-konfiguraatio päivitettiin Next 16:n flat-muotoon. `.npmrc`-poikkeus poistettiin; tavallinen `npm ci --dry-run --ignore-scripts` hyväksyttiin. Transitiivinen API-key-paketti on rajattu SDK:n Better Auth 1.6.23 -versioon. Käyttämättömän UI-riippuvuuden better-call-peer-varoitus jää asennukseen; tämä riippuvuusketju pitää tarkistaa vielä ennen tuotantomuutosta.

Next-päivitys on vain käyttäjähallinnan kehityshaarassa. Mainia tai desktop-preview-haaraa ei päivitetty tai yhdistetty. Next-päivityksen tuotantovalmiutta ei päätellä pelkästä buildista; koko olemassa oleva mobiili- ja desktop-käyttö pitää testata ennen mahdollista myöhempää yhdistämistä.

Kehitysnäkymä luo vierastunnisteen vain paikallisesti ja näyttää tallennuksen saatavuuden Reactin ulkoisen store-rajapinnan kautta. Tilin varmuuskopioiden määrä sidotaan näytössä nykyiseen käyttäjään. Testinäkymää ei ole kytketty pääruutujen pakolliseksi vaiheeksi.

## Seuraava vaihe

Yhteinen versioitu kori/lista/keräily-sopimus; palvelimen user_id-kohtaiset CRUD-reitit; revision/optimistic-locking ja offline-jonon idempotenssi. Tuonti on käyttäjäkohtainen, uudelleenyrityksessä deduplikoitu ja lähdekohtainen; olemassa olevan tilin ja vieraan koreja ei yhdistetä rivikohtaisesti automaattisesti. Säilytä lähde ja tuotetyyppi (tarjous/normaalihaku/tuntematon/painotuote), määrä ja keräilymerkinnät. Tilinvaihdossa omat namespace-avaimet, vanhan käyttäjän datan tyhjennys muistista, vierastilan palautus ilman toisen tilin tietoja.

Valinnat synkronoidaan erillisellä sallintalistalla myöhemmin. GPS:n lupaa/koordinaatteja, tämän laitteen käsivalintaa tai hintacachea ei siirretä automaattisesti toiselle laitteelle. Ei muuteta Yksi/Monta-vertailun sääntöjä tai Göstan preloadeja.

Pakollinen jatkotestimatriisi: Safari + iOS asennettu PWA + Android PWA + desktop; vapaaehtoinen kirjautuminen; email-verification/OAuth callback ja reload; offline/vanhentunut istunto; kahden tilin eristys; olemassa olevan tilin tuonti, toistot ja rinnakkaispyynnöt; uloskirjautuminen ja tilinvaihto; mobiili/desktop-korit, painotuotteet, keräily ja vertailu ennen/jälkeen. Sähköpostivarmennus/toimitus, Googlen varsinainen suostumus/callback selaimessa, Apple ja aktiivisten korien laitesynkronointi eivät ole vielä todennettuja.

Lähteet: https://neon.com/docs/auth/guides/setup-oauth.md ; https://neon.com/docs/auth/quick-start/nextjs-api-only.md ; https://neon.com/docs/auth/guides/plugins.md ; asennetun SDK:n tyyppimäärittelyt.

## Toteutuksen tarkastukset

- `npm run test:account`: 6/6 hyväksytty (vierastunniste, estetty/corrupt storage, mobiili/desktop-snapshot, väärät avaimet/formaatti/kokoraja, kantaendpointin eristys, tuotantoeston flag).
- `npm run test:account:neon`: 19/19 oikeaa integraatiotarkastusta kehityshaarassa. Ei-kirjautuneen luku/kirjoitus estyvät; vieras origin estyy; sähköpostirekisteröinti ja cookie-istunnon palautus toimivat; korituonti ja idempotentti retry toimivat; omat varmuuskopiot palautuvat ilman jaettua cachea; väärennetyt cookiet, väärä salasana, virheellinen ja liian suuri tuonti estyvät; toinen käyttäjä ei voi lukea ensimmäisen tietoja edes user_id-parametrilla; pyynnön user_id ei muuta omistajaa; sama sisältö kuuluu erikseen kummallekin käyttäjälle; uloskirjautuminen estää pääsyn ja uudelleenkirjautuminen palauttaa omat tiedot. Google OAuth -aloitus palauttaa odotetun Neonin `/sign-in/social/init`-osoitteen.
- TypeScript, account-tiedostojen kohdennettu ESLint ja Next 16 -build hyväksytty. Npm-asennuksen dry-run hyväksytty ilman legacy-peer-deps-asetusta.
- Kolme olemassa olevaa eristettyä regressioajoa hyväksytty: painotuotteen koripalautus, vertailun sentti/euro-rajat ja Göstan monipakkaushinnat. Nämä ovat lähde-/yksikkötarkastuksia, eivät laajaa selainregressiota.
- `npm run test:account:http`: 12/12 HTTP-tarkastusta hyväksytty Next 16 -palvelimella. Sekä oletusarvoisesti pois päältä että tuotantoflagin kanssa pääruutu ja PWA-manifest pysyvät julkisina (200); account-lab, Auth ja korituonnin GET/POST pysyvät estettyinä (404). Testissä ei ollut Auth-/SQL-yhteysasetuksia.
- Tuotanto-mainin read-only-skeematarkastus: neon_auth=false, ziiply_accounts=false.

Integraatiotestit käyttävät oikeaa Auth- ja SQL-palvelua vain erillisessä kehityshaarassa. Selaimen OAuth-suostumusta, iOS/Android-PWA:ta ja aktiivisen korin laitesynkronointia ei näillä HTTP-testeillä todenneta. Tuodut snapshotit ovat tilin varmuuskopioita, eivät vielä nykyisten mobiili-/desktop-korien automaattinen pilvisynkronointi.
