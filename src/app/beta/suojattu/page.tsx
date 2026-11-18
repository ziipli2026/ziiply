import { redirect } from "next/navigation";
import { hasBetaAccess } from "../../../lib/ziiplyBetaAccess";

export const dynamic = "force-dynamic";

export default async function ProtectedBetaPage() {
  if (!(await hasBetaAccess())) redirect("/beta/kirjaudu");
  return (
    <main style={{maxWidth:720,margin:"5rem auto",padding:24,fontFamily:"system-ui"}}>
      <h1>Ziiplyn suojattu betatila</h1>
      <p>Palvelin on tarkistanut betaistuntosi Neon-tietokannasta.</p>
      <p>Tämä on käyttöoikeussuojauksen testireitti, ei vielä varsinainen Ziiply-sovellus.</p>
      <a href="/beta/aloitus">Takaisin aloitussivulle</a>
    </main>
  );
}
