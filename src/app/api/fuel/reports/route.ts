import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {fuelDatabaseConfig} from "../../../../lib/fuelDatabase";
import {comparePhotoEvidence,validPhotoLocation,validateFuelStationLocation,validateFuelPrices,type PhotoEvidence} from "../../../../lib/fuelPhoto";
import {recordFuelPhotoCorrection} from "../../../../lib/fuelPhotoLearning";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  // Reports and station lookup must use the same curated Neon registry.
  const database=fuelDatabaseConfig();
  if(!database.connection)return NextResponse.json({error:"Polttoainetietokannan yhteys puuttuu."},{status:503});
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Virheellinen lähetyslähde."},{status:403});
  if(Number(req.headers.get("content-length")||0)>1600000)return NextResponse.json({error:"Kuva on liian suuri."},{status:413});
  try{
    const text=await req.text();if(text.length>1600000)return NextResponse.json({error:"Kuva on liian suuri."},{status:413});
    const body=JSON.parse(text);const prices=validateFuelPrices(body.prices);const date=Date.parse(body.observedAt);
    const stationId=Number(body.stationId);const manual=body.mode==="manual";
    const validPhoto=manual?body.photo==="":typeof body.photo==="string"&&body.photo.length<=1500000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(body.photo);
    if(body.confirmed!==true || !prices || !Number.isSafeInteger(stationId)||stationId<1 || !Number.isFinite(date)||date>Date.now()+60000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id||"") || !validPhoto || !["online","offline","manual"].includes(body.mode)||!["photo_exif","capture_session","manual"].includes(body.timeSource)||!["photo_exif","capture_session","manual"].includes(body.locationSource))return NextResponse.json({error:"Tarkista kuva, hinnat, asema ja havaintoaika."},{status:400});
    const gps=body.gps;
    if(gps && (typeof gps.lat!=="number"||typeof gps.lon!=="number"||typeof gps.accuracy!=="number"||!Number.isFinite(gps.lat)||!Number.isFinite(gps.lon)||!Number.isFinite(gps.accuracy)||Math.abs(gps.lat)>90||Math.abs(gps.lon)>180||gps.accuracy<0))return NextResponse.json({error:"Virheellinen kuvan sijainti."},{status:400});
    if(body.mode==="offline" && (body.locationSource==="capture_session"||body.timeSource==="capture_session"))return NextResponse.json({error:"Vanhan kuvan tietoja ei saa korvata lähetyshetken tiedoilla."},{status:400});
    const evidence=(body.evidence||{photoGps:null,deviceGps:null,photoTime:null,captureTime:null}) as PhotoEvidence;
    if((evidence.photoGps&&!validPhotoLocation(evidence.photoGps))||(evidence.deviceGps&&!validPhotoLocation(evidence.deviceGps))||(evidence.photoTime&&!Number.isFinite(Date.parse(evidence.photoTime)))||(evidence.captureTime&&!Number.isFinite(Date.parse(evidence.captureTime))))return NextResponse.json({error:"Virheelliset kuvan vertailutiedot."},{status:400});
    if(body.mode==="offline"&&(evidence.deviceGps||evidence.captureTime))return NextResponse.json({error:"Offline-kuvalle ei käytetä lähetyshetken paikannusta."},{status:400});
    if(manual&&(body.timeSource!=="manual"||body.locationSource!=="manual"||gps||evidence.photoGps||evidence.deviceGps||evidence.photoTime||evidence.captureTime||body.conflictConfirmed===true))return NextResponse.json({error:"Käsinsyötetty ilmoitus ei voi sisältää kuvan tai kuvaushetken vahvistustietoja."},{status:400});
    const comparison=comparePhotoEvidence(body.mode,evidence);
    if(comparison.reasons.length&&body.conflictConfirmed!==true)return NextResponse.json({error:"Vahvista kuvattu asema ja kuvausaika erikseen: tiedoissa on ristiriita."},{status:400});
    const sql=neon(database.connection);
    const branch=await sql`SELECT current_setting('neon.branch_id',true) AS id`;
    if(branch[0]?.id!==database.expectedBranch)return NextResponse.json({error:"Polttoainetietokannan haara ei vastaa asemarekisteriä."},{status:503});
    const station=await sql`SELECT source_station_id,latitude,longitude FROM ziiply_fuel_stations WHERE source_station_id=${stationId} AND lower(coalesce(name,'')||' '||coalesce(chain,'')) NOT LIKE '%teboil%' LIMIT 1`;
    if(!station.length)return NextResponse.json({error:"Asemaa ei löytynyt."},{status:400});
    const stationLocation=validateFuelStationLocation(body.mode,evidence,station[0] as {latitude:number;longitude:number});
    if(!stationLocation.ok)return NextResponse.json({error:stationLocation.error,distanceM:stationLocation.distanceM,maxDistanceM:250},{status:409});
    const verifiedGps=manual?null:evidence.photoGps||evidence.deviceGps;
    const rows=await sql`INSERT INTO ziiply_user_fuel_reports(id,source_station_id,observed_at,prices,photo_data_url,gps_latitude,gps_longitude,gps_accuracy_m,metadata)
      VALUES(${body.id}::uuid,${stationId},${new Date(date).toISOString()}::timestamptz,${JSON.stringify(prices)}::jsonb,${body.photo},${verifiedGps?.lat??null},${verifiedGps?.lon??null},${verifiedGps?.accuracy??null},${JSON.stringify({mode:body.mode,timeSource:body.timeSource,locationSource:body.locationSource,evidence,comparison,conflictConfirmed:body.conflictConfirmed===true})}::jsonb)
      ON CONFLICT(id) DO NOTHING RETURNING id`;
    if(typeof body.learningToken==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.learningToken)){
      try{const saved=await sql`SELECT prices FROM ziiply_user_fuel_reports WHERE id=${body.id}::uuid`;await recordFuelPhotoCorrection(body.id,body.learningToken,saved[0].prices,body.id);}catch(e){console.error('fuel-photo-learning feedback',e instanceof Error?e.message:'failed');}
    }
    return NextResponse.json({ok:true,id:body.id,status:"pending_review",duplicate:rows.length===0});
  }catch{return NextResponse.json({error:"Ilmoituksen tallennus epäonnistui. Yritä uudelleen."},{status:503});}
}
