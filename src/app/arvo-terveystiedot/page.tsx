export default function ArvoHealthPage() {
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 text-[#173b2b]">
    <a href="/arvo-tilastot" className="underline">← Arvon tilastot</a>
    <h1 className="text-3xl font-black">Terveys ja aktiivisuus</h1>
    <p>Apple Health -seuranta toimii Ziiply Arvo -iPhone-sovelluksessa. Avaa sovelluksen Terveys-välilehti tai paina sen ravintotilastoissa Avaa terveystietojen seuranta.</p>
    <section className="space-y-3 rounded-xl border border-[#d3c9ad] bg-[#f8f5ed] p-4">
      <h2 className="text-xl font-bold">Sinä päätät luettavat tiedot</h2>
      <p>Sovellus näyttää tietosuojatiedot ja pyytää erikseen nimenomaisen suostumuksesi ennen Applen lukulupia. Voit valita askeleet, aktiivisuusenergian, leposykkeen, sykevälivaihtelun sekä unen ja univaiheet.</p>
      <p>Seurannassa voit valita päivän, 7 päivää tai 30 päivää. Tietoja käsitellään vain iPhonella, eikä niitä lähetetä tälle verkkosivulle tai Ziiplyn palvelimelle.</p>
      <p>Voit perua luvan ja tyhjentää luetut tiedot sovelluksessa. Myös Terveys-välilehdeltä poistuminen tyhjentää tiedot. Applen lukuluvat voi muuttaa Terveys-sovelluksesta.</p>
    </section>
    <p className="text-sm">Safari ja kotinäyttöön tallennettu verkkosivu eivät voi lukea Apple Healthia. iPhone-versio asennetaan tällä hetkellä Xcoden kautta; julkista App Store -versiota ei vielä ole. Android Health Connect -sovellus on vielä kesken.</p>
    <p className="text-sm">Ravintotilastot tallentuvat sovelluksen omaan verkkonäkymään. Safarissa aiemmin kirjatut ateriat eivät siirry sinne automaattisesti.</p>
  </main>;
}
