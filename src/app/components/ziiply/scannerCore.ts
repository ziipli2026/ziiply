export type ScannerDecodeResult = {
  text: string;
  format?: string;
  source: "live" | "still" | "enhanced";
};

export type ScannerEnhanceOptions = {
  contrast?: number;
  brightness?: number;
  sharpen?: boolean;
  cropRatio?: number;
};

export type ScannerCameraTuningResult = {
  focusApplied: boolean;
  exposureApplied: boolean;
  whiteBalanceApplied: boolean;
  zoomApplied: boolean;
};

export const DEFAULT_SCANNER_ENHANCE_OPTIONS: Required<ScannerEnhanceOptions> = {
  // V724: mobiiliviivakoodille hieman vahvempi kontrasti, vähemmän kirkkautta
  // ja laajempi crop, jotta käyttäjän ei tarvitse osua aivan keskelle.
  contrast: 1.55,
  brightness: 4,
  sharpen: true,
  cropRatio: 0.94,
};

export function getScannerVideoElement(regionId: string) {
  if (typeof document === "undefined") return null;
  return document.querySelector(`#${regionId} video`) as HTMLVideoElement | null;
}

export function getScannerVideoTrack(regionId: string) {
  const video = getScannerVideoElement(regionId);
  const stream = video?.srcObject as MediaStream | null;
  return stream?.getVideoTracks?.()[0] || null;
}

export async function applyBestEffortScannerCameraTuning(regionId: string): Promise<ScannerCameraTuningResult> {
  const result: ScannerCameraTuningResult = {
    focusApplied: false,
    exposureApplied: false,
    whiteBalanceApplied: false,
    zoomApplied: false,
  };

  try {
    const track = getScannerVideoTrack(regionId);
    if (!track) return result;

    const capabilities = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};
    const advanced: any[] = [];

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
      result.focusApplied = true;
    }

    if (Array.isArray(capabilities.exposureMode) && capabilities.exposureMode.includes("continuous")) {
      advanced.push({ exposureMode: "continuous" });
      result.exposureApplied = true;
    }

    if (Array.isArray(capabilities.whiteBalanceMode) && capabilities.whiteBalanceMode.includes("continuous")) {
      advanced.push({ whiteBalanceMode: "continuous" });
      result.whiteBalanceApplied = true;
    }

    if (capabilities.zoom && typeof capabilities.zoom.min === "number") {
      const minZoom = Number(capabilities.zoom.min ?? 1);
      const maxZoom = Number(capabilities.zoom.max ?? minZoom);
      const targetZoom = Math.min(maxZoom, Math.max(minZoom, 1.6));

      // V724: älä pakota zoom.min-arvoon. Minimi tekee EAN-koodista usein liian pienen,
      // ja joillain puhelimilla se voi valita käytännössä huonoimman linssin.
      advanced.push({ zoom: targetZoom });
      result.zoomApplied = true;
    }

    if (advanced.length > 0) {
      await track.applyConstraints({ advanced } as any);
    }
  } catch {
    // Best effort only. Browsers and devices support camera controls inconsistently.
  }

  return result;
}

export async function refocusScannerCamera(regionId: string) {
  try {
    const track = getScannerVideoTrack(regionId);
    if (!track) return false;

    const capabilities = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("single-shot")) {
      await track.applyConstraints({ advanced: [{ focusMode: "single-shot" }] } as any);

      window.setTimeout(() => {
        void track
          .applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any)
          .catch(() => undefined);
      }, 850);

      return true;
    }

    if (Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
      await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] } as any);
      return true;
    }
  } catch {
    // Best effort only.
  }

  return false;
}

export async function focusScannerCameraAtPoint(regionId: string, event: React.PointerEvent<HTMLElement>) {
  try {
    const track = getScannerVideoTrack(regionId);
    const target = event.currentTarget;
    if (!track || !target) return false;

    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)));
    const capabilities = typeof track.getCapabilities === "function" ? (track.getCapabilities() as any) : {};

    if ((window as any).ImageCapture) {
      try {
        const imageCapture = new (window as any).ImageCapture(track);
        await imageCapture.setOptions?.({
          pointsOfInterest: [{ x, y }],
          focusMode:
            Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("single-shot")
              ? "single-shot"
              : "continuous",
        });
        return true;
      } catch {
        // Fall through to constraints fallback.
      }
    }

    return await refocusScannerCamera(regionId);
  } catch {
    return false;
  }
}

