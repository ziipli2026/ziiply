type OcrWorker = {
  recognize: (image: string) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<unknown>;
};
type OcrRuntime = { createWorker: (language: string) => Promise<OcrWorker> };
type OcrWindow = Window & {
  Tesseract?: OcrRuntime;
  TextDetector?: new () => {
    detect: (image: HTMLCanvasElement) => Promise<{ rawValue: string }[]>;
  };
};

let runtimePromise: Promise<OcrRuntime> | undefined;

function loadLocalOcr(): Promise<OcrRuntime> {
  const browser = window as OcrWindow;
  if (browser.Tesseract) return Promise.resolve(browser.Tesseract);
  if (!runtimePromise) {
    runtimePromise = new Promise<OcrRuntime>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      script.onload = () => browser.Tesseract
        ? resolve(browser.Tesseract)
        : reject(new Error("Kuvanlukijaa ei voitu käynnistää."));
      script.onerror = () => {
        script.remove();
        reject(new Error("Paikallinen kuvanlukija tarvitsee verkkoyhteyden ensimmäisellä käyttökerralla."));
      };
      document.head.appendChild(script);
    }).catch((error) => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

export async function readShoppingListImage(file: File): Promise<string> {
  if (file.type && !file.type.startsWith("image/")) throw new Error("Valitse kuva ostoslistasta.");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Kuvan avaaminen epäonnistui.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL("image/jpeg", 0.88);

    if (navigator.onLine) {
      try {
        const response = await fetch("/api/recipe/read-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: encoded, mode: "shopping-list" }),
        });
        if (response.ok) {
          const result = await response.json();
          if (typeof result.rawText === "string" && result.rawText.trim()) return result.rawText;
        }
      } catch {
        // Try on-device recognition if the server is unreachable.
      }
    }

    const Detector = (window as OcrWindow).TextDetector;
    if (Detector) {
      try {
        const text = (await new Detector().detect(canvas)).map(({ rawValue }) => rawValue).join("\n");
        if (text.trim()) return text;
      } catch {
        // Some browsers expose the detector without a working backend.
      }
    }

    const worker = await (await loadLocalOcr()).createWorker("fin");
    try {
      return (await worker.recognize(encoded)).data.text;
    } finally {
      await worker.terminate();
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
