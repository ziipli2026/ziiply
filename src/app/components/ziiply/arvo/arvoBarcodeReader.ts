import {
  BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer,
  MultiFormatReader, NotFoundException, RGBLuminanceSource,
} from "@zxing/library";

export function createArvoBarcodeReader() {
  const reader = new MultiFormatReader();
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  let luminance = new Uint8ClampedArray(0);

  return ({ data, width, height }: ImageData) => {
    if (luminance.length !== width * height) luminance = new Uint8ClampedArray(width * height);
    for (let i = 0, pixel = 0; i < luminance.length; i++, pixel += 4) {
      luminance[i] = (data[pixel] + 2 * data[pixel + 1] + data[pixel + 2]) >> 2;
    }

    try {
      const source = new RGBLuminanceSource(luminance, width, height);
      return reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(source))).getText();
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;
      return null;
    } finally {
      reader.reset();
    }
  };
}
