# Arvo – terveystietointegraation toteutussuunnitelma (vaihe 1)

Tila: suunnittelu / ei tuotantokäytössä. Kohteet: Apple Health (HealthKit) ja Android Health Connect.

## Tietojen kulku
- Nykyinen Next.js-verkkosivu ei voi lukea HealthKitiä tai Health Connectia suoraan.
- Erillinen iOS-/Android-natiivikomponentti pyytää käyttöjärjestelmän oikeudet.
- Natiivikomponentti lähettää vain käyttäjän sallimat tiedot kirjautuneen käyttäjän suojattuun rajapintaan.
- Palvelin normalisoi mittayksiköt, lähteen, aikavyöhykkeen ja päivämäärän sekä estää päällekkäiset havainnot.
- Arvon ruokapäiväkirja toimii myös ilman terveystietoyhteyttä.

## Nimenomainen suostumus
1. Vahvistettu kirjautuminen ennen käyttöönottoa.
2. Selkeä, versionumerolla yksilöity terveystietojen tietosuojaseloste: rekisterinpitäjä ja yhteystiedot, tietoryhmät, tarkoitukset, vastaanottajat/käsittelijät, säilytysajat, poistaminen, oikeudet ja mahdolliset siirrot.
3. Erilliset oletuksena tyhjät valinnat: selosteen lukemisen kuittaus ja nimenomainen terveystietojen käsittelysuostumus.
4. Suostumus on tietoryhmittäinen; uni ja syke eivät kuulu automaattisesti peruslupaan.
5. Palvelin kirjaa käyttäjä-ID:n, aikaleiman, selosteen version, tarkoitukset, tietoryhmät ja suostumustapahtuman. Ei IP-osoitetta tai raakaterveystietoja suostumuslokiin ilman erillistä perustetta.
6. Vasta tämän jälkeen natiivin käyttöjärjestelmän oikeuspyyntö. OS-oikeus ei yksin korvaa GDPR-suostumusta.
7. Peruuttaminen pysäyttää synkronoinnin heti; erillinen tietojen poistopyyntö ja toteutumisen seuranta. Myös OS-oikeuksien peruuttaminen on ohjeistettava.
8. Kieltäytyminen ei estä Arvon muita ominaisuuksia.

## Turva- ja laatukriteerit
- Ei terveystietoja localStorageen, analytiikkatapahtumiin, URL-parametreihin tai palvelinlokeihin.
- Käyttäjäkohtainen pääsynhallinta palvelimella, salaus siirrossa ja levyllä, minimointiperiaate ja säilytyskäytäntö.
- Ei markkinointiprofilointia eikä mainonnan kohdentamista terveystiedoilla.
- Suostumuksen version muuttuessa arvioidaan uuden suostumuksen tarve.
- Käyttäjä voi tarkastella yhteyden tilaa, viimeistä synkronointia, tietoryhmiä ja suostumushistoriaa.
- Laskennassa aktiivista energiaa ei lasketa kahdesti kokonaiskulutukseen.
- Tietosuojavaikutusten arvioinnin (DPIA) tarve arvioidaan ennen käyttöönottoa.

## Seuraavat toteutusvaiheet
2. Tietosuojaselosteen juridinen luonnos ja UI-näkymä; hyväksyntä vain palvelimen kautta.
3. Neon-migraatiot: health_consents, health_connections, health_daily_summaries ja poisto-/peruutusloki; käyttöoikeustestit.
4. Auth-sidotut API-reitit: consent/grant, consent/revoke, status, data/delete, ingest.
5. iOS HealthKit -silta ja Android Health Connect -silta; järjestelmän käyttöoikeuspyynnöt.
6. Arvon tilastot ja ravintolaskurin yhteenveto.
7. Automaattitestit, tietosuojatarkistus, laitetestaus ja erillinen julkaisuhyväksyntä.

Huomio: tämä dokumentti ei toteuta eikä aktivoi yhteyksiä.
