export type FuelPrices = { diesel: string; price95: string; price98: string };
export function parseFuelPhotoText(text: string): FuelPrices {
  const prices: FuelPrices = {diesel:"",price95:"",price98:""};
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    const fuel=/\b(?:diesel|di|dsl)\b/i.test(line)?"diesel":/\b95(?:\s*e\s*10)?\b/i.test(line)?"price95":/\b98(?:\s*e\s*5)?\b/i.test(line)?"price98":null;
    if(!fuel)continue;
    const match=(line.match(/\b[1-4][.,]\d{3}\b/) || lines[i+1]?.match(/^\s*([1-4][.,]\d{3})\s*$/));
    if(match)prices[fuel]=match[0].trim().replace(".",",");
  }
  return prices;
}
export function fuelDistanceKm(lat:number,lon:number,stationLat:number,stationLon:number) {
  const rad=Math.PI/180, dLat=(stationLat-lat)*rad,dLon=(stationLon-lon)*rad;
  const h=Math.sin(dLat/2)**2+Math.cos(lat*rad)*Math.cos(stationLat*rad)*Math.sin(dLon/2)**2;
  return 6371*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function validateFuelPrices(value:unknown): Record<string,number> | null {
  if(!value || typeof value!=="object" || Array.isArray(value))return null;
  const result:Record<string,number>={};
  for(const key of ["diesel","price95","price98"]){
    const input=(value as Record<string,unknown>)[key];
    if(input==null || input==="")continue;
    if(typeof input!=="string" && typeof input!=="number")return null;
    const price=Number(String(input).replace(",","."));
    if(!Number.isFinite(price) || price<0.5 || price>5)return null;
    result[key]=Math.round(price*1000)/1000;
  }
  return Object.keys(result).length?result:null;
}

export type PhotoLocation={lat:number;lon:number;accuracy:number};
export type PhotoEvidence={photoGps:PhotoLocation|null;deviceGps:PhotoLocation|null;photoTime:string|null;captureTime:string|null};
export function validPhotoLocation(value:unknown):value is PhotoLocation{
  if(!value || typeof value!=="object")return false;
  const p=value as PhotoLocation;
  return typeof p.lat==="number"&&typeof p.lon==="number"&&typeof p.accuracy==="number"&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Number.isFinite(p.accuracy)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180&&p.accuracy>=0;
}
export function comparePhotoEvidence(mode:string,evidence:PhotoEvidence){
  const reasons:string[]=[];let distanceM:number|null=null;let timeDifferenceMinutes:number|null=null;
  if(mode!=="online")return {reasons,distanceM,timeDifferenceMinutes};
  if(validPhotoLocation(evidence.photoGps)&&validPhotoLocation(evidence.deviceGps)){
    distanceM=fuelDistanceKm(evidence.photoGps.lat,evidence.photoGps.lon,evidence.deviceGps.lat,evidence.deviceGps.lon)*1000;
    // EXIF commonly omits accuracy. Use a 100 m floor, plus both reported uncertainties.
    if(distanceM>100+evidence.photoGps.accuracy+evidence.deviceGps.accuracy)reasons.push("location");
  }
  const photoTime=Date.parse(evidence.photoTime||""),captureTime=Date.parse(evidence.captureTime||"");
  if(Number.isFinite(photoTime)&&Number.isFinite(captureTime)){
    timeDifferenceMinutes=Math.abs(photoTime-captureTime)/60000;
    if(timeDifferenceMinutes>5)reasons.push("time");
  }
  return {reasons,distanceM,timeDifferenceMinutes};
}
