import type { CitymarketAvailabilityNotice } from "../offerSearch/citymarketAvailability";
export default function CitymarketFailureNotice({ notice, campaignsAvailable = false }: { notice?: CitymarketAvailabilityNotice | null; campaignsAvailable?: boolean }) {
  if (!notice) return null;
  return <div role="alert" className="my-2 shrink-0 rounded-xl border-2 border-amber-700 bg-amber-50 p-3 text-sm font-bold leading-snug text-amber-950">
    <p>Tarjouslehteä ei saatu ladattua. {notice.reason ? `Citymarketin ilmoitus: ${notice.reason}` : "Tarkempi syy ei ole tiedossa."}</p>
    {campaignsAvailable && <p className="mt-2">Verkkosivujen tarjoukset löydät Kampanjat-välilehdeltä.</p>}
    {notice.sourceUrl && <a href={notice.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline">Citymarketin häiriöilmoitus</a>}
  </div>;
}