export function captureScannerStillFrame(regionId: string, options: ScannerEnhanceOptions = {}) {
  const video = getScannerVideoElement(regionId);
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const merged = { ...DEFAULT_SCANNER_ENHANCE_OPTIONS, ...options };
  const cropRatio = Math.max(0.3, Math.min(1, merged.cropRatio));
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const cropWidth = Math.round(sourceWidth * cropRatio);
  const cropHeight = Math.round(sourceHeight * cropRatio);
  const sx = Math.round((sourceWidth - cropWidth) / 2);
  const sy = Math.round((sourceHeight - cropHeight) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return canvas;
}

export function enhanceBarcodeCanvas(sourceCanvas: HTMLCanvasElement, options: ScannerEnhanceOptions = {}) {
  const merged = { ...DEFAULT_SCANNER_ENHANCE_OPTIONS, ...options };
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sourceCtx) return sourceCanvas;

  const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const data = imageData.data;
  const contrast = merged.contrast;
  const brightness = merged.brightness;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128 + brightness));
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }

  if (merged.sharpen) {
    // V724: BarcodeDetector hyötyy usein selvemmistä musta/valkoinen-rajoista
    // enemmän kuin pehmeästä blur-sekoituksesta. Kevyt threshold riittää mobiilissa.
    let sum = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      sum += data[i];
    }

    const average = pixelCount > 0 ? sum / pixelCount : 128;
    const threshold = Math.max(96, Math.min(172, average * 0.96));

    for (let i = 0; i < data.length; i += 4) {
      const value = data[i] > threshold ? 255 : 0;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function decodeBarcodeFromCanvas(canvas: HTMLCanvasElement): Promise<ScannerDecodeResult | null> {
  try {
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;

    if (BarcodeDetectorCtor) {
      const detector = new BarcodeDetectorCtor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
      });
      const results = await detector.detect(canvas);
      const first = results?.[0];

      if (first?.rawValue) {
        return {
          text: String(first.rawValue),
          format: first.format,
          source: "still",
        };
      }
    }
  } catch {
    // BarcodeDetector is not supported everywhere and can fail on some canvases.
  }

  return null;
}

export async function decodeScannerFallbackStill(regionId: string): Promise<ScannerDecodeResult | null> {
  const still = captureScannerStillFrame(regionId);
  if (!still) return null;

  const direct = await decodeBarcodeFromCanvas(still);
  if (direct) return direct;

  const enhanced = enhanceBarcodeCanvas(still);
  const enhancedResult = await decodeBarcodeFromCanvas(enhanced);

  if (enhancedResult) {
    return {
      ...enhancedResult,
      source: "enhanced",
    };
  }

  return null;
}

export function createScannerFallbackLoop(args: {
  regionId: string;
  timeoutMs?: number;
  onDecoded: (result: ScannerDecodeResult) => void;
  onNeedsManualFocus?: () => void;
}) {
  // V724: 1600 ms tuntuu scannerissa hitaalta. 450 ms antaa nopean fallbackin
  // ilman että mobiili kuumenee kohtuuttomasti.
  const timeoutMs = args.timeoutMs ?? 450;
  let stopped = false;
  let timer: number | null = null;

  const run = () => {
    if (stopped) return;

    timer = window.setTimeout(async () => {
      if (stopped) return;

      const result = await decodeScannerFallbackStill(args.regionId);
      if (stopped) return;

      if (result) {
        args.onDecoded(result);
        return;
      }

      args.onNeedsManualFocus?.();
      void refocusScannerCamera(args.regionId);
      run();
    }, timeoutMs);
  };

  run();

  return () => {
    stopped = true;
    if (timer != null) window.clearTimeout(timer);
  };
}
