import {NextRequest,NextResponse,after} from 'next/server';
import sharp from 'sharp';
import {checkedLearningDatabase,learningHash,processFuelPhotoLearning} from '../../../../lib/fuelPhotoLearning';
import {recoveryPreview,type RecoveryReading} from '../../../../lib/fuelPhotoRecovery';
import {validateFuelPrices} from '../../../../lib/fuelPhoto';
export const dynamic='force-dynamic';
export const maxDuration=120;
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function enqueue(id:string){after(async()=>{try{await processFuelPhotoLearning(id);}catch(e){console.error('fuel-photo-learning background',e instanceof Error?e.message:'failed');}});}
export async function POST(req:NextRequest){
 if(req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
  const text=await req.text();if(text.length>4000000)return NextResponse.json({error:'Image too large'},{status:413});const body=JSON.parse(text);
  if(!uuid(body.id)||!uuid(body.token)||typeof body.photo!=='string'||body.photo.length>3800000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(body.photo))return NextResponse.json({error:'Invalid photo'},{status:400});
  const bytes=Buffer.from(body.photo.split(',')[1],'base64');const metadata=await sharp(bytes,{limitInputPixels:20000000}).metadata();if(metadata.format!=='jpeg')return NextResponse.json({error:'Invalid image'},{status:400});
  const sql=await checkedLearningDatabase();const tokenHash=learningHash(body.token),photoHash=learningHash(body.photo),prices=validateFuelPrices(body.prices)||{};
  const [quota]=await sql`SELECT count(*) FILTER (WHERE created_at>now()-interval '1 hour')::int AS count,count(*) FILTER (WHERE photo_data_url IS NOT NULL)::int AS pending,coalesce(sum(octet_length(photo_data_url)),0) AS bytes FROM ziiply_fuel_photo_learning`;
  if(quota.count>=200||quota.pending>=100||Number(quota.bytes)+body.photo.length>200000000)return NextResponse.json({error:'Image recovery busy'},{status:429});
  await sql`INSERT INTO ziiply_fuel_photo_learning(id,token_hash,photo_hash,photo_data_url,initial_prices,metadata) VALUES(${body.id}::uuid,${tokenHash},${photoHash},${body.photo},${JSON.stringify(prices)}::jsonb,${JSON.stringify({mode:body.mode,readerVersion:'fuel-led-colours-feedback-v2',ocrPrices:prices})}::jsonb) ON CONFLICT(id) DO NOTHING`;
  const [saved]=await sql`SELECT status FROM ziiply_fuel_photo_learning WHERE id=${body.id}::uuid AND token_hash=${tokenHash} AND photo_hash=${photoHash}`;
  if(!saved)return NextResponse.json({error:'Photo identifier conflict'},{status:409});
  enqueue(body.id);return NextResponse.json({ok:true,status:saved.status});
 }catch(e){console.error('fuel-photo-learning save',e instanceof Error?e.message:'failed');return NextResponse.json({error:'Photo recovery unavailable'},{status:503});}
}
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id'),token=req.headers.get('x-fuel-photo-token');if(!uuid(id)||!uuid(token))return NextResponse.json({error:'Not found'},{status:404});
 try{const sql=await checkedLearningDatabase();const [job]=await sql`SELECT status,recovered_prices,readings,attempts FROM ziiply_fuel_photo_learning WHERE id=${id}::uuid AND token_hash=${learningHash(token)}`;
  if(!job)return NextResponse.json({error:'Not found'},{status:404});if(job.status==='queued')enqueue(id);
  const brands=[...new Set((job.readings||[]).map((r:RecoveryReading)=>r.brand).filter(Boolean))];
  return NextResponse.json({ok:true,status:job.status,brand:brands.length===1?brands[0]:null,prices:job.recovered_prices,provisionalPrices:recoveryPreview((job.readings||[]) as RecoveryReading[]),attempts:job.attempts},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Photo recovery unavailable'},{status:503});}
}


