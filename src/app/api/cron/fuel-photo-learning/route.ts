import {NextRequest,NextResponse} from 'next/server';
import {processFuelPhotoLearning} from '../../../../lib/fuelPhotoLearning';
export const dynamic='force-dynamic';export const maxDuration=240;
export async function GET(req:NextRequest){
 if(!process.env.CRON_SECRET||req.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const results=[];for(let i=0;i<3;i++){const r=await processFuelPhotoLearning();results.push(r);if(!r.processed)break;}return NextResponse.json({ok:true,results});}
 catch(e){console.error('fuel-photo-learning cron',e instanceof Error?e.message:'failed');return NextResponse.json({ok:false},{status:503});}
}
