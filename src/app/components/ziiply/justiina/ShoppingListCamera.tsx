"use client";
import {useState,useRef,useEffect} from "react";
import {readShoppingListImage} from "./readShoppingListImage";
export default function ShoppingListCamera({onClose,onApply}:{onClose:()=>void;onApply:(text:string)=>void}){
const [cameraOpen,setCameraOpen]=useState(true),[cameraShot,setCameraShot]=useState(false),[cameraReview,setCameraReview]=useState(false),[cameraError,setCameraError]=useState(""),[cameraCountdown,setCameraCountdown]=useState<number|null>(null),[imagePreview,setImagePreview]=useState(""),[readingImage,setReadingImage]=useState(false),[text,setText]=useState("");
const imageReadIdRef=useRef(0),cameraVideoRef=useRef<HTMLVideoElement|null>(null),cameraStreamRef=useRef<MediaStream|null>(null),capturedFileRef=useRef<File|null>(null),imageInputRef=useRef<HTMLInputElement|null>(null);
useEffect(()=>()=>{imageReadIdRef.current++;cameraStreamRef.current?.getTracks().forEach(t=>t.stop())},[]);
useEffect(()=>()=>{if(imagePreview)URL.revokeObjectURL(imagePreview)},[imagePreview]);
  const stopCamera=()=>{setCameraCountdown(null);cameraStreamRef.current?.getTracks().forEach(track=>track.stop());cameraStreamRef.current=null};
  useEffect(()=>{if(cameraOpen&&!cameraShot&&!cameraReview&&cameraVideoRef.current&&cameraStreamRef.current){cameraVideoRef.current.srcObject=cameraStreamRef.current;void cameraVideoRef.current.play().catch(()=>{})}},[cameraOpen,cameraShot,cameraReview]);
  const closeCamera=()=>{imageReadIdRef.current++;setReadingImage(false);stopCamera();setCameraOpen(false);setCameraShot(false);setCameraReview(false);setCameraError("");onClose()};
  const startCamera=async(autoCapture=false)=>{
    imageReadIdRef.current++;setReadingImage(false);setImagePreview("");setText("");
    setCameraOpen(true);setCameraShot(false);setCameraReview(false);setCameraError("");capturedFileRef.current=null;
    stopCamera();
    try{
      let stream:MediaStream;
      try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false})}
      catch{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false})}
      cameraStreamRef.current=stream;
      if(autoCapture)setCameraCountdown(5);
      requestAnimationFrame(()=>{if(cameraVideoRef.current){cameraVideoRef.current.srcObject=stream;void cameraVideoRef.current.play().catch(()=>{})}});
    }catch{setCameraError("Kamera ei auennut. Voit liittää kuvan laitteen kuvista.");}
  };
  const takePicture=()=>{
    const video=cameraVideoRef.current;if(!video||!video.videoWidth)return;
    const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    canvas.getContext("2d")?.drawImage(video,0,0);
    canvas.toBlob(blob=>{if(!blob)return;capturedFileRef.current=new File([blob],"resepti.jpg",{type:"image/jpeg"});setImagePreview(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(blob)});setCameraShot(true);stopCamera()},"image/jpeg",0.9);
  };
  const prepareRecipeImage=(file?:File)=>{
    if(!file)return;
    if(!file.type.startsWith("image/")){setCameraError("Valitse kuvatiedosto.");return}
    if(file.size>12*1024*1024){setCameraError("Kuva on liian suuri (enintään 12 Mt).");return}
    imageReadIdRef.current++;setReadingImage(false);stopCamera();
    capturedFileRef.current=file;
    setCameraOpen(true);setCameraShot(true);setCameraReview(false);setCameraError("");
    setText("");
    setImagePreview(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(file)});
  };
  const readRecipeImage=async()=>{
    const file=capturedFileRef.current;
    if(!file||readingImage)return;
    const requestId=++imageReadIdRef.current;
    setReadingImage(true);setCameraError("");
    try{
      const recognized=await readShoppingListImage(file);
      if(requestId!==imageReadIdRef.current)return;
      if(!recognized.trim())throw Error("Kuvasta ei löytynyt tekstiä.");
      setText(recognized);setCameraReview(true);
    }catch(error){
      if(requestId===imageReadIdRef.current)setCameraError(error instanceof Error?error.message:"Kuvan tekstinlukeminen epäonnistui.");
    }finally{if(requestId===imageReadIdRef.current)setReadingImage(false)}
  };
  useEffect(()=>{
    if(cameraCountdown===null)return;
    if(cameraCountdown===0){takePicture();setCameraCountdown(null);return}
    const timer=window.setTimeout(()=>setCameraCountdown(value=>value===null?null:value-1),1000);
    return()=>window.clearTimeout(timer);
  },[cameraCountdown]);

