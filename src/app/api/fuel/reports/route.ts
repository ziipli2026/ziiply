import {NextRequest,NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
import {comparePhotoEvidence,validPhotoLocation,validateFuelPrices,type PhotoEvidence} from "../../../../lib/fuelPhoto";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  // Preview collection is isolated: never fall back to a production connection.
  if(process.env.VERCEL_ENV!=="preview" || !process.env.TANKKAUS_TEST_DATABASE_URL)return NextResponse.json({error:"Hintailmoitukset ovat toistaiseksi käytössä vain testiesikatselussa."},{status:503});
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Virheellinen lähetyslähde."},{status:403});
  if(Number(req.headers.get("content-length")||0)>1600000)return NextResponse.json({error:"Kuva on liian suuri."},{status:413});
  try{
    const text=await req.text();if(text.length>1600000)return NextResponse.json({error:"Kuva on liian suuri."},{status:413});
    const body=JSON.parse(text);const prices=validateFuelPrices(body.prices);const date=Date.parse(body.observedAt);
    const stationId=Number(body.stationId);
    if(body.confirmed!==true || !prices || !Number.isSafeInteger(stationId)||stationId<1 || !Number.isFinite(date)||date>Date.now()+60000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id||"") || typeof body.photo!=="string"||body.photo.length>1500000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(body.photo) || !["online","offline"].includes(body.mode)||!["photo_exif","capture_session","manual"].includes(body.timeSource)||!["photo_exif","capture_session","manual"].includes(body.locationSource))return NextResponse.json({error:"Tarkista kuva, hinnat, asema ja havaintoaika."},{status:400});
    const gps=body.gps;
    if(gps && (typeof gps.lat!=="number"||typeof gps.lon!=="number"||typeof gps.accuracy!=="number"||!Number.isFinite(gps.lat)||!Number.isFinite(gps.lon)||!Number.isFinite(gps.accuracy)||Math.abs(gps.lat)>90||Math.abs(gps.lon)>180||gps.accuracy<0))return NextResponse.json({error:"Virheellinen kuvan sijainti."},{status:400});
    if(body.mode==="offline" && (body.locationSource==="capture_session"||body.timeSource==="capture_session"))return NextResponse.json({error:"Vanhan kuvan tietoja ei saa korvata lähetyshetken tiedoilla."},{status:400});
    const evidence=(body.evidence||{photoGps:null,deviceGps:null,photoTime:null,captureTime:null}) as PhotoEvidence;
    if((evidence.photoGps&&!validPhotoLocation(evidence.photoGps))||(evidence.deviceGps&&!validPhotoLocation(evidence.deviceGps))||(evidence.photoTime&&!Number.isFinite(Date.parse(evidence.photoTime)))||(evidence.captureTime&&!Number.isFinite(Date.parse(evidence.captureTime))))return NextResponse.json({error:"Virheelliset kuvan vertailutiedot."},{status:400});
    if(body.mode==="offline"&&(evidence.deviceGps||evidence.captureTime))return NextResponse.json({error:"Offline-kuvalle ei käytetä lähetyshetken paikannusta."},{status:400});
    const comparison=comparePhotoEvidence(body.mode,evidence);
    if(comparison.reasons.length&&body.conflictConfirmed!==true)return NextResponse.json({error:"Vahvista kuvattu asema ja kuvausaika erikseen: tiedoissa on ristiriita."},{status:400});
    const sql=neon(process.env.TANKKAUS_TEST_DATABASE_URL);
    const branch=await sql`SELECT current_setting('neon.branch_id',true) AS id`;
    if(branch[0]?.id!=="br-weathered-meadow-b1bwpzst")return NextResponse.json({error:"Testikannan varmistus epäonnistui."},{status:503});
    const station=await sql`SELECT source_station_id FROM ziiply_fuel_stations WHERE source_station_id=${stationId} AND lower(coalesce(name,'')||' '||coalesce(chain,'')) NOT LIKE '%teboil%' LIMIT 1`;
    if(!station.length)return NextResponse.json({error:"Asemaa ei löytynyt."},{status:400});
    const rows=await sql`INSERT INTO ziiply_user_fuel_reports(id,source_station_id,observed_at,prices,photo_data_url,gps_latitude,gps_longitude,gps_accuracy_m,metadata)
      VALUES(${body.id}::uuid,${stationId},${new Date(date).toISOString()}::timestamptz,${JSON.stringify(prices)}::jsonb,${body.photo},${gps?.lat??null},${gps?.lon??null},${gps?.accuracy??null},${JSON.stringify({mode:body.mode,timeSource:body.timeSource,locationSource:body.locationSource,evidence,comparison,conflictConfirmed:body.conflictConfirmed===true})}::jsonb)
      ON CONFLICT(id) DO NOTHING RETURNING id`;
    return NextResponse.json({ok:true,id:body.id,status:"pending_review",duplicate:rows.length===0});
  }catch{return NextResponse.json({error:"Ilmoituksen tallennus epäonnistui. Yritä uudelleen."},{status:503});}
}
