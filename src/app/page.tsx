      // V866: independent ZXing-C++ WebAssembly decoder, not html5-qrcode.
      // Loaded only when the photo button is pressed; standard EAN live scan stays intact.
      const wasmUrl = "https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.5/dist/iife/reader/index.js";
      if (!(window as any).ZXingWASM?.readBarcodes) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>('script[data-ziiply-zxing-wasm="1"]');
          if (existing) {
            if ((window as any).ZXingWASM?.readBarcodes) return resolve();
            existing.addEventListener("load", () => resolve(), {once:true});
            existing.addEventListener("error", () => reject(new Error("WASM script failed")), {once:true});
            return;
          }
          const script = document.createElement("script");
          script.src = wasmUrl;
          script.async = true;
          script.dataset.ziiplyZxingWasm = "1";
          script.onload = () => resolve();
          script.onerror = () => {script.remove();reject(new Error("WASM script failed"));};
          document.head.appendChild(script);
        });
      }
      const reader = (window as any).ZXingWASM?.readBarcodes;
      if (typeof reader !== "function") throw new Error("WASM reader unavailable");
      pushScannerDebugV493("GS1 WASM reader loaded");
      const attempts: Array<[HTMLCanvasElement,string]> = [[canvas,"full"]];
      // Isolate orange/red label pixels to avoid QR code and packaging text.
      const sample = document.createElement("canvas");
      sample.width = 180; sample.height = 320;
      const sampleCtx = sample.getContext("2d", {willReadFrequently:true});
      if (sampleCtx) {
        sampleCtx.drawImage(canvas,0,0,sample.width,sample.height);
        const rgba = sampleCtx.getImageData(0,0,sample.width,sample.height).data;
        let minX=sample.width,minY=sample.height,maxX=-1,maxY=-1,count=0;
        for(let y=0;y<sample.height;y++) for(let x=0;x<sample.width;x++) {
          const k=(y*sample.width+x)*4, rr=rgba[k],gg=rgba[k+1],bb=rgba[k+2];
          if(rr>100 && rr>gg*1.28 && gg>bb*1.12 && bb<150) {
            minX=Math.min(minX,x);maxX=Math.max(maxX,x);
            minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;
          }
        }
        if(count>200 && maxX>minX+12 && maxY>minY+12) {
          const pad=15, sx=Math.max(0,minX-pad),sy=Math.max(0,minY-pad);
          const ex=Math.min(sample.width,maxX+pad),ey=Math.min(sample.height,maxY+pad);
          const crop=document.createElement("canvas");
          const scaleX=canvas.width/sample.width,scaleY=canvas.height/sample.height;
          crop.width=Math.round((ex-sx)*scaleX);
          crop.height=Math.round((ey-sy)*scaleY);
          crop.getContext("2d")?.drawImage(canvas,sx*scaleX,sy*scaleY,crop.width,crop.height,0,0,crop.width,crop.height);
          attempts.unshift([crop,"orange-crop"]);
          pushScannerDebugV493(`GS1 orange crop ${crop.width}x${crop.height} pixels=${count}`);
        } else pushScannerDebugV493(`GS1 orange region not isolated pixels=${count}`);
      }
      attempts.push([ziiplyEnhanceScannerCanvasPageFallback(attempts[0][0]),"contrast"]);
      attempts.push([ziiplyRotateCanvasPageFallback(attempts[0][0],90),"rotated90"]);
      attempts.push([ziiplyRotateCanvasPageFallback(attempts[0][0],270),"rotated270"]);
      for (const [frame, label] of attempts) {
        try {
          const ctx=frame.getContext("2d",{willReadFrequently:true});
          if (!ctx) continue;
          const results = await reader(ctx.getImageData(0,0,frame.width,frame.height),{
            formats:["DataBarExp","DataBarExpStk","DataBar","EAN13","Code128"],
            tryHarder:true,tryRotate:true,tryInvert:true,tryDownscale:false,
            maxNumberOfSymbols:4
          });
          pushScannerDebugV493(`GS1 WASM ${label}: ${results?.length || 0} result(s)`);
          for(const result of results || []) {
            const raw=String(result.text || "");
            pushScannerDebugV493(`GS1 WASM result format=${result.format} text=${JSON.stringify(raw)}`);
            if(raw) { void finishScannedEan(raw);return; }
          }
        } catch(error) {
          pushScannerDebugV493(`GS1 WASM ${label} error: ${String(error).slice(0,180)}`);
        }
      }
      pushScannerDebugV493("GS1 WASM: all attempts failed");
      setEanScannerMessage("Alennustarra ei tunnistunut kuvasta. Lataa debug-TXT.");
