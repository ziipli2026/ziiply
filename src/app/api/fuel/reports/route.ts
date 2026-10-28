import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {fuelPhotoEvidenceLocation,comparePhotoEvidence,fuelPhotoStationDistanceLimit,validPhotoLocation,validateFuelStationLocation,validateFuelPrices,type PhotoEvidence} from "../../../../lib/fuelPhoto";
import {fuelDatabaseConfig} from "../../../../lib/fuelDatabase";
import {recordFuelPhotoCorrection} from "../../../../lib/fuelPhotoLearning";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  // Production collection is enabled only after the registry migration is verified.
  const database=fuelDatabaseConfig();
  if(!database.connection)return NextResponse.json({error:"Hintailmoitukset eivät ole tällä hetkellä käytettävissä."},{status:503});
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Virheellinen lähetyslähde."},{status:403});
  if(Number(req.headers.get("content-length")||0)>1600000)return NextResponse.json({error:"Kuva on liian suuri."},{status:413});
  try{
    const text=await req.text();if(text.length>1600000)return NextResponse.json({error:"Kuva on liian suuri."},{status:413});
    const body=JSON.parse(text);const prices=validateFuelPrices(body.prices);const date=Date.parse(body.observedAt);
    const stationId=Number(body.stationId);const manual=body.mode==="manual";
    const validPhoto=manual?body.photo==="":typeof body.photo==="string"&&body.photo.length<=1500000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(body.photo);
    if(body.confirmed!==true || !prices || !Number.isSafeInteger(stationId)||stationId<1 || !Number.isFinite(date)||date>Date.now()+60000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id||"") || !validPhoto || !["online","offline","manual"].includes(body.mode)||!["photo_exif","capture_session","manual"].includes(body.timeSource)||!["photo_exif","capture_session","manual"].includes(body.locationSource))return NextResponse.json({error:"Tarkista kuva, hinnat, asema ja havaintoaika."},{status:400});
    // Reject obvious placeholder/troll reports before any database write.
    const entered=Object.values(prices);
    if(entered.length>=2 && entered.every(value=>value===entered[0])){
      return NextResponse.json({error:"Epäuskottava hintailmoitus: eri polttoainelajeille on annettu sama hinta. Tarkista hinnat.",rejected:true},{status:422});
    }
    if(entered.some(value=>value===3)){
      return NextResponse.json({error:"Hinta 3,000 €/l vaatii tarkistuksen eikä sitä julkaista automaattisesti.",rejected:true},{status:422});
    }
    const gps=body.gps;
    if(gps && !validPhotoLocation(gps))return NextResponse.json({error:"Virheellinen kuvan sijainti."},{status:400});
    if(body.mode==="offline" && (body.locationSource==="capture_session"||body.timeSource==="capture_session"))return NextResponse.json({error:"Vanhan kuvan tietoja ei saa korvata lähetyshetken tiedoilla."},{status:400});
    const evidence=(body.evidence||{photoGps:null,deviceGps:null,photoTime:null,captureTime:null}) as PhotoEvidence;
    if((evidence.photoGps&&!validPhotoLocation(evidence.photoGps))||(evidence.deviceGps&&!validPhotoLocation(evidence.deviceGps))||(evidence.photoTime&&!Number.isFinite(Date.parse(evidence.photoTime)))||(evidence.captureTime&&!Number.isFinite(Date.parse(evidence.captureTime))))return NextResponse.json({error:"Virheelliset kuvan vertailutiedot."},{status:400});
    if(body.mode==="offline"&&(evidence.deviceGps||evidence.captureTime))return NextResponse.json({error:"Offline-kuvalle ei käytetä lähetyshetken paikannusta."},{status:400});
    if(manual&&(body.timeSource!=="manual"||body.locationSource!=="manual"||gps||evidence.photoGps||evidence.deviceGps||evidence.photoTime||evidence.captureTime||body.conflictConfirmed===true))return NextResponse.json({error:"Käsinsyötetty ilmoitus ei voi sisältää kuvan tai kuvaushetken vahvistustietoja."},{status:400});
    const comparison=comparePhotoEvidence(body.mode,evidence);
    if(comparison.reasons.length&&body.conflictConfirmed!==true)return NextResponse.json({error:"Vahvista kuvattu asema ja kuvausaika erikseen: tiedoissa on ristiriita."},{status:400});
    const sql=neon(database.connection);
    const branch=await sql`SELECT current_setting('neon.branch_id',true) AS id`;
    if(branch[0]?.id!==database.expectedBranch)return NextResponse.json({error:"Tankkauskannan varmistus epäonnistui."},{status:503});
    const station=await sql`SELECT source, source_station_id,latitude,longitude FROM ziiply_fuel_stations WHERE source_station_id=${stationId} AND lower(coalesce(name,'')||' '||coalesce(chain,'')) NOT LIKE '%teboil%' LIMIT 1`;
    if(!station.length)return NextResponse.json({error:"Asemaa ei löytynyt."},{status:400});
    const stationLocation=validateFuelStationLocation(body.mode,evidence,station[0] as {latitude:number;longitude:number},body.stationSelectedManually===true);
    if(!stationLocation.ok)return NextResponse.json({error:stationLocation.error,distanceM:stationLocation.distanceM,maxDistanceM:fuelPhotoStationDistanceLimit(fuelPhotoEvidenceLocation(body.mode,evidence))},{status:409});
    // Retain only the newest price per station and fuel type. Ignore stale submissions.
    const newest=await sql`SELECT fuel_type,MAX(observed_at) AS latest FROM ziiply_fuel_price_observations WHERE source_station_id=${stationId} AND source <> 'tankkaus.com' AND id NOT IN (1840,1841,1845,1846,1847) GROUP BY fuel_type`;
    const latestByFuel=new Map(newest.map(row=>[String(row.fuel_type),new Date(String(row.latest)).getTime()]));
    const currentPrices:Record<string,number>={};
    for(const [key,fuel] of [["price95","95"],["price98","98"],["diesel","diesel"]] as const){
      if(prices[key]!=null && date>(latestByFuel.get(fuel)??-Infinity))currentPrices[key]=prices[key];
    }
    if(!Object.keys(currentPrices).length)return NextResponse.json({ok:true,stale:true,published:[],message:"Uudemmat hintatiedot ovat jo rekisterissä.",environment:database.production?"production":"test"});
    // Compare only against existing non-placeholder observations; questionable prices await review.
    const baselines=await sql`SELECT fuel_type,price_eur_per_litre FROM ziiply_fuel_price_observations
      WHERE source_station_id=${stationId} AND source <> 'tankkaus.com'
      AND id NOT IN (1840,1841,1845,1846,1847)
      ORDER BY observed_at DESC LIMIT 100`;
    const previous=new Map<string,number>();
    for(const row of baselines){const fuel=String(row.fuel_type);if(!previous.has(fuel))previous.set(fuel,Number(row.price_eur_per_litre));}
    const population=await sql`SELECT fuel_type, percentile_cont(0.5) WITHIN GROUP (ORDER BY price_eur_per_litre) AS median
      FROM ziiply_fuel_price_observations WHERE source <> 'tankkaus.com'
      AND id NOT IN (1840,1841,1845,1846,1847)
      AND observed_at > NOW() - INTERVAL '14 days'
      GROUP BY fuel_type`;
    const national=new Map(population.map(row=>[String(row.fuel_type),Number(row.median)]));
    // Regional baseline: recent independent station prices within approximately 50 km.
    const regionalRows=await sql`SELECT p.fuel_type,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY p.price_eur_per_litre) AS median,
      COUNT(DISTINCT p.source_station_id)::int AS station_count
      FROM ziiply_fuel_price_observations p
      JOIN ziiply_fuel_stations s ON s.source_station_id=p.source_station_id AND s.source=p.source
      WHERE p.source <> 'tankkaus.com' AND p.id NOT IN (1840,1841,1845,1846,1847)
      AND p.observed_at > NOW() - INTERVAL '14 days'
      AND s.latitude BETWEEN ${Number(station[0].latitude)-0.45} AND ${Number(station[0].latitude)+0.45}
      AND s.longitude BETWEEN ${Number(station[0].longitude)-0.9} AND ${Number(station[0].longitude)+0.9}
      GROUP BY p.fuel_type`;
    const regional=new Map(regionalRows.filter(row=>Number(row.station_count)>=5).map(row=>[String(row.fuel_type),Number(row.median)]));
    const pending:string[]=[];
    const rejected:string[]=[];
    for(const [key,fuel] of [["price95","95"],["price98","98"],["diesel","diesel"]] as const){
      const price=currentPrices[key];if(price==null)continue;
      const prior=previous.get(fuel), median=national.get(fuel), local=regional.get(fuel);
      const relativeToPrior=prior!=null && prior>0 ? Math.abs(price-prior)/prior : 0;
      const relativeToNational=median!=null && median>0 ? Math.abs(price-median)/median : 0;
      const relativeToRegional=local!=null && local>0 ? Math.abs(price-local)/local : 0;
      // Clearly malicious outliers are rejected automatically; less extreme changes await independent review.
      if((prior!=null && Math.abs(price-prior)>1 && relativeToPrior>0.40)
         || relativeToNational>0.80 || relativeToRegional>0.80){
        rejected.push(fuel);delete currentPrices[key];
      }else if(relativeToPrior>0.15 || (prior!=null && Math.abs(price-prior)>1)
         ||relativeToRegional>0.20 ||relativeToNational>0.20){
        pending.push(fuel);delete currentPrices[key];
      }
    }
    const verifiedGps=manual?null:fuelPhotoEvidenceLocation(body.mode,evidence);
    const rows=await sql`INSERT INTO ziiply_user_fuel_reports(id,source_station_id,observed_at,prices,photo_data_url,gps_latitude,gps_longitude,gps_accuracy_m,metadata)
      VALUES(${body.id}::uuid,${stationId},${new Date(date).toISOString()}::timestamptz,${JSON.stringify(prices)}::jsonb,${body.photo},${verifiedGps?.lat??null},${verifiedGps?.lon??null},${verifiedGps?.accuracy??null},${JSON.stringify({mode:body.mode,timeSource:body.timeSource,locationSource:body.locationSource,evidence,comparison,stationSelectedManually:body.stationSelectedManually===true,conflictConfirmed:body.conflictConfirmed===true})}::jsonb)
      ON CONFLICT(id) DO NOTHING RETURNING id`;
    // Publish independently validated fuel types immediately. Keep the report for audit.
    // Do not overwrite a newer observation for the same station and fuel.
    const published:string[]=[];
    if(rows.length){
      for(const [key,fuelType] of [["price95","95"],["price98","98"],["diesel","diesel"]] as const){
        const price=currentPrices[key];
        if(price==null)continue;
        // A lower octane gasoline must not be more expensive than 98 in the same report.
        if(key==="price95" && prices.price98!=null && price>prices.price98)continue;
        if(key==="price98" && prices.price95!=null && price<prices.price95)continue;
        const inserted=await sql`INSERT INTO ziiply_fuel_price_observations
          (id,source,source_station_id,fuel_type,price_eur_per_litre,observed_at)
          SELECT nextval('ziiply_fuel_price_observations_id_seq'),${station[0].source},${stationId},${fuelType},${price},${new Date(date).toISOString()}::timestamptz
          WHERE NOT EXISTS (
            SELECT 1 FROM ziiply_fuel_price_observations
            WHERE source_station_id=${stationId} AND fuel_type=${fuelType}
              AND source <> 'tankkaus.com' AND observed_at >= ${new Date(date).toISOString()}::timestamptz
          ) RETURNING id`;
        if(inserted.length){published.push(fuelType); }
      }
    }
    // The report review state must reflect validation, not just public price insertion.
    // An older valid report is accepted as history even if a newer price is displayed.
    const gasolineConflict=prices.price95!=null && prices.price98!=null && prices.price95>prices.price98;
    const accepted=pending.length===0 && Object.keys(prices).some(key=>key==="diesel" || !gasolineConflict);
    if(rows.length){
      await sql`UPDATE ziiply_user_fuel_reports SET status=${pending.length?"pending_review":rejected.length?"rejected":accepted?"accepted":"rejected"} WHERE id=${body.id}::uuid AND status='pending_review'`;
    }
    if(typeof body.learningToken==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.learningToken)){
      try{const saved=await sql`SELECT prices FROM ziiply_user_fuel_reports WHERE id=${body.id}::uuid`;await recordFuelPhotoCorrection(body.id,body.learningToken,saved[0].prices,body.id);}catch(e){console.error('fuel-photo-learning feedback',e instanceof Error?e.message:'failed');}
    }
    return NextResponse.json({ok:true,id:body.id,status:pending.length?"pending_review":rejected.length?"rejected":accepted?"accepted":"rejected",pending,rejected,published,duplicate:rows.length===0,environment:database.production?"production":"test"});
  }catch{return NextResponse.json({error:"Ilmoituksen tallennus epäonnistui. Yritä uudelleen."},{status:503});}
}
