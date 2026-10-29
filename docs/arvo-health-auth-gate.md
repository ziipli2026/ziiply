# Arvo Health – palvelintunnistuksen käyttöönoton portti

Tila: ESTETTY. Ei tuotantoon.

## Havainto
Koodikannan alustavassa tarkistuksessa ei löytynyt Ziiplyn käyttäjäkirjautumisen vahvistettua palvelinpuolen sessiontarkistinta. Control Centerin middleware ei yksin osoita, että Arvon kuluttajakäyttäjällä olisi turvallinen identiteetti. Älä käytä localStorage-arvoa, sähköpostiosoitetta, pyyntörungon user_id:tä tai asiakkaan lähettämää headeria tunnistautumisena.

## Edellytykset ennen consent-rajapinnan aktivointia
1. Valitaan tuotannon käyttäjäidentiteetin lähde ja dokumentoidaan sen palvelinpuolen session validointi.
2. API palauttaa 401 ilman vahvistettua sessiota; käyttäjätunnus johdetaan vain palvelimelta.
3. POST hyväksyy vain tuetun, versionoidun selosteen sekä eksplisiittiset tarkoitukset ja tietoryhmät. Oletuksena ei mitään lupaa.
4. Kirjoitus tallentaa muuttumattoman auditointitapahtuman Neoniin; POST ja DELETE ovat idempotentteja hallitusti.
5. DELETE estää välittömästi myöhemmän ingestin ja merkitsee yhteyden peruutetuksi; poistopyyntö on erillinen, seurattava prosessi.
6. CSRF-/origin-tarkistukset, nopeusrajoitus, no-store-vastaukset, turvallinen lokitus ja käyttäjäkohtaiset DB-oikeudet.
7. Testit: anonyymi, väärä käyttäjä, vanhentunut seloste, tyhjä suostumus, peruutuksen jälkeinen ingest, rinnakkaiset pyynnöt.
8. Erillinen juridinen tarkistus ennen kuin todellista suostumusta voidaan kerätä.

## Nykytila
src/app/api/arvo/health/consent/route.ts palauttaa kaikille metodeille 503. Tämä on tarkoituksellinen fail-closed-toteutus eikä toimiva suostumuspalvelu.
