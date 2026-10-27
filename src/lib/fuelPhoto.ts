export type FuelPrices = { diesel: string; price95: string; price98: string };
export function parseFuelPhotoText(text: string): FuelPrices {
  const prices: FuelPrices = {diesel:"",price95:"",price98:""};
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    // MY Diesel has a different price; the three-field report must not treat it as regular diesel.
    if(/\b(?:MY\s*D|MY\s*Diesel|Neste\s*MY)\b/i.test(line))continue;
    const fuel=/\b(?:diesel|di|dsl|d)\b/i.test(line)?"diesel":/\b95(?:\s*e\s*10)?\b/i.test(line)?"price95":/\b98(?:\s*e\s*5)?\b/i.test(line)?"price98":null;
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

export type PhotoLocation={lat:number;lon:number;accuracy:number|null;speedKmh?:number|null};
export type PhotoEvidence={photoGps:PhotoLocation|null;deviceGps:PhotoLocation|null;photoTime:string|null;captureTime:string|null};

/** Missing/zero EXIF uncertainty is unknown, never a perfect position fix. */
export function hasFuelLocationAccuracy(location:PhotoLocation|null|undefined):location is PhotoLocation & {accuracy:number}{
 return typeof location?.accuracy==="number"&&Number.isFinite(location.accuracy)&&location.accuracy>0;
}
export function fuelPhotoEvidenceLocation(mode:string,evidence:PhotoEvidence):PhotoLocation|null{
 if(mode==="online"&&!hasFuelLocationAccuracy(evidence.photoGps)&&validPhotoLocation(evidence.deviceGps)&&hasFuelLocationAccuracy(evidence.deviceGps))return evidence.deviceGps;
 return evidence.photoGps||(mode==="online"?evidence.deviceGps:null);
}

export const FUEL_PHOTO_STATION_MAX_DISTANCE_M=250;
export function fuelPhotoStationDistanceLimit(location:PhotoLocation|null|undefined){return typeof location?.speedKmh==='number' && Number.isFinite(location.speedKmh) && location.speedKmh>20?1000:250;}
/** Hard server-side limit: uncertainty or a confirmation checkbox never increases it. */
export function validateFuelStationLocation(mode:string,evidence:PhotoEvidence,station:{latitude:number;longitude:number},stationSelectedManually=false){
 if(mode==='manual')return {ok:true,distanceM:null,error:''};
 const anchors=[evidence.photoGps,...(mode==='online'?[evidence.deviceGps]:[])].filter(validPhotoLocation);
 if(!anchors.length)return {ok:false,distanceM:null,error:'Kuvan sijaintia ei voitu varmistaa. Kuvailmoitusta ei voi tallentaa ilman kuvauspaikan GPS-tietoa.'};
 if(mode==='offline'&&validPhotoLocation(evidence.photoGps)&&!hasFuelLocationAccuracy(evidence.photoGps)&&!stationSelectedManually)return {ok:false,distanceM:null,error:'Kuvan sijaintitarkkuus ei ole tiedossa. Valitse kuvassa oleva asema itse.'};
 if(anchors.some(p=>hasFuelLocationAccuracy(p)&&p.accuracy>200))return {ok:false,distanceM:null,error:'Kuvauspaikan GPS-tarkkuus ei riitä aseman varmistamiseen. Ota uusi kuva tarkemmalla sijainnilla.'};
 const distanceM=Math.max(...anchors.map(p=>fuelDistanceKm(p.lat,p.lon,Number(station.latitude),Number(station.longitude))*1000));
 const limitM=fuelPhotoStationDistanceLimit(fuelPhotoEvidenceLocation(mode,evidence));
 if(!Number.isFinite(distanceM)||distanceM>limitM)return {ok:false,distanceM,error:`Valittu asema on yli ${limitM} metrin päässä kuvauspaikasta. Valitse kuvan oikea asema. Tätä rajaa ei voi ohittaa vahvistuksella.`};
 return {ok:true,distanceM,error:''};
}
export function validPhotoLocation(value:unknown):value is PhotoLocation{
  if(!value || typeof value!=="object")return false;
  const p=value as PhotoLocation;
  return typeof p.lat==="number"&&typeof p.lon==="number"&&(p.accuracy===null||(typeof p.accuracy==="number"&&Number.isFinite(p.accuracy)&&p.accuracy>=0))&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;
}
export function comparePhotoEvidence(mode:string,evidence:PhotoEvidence){
  const reasons:string[]=[];let distanceM:number|null=null;let timeDifferenceMinutes:number|null=null;
  if(mode!=="online")return {reasons,distanceM,timeDifferenceMinutes};
  if(validPhotoLocation(evidence.photoGps)&&validPhotoLocation(evidence.deviceGps)){
    distanceM=fuelDistanceKm(evidence.photoGps.lat,evidence.photoGps.lon,evidence.deviceGps.lat,evidence.deviceGps.lon)*1000;
    // Compare uncertainty bounds only when both are known; station distance limits still apply independently.
    if(hasFuelLocationAccuracy(evidence.photoGps)&&hasFuelLocationAccuracy(evidence.deviceGps)&&distanceM>100+evidence.photoGps.accuracy+evidence.deviceGps.accuracy)reasons.push("location");
  }
  const photoTime=Date.parse(evidence.photoTime||""),captureTime=Date.parse(evidence.captureTime||"");
  if(Number.isFinite(photoTime)&&Number.isFinite(captureTime)){
    timeDifferenceMinutes=Math.abs(photoTime-captureTime)/60000;
    if(timeDifferenceMinutes>5)reasons.push("time");
  }
  return {reasons,distanceM,timeDifferenceMinutes};
}

// A brand supports GPS evidence; it cannot locate a station by itself.
export function fuelPhotoBrand(text:string):string|null {
  const normalized=text.replace(/\bst[\s-]*[1il]\b/gi,'St1');
  const brands=["ABC","Neste","St1","Shell","SEO","Gulf"];
  const found=[...new Set(brands.filter(brand=>new RegExp("\\b"+brand+"\\b","i").test(normalized)).map(brand=>brand==='Shell'?'St1':brand))];
  return found.length===1?found[0]:null;
}
export function identifyFuelPhotoStation<T extends {id:string;name:string;chain?:string;latitude:number;longitude:number}>(stations:T[],location:PhotoLocation|null,text:string,conflicted:boolean):string {
  if(!location || conflicted || !hasFuelLocationAccuracy(location) || location.accuracy>200)return "";
  const brand=fuelPhotoBrand(text);
  // A photo is commonly taken across the road from the station map pin.
  // Exact EXIF coordinates do not imply the camera is at the pump coordinate.
  const radius=fuelPhotoStationDistanceLimit(location);
  const candidates=stations.filter(s=>(!brand || fuelPhotoBrand(`${s.chain||""} ${s.name}`)===brand) && fuelDistanceKm(location.lat,location.lon,s.latitude,s.longitude)*1000<=radius);
  if(candidates.length!==1)return "";
  // Nearby stations can be confused by GPS drift even when only one is within the matching radius.
  // Require manual confirmation when any other station is within 75 m of the candidate.
  const selected=candidates[0];
  if(stations.some(s=>s.id!==selected.id && (!brand||fuelPhotoBrand(`${s.chain||""} ${s.name}`)===brand) && fuelDistanceKm(selected.latitude,selected.longitude,s.latitude,s.longitude)*1000<=75))return "";
  return selected.id;
}


