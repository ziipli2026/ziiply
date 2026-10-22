import type { CitymarketAvailabilityNotice } from "../offerSearch/citymarketAvailability";
export default function CitymarketFailureNotice({ notice, campaignsAvailable = false }: { notice?: CitymarketAvailabilityNotice | null; campaignsAvailable?: boolean }) {
  if (!notice) return null;
  return <p role="status" className="mx-auto my-2 max-w-[48rem] px-2 text-center text-[0.85rem] font-semibold leading-relaxed text-[#68451f]">
    {notice.reason ? `Tarjouslehti ei ole saatavilla. Citymarketin ilmoittama syy: ${notice.reason}` : "Tarjouslehteä ei saatu haettua. Häiriön tarkempi syy ei ole tiedossa."}{" "}
    {campaignsAvailable ? "Kaupan omat tarjoukset voit katsoa Kampanjat-välilehdeltä. " : ""}
    {notice.sourceUrl && <a href={notice.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Lähde: Citymarket</a>}
  </p>;
}