return <>    {cameraOpen&&<div className="absolute inset-0 z-[200] flex min-h-0 flex-col overflow-hidden rounded-[22px] border-[4px] border-double border-[#b99d62] bg-[#14271e] p-3 text-[#fff7df] shadow-2xl">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="mb-3 flex shrink-0 items-center justify-between"><h3 className="font-serif text-xl font-bold">Kuvaa ostoslista {cameraReview&&<span className="text-sm font-sans">Tarkasta / muokkaa</span>}</h3><button type="button" aria-label="Sulje kamera" onClick={closeCamera} className="rounded-xl border border-[#b99d62] px-3 py-2">×</button></div>
        {!cameraReview&&<div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">{cameraShot?<img src={imagePreview} alt="Otettu ostoslistan kuva" className="h-full w-full object-contain"/>:<><video ref={cameraVideoRef} autoPlay playsInline muted className="h-full w-full object-contain"/>{cameraCountdown!==null&&<div aria-live="polite" className="absolute inset-0 grid place-items-center bg-black/30 text-[72px] font-black text-white">{cameraCountdown||"●"}</div>}</>}</div>}
        {cameraReview&&<textarea aria-label="Tarkasta ostoslistan teksti" value={text} onChange={event=>setText(event.target.value)} rows={9} className="min-h-0 w-full flex-1 resize-none rounded-xl bg-[#fffdf5] p-3 text-[#183b2a]"/>}
        {cameraError&&<p className="mt-2 shrink-0 text-sm">{cameraError}</p>}
        <div className="mt-3 flex shrink-0 flex-wrap justify-center gap-2">
          {cameraShot?<><button type="button" disabled={readingImage} onClick={()=>void startCamera(true)} className="rounded-xl bg-[#e8d8a9] px-3 py-2 text-sm font-bold text-[#14271e] disabled:opacity-50">Ota uusi</button>
          {!cameraReview&&<button type="button" disabled={readingImage} onClick={()=>void readRecipeImage()} className="rounded-xl border border-white px-3 py-2 text-sm font-bold disabled:opacity-50">{readingImage?"Luetaan…":"Lue ostoslista"}</button>}
          <button type="button" onClick={closeCamera} className="rounded-xl border border-white px-3 py-2 text-sm font-bold">Peruuta</button>
          {cameraReview&&<button type="button" disabled={!text.trim()} onClick={()=>{try{onApply(text);closeCamera()}catch(e){setCameraError(e instanceof Error?e.message:"Tekstiä ei voitu siirtää.")}}} className="rounded-xl bg-[#e8d8a9] px-3 py-2 text-sm font-bold text-[#14271e] disabled:opacity-50">Käytä ostoslistaa</button>}</>:<>
          <button type="button" disabled={cameraCountdown!==null} onClick={()=>{if(cameraStreamRef.current)setCameraCountdown(5);else void startCamera(true)}} className="rounded-xl bg-[#e8d8a9] px-3 py-2 text-sm font-bold text-[#14271e] disabled:opacity-50">Ota kuva</button>
          <button type="button" onClick={()=>{stopCamera();imageInputRef.current?.click()}} className="rounded-xl border border-white px-3 py-2 text-sm font-bold">Liitä kuva</button>
          <button type="button" onClick={closeCamera} className="rounded-xl border border-white px-3 py-2 text-sm font-bold">Peruuta</button></>}
        </div>
      </div>
    </div>}
    <input ref={imageInputRef} type="file" accept="image/*" aria-label="Liitä ostoslistan kuva" className="sr-only" onChange={event=>{prepareRecipeImage(event.target.files?.[0]);event.target.value=""}}/>
</>;
}
