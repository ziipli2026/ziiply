const test = require("node:test");
const assert = require("node:assert/strict");

function imageUrlFromGridProduct(product) {
  const candidate = product.image ?? product.imageUrl ?? product.pictureUrl ?? product.keyfacts?.image;
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  if (typeof value === "string") return /^https:\/\//.test(value) ? value : "";
  if (value && typeof value === "object") {
    const url = value.url || value.contentUrl || value["@id"] || "";
    return typeof url === "string" && /^https:\/\//.test(url) ? url : "";
  }
  return "";
}

test("Lidl grid image accepts direct HTTPS string", () => {
  assert.equal(imageUrlFromGridProduct({ image: "https://img.example/direct.webp" }), "https://img.example/direct.webp");
});

test("Lidl grid image accepts image object", () => {
  assert.equal(imageUrlFromGridProduct({ image: { url: "https://img.example/object.webp" } }), "https://img.example/object.webp");
});

test("Lidl grid image accepts first image from array", () => {
  assert.equal(imageUrlFromGridProduct({ image: [{ contentUrl: "https://img.example/array.webp" }] }), "https://img.example/array.webp");
});

test("Lidl grid image falls back to imageUrl and rejects non-HTTPS", () => {
  assert.equal(imageUrlFromGridProduct({ imageUrl: "https://img.example/fallback.webp" }), "https://img.example/fallback.webp");
  assert.equal(imageUrlFromGridProduct({ image: "data:image/webp;base64,abc" }), "");
});
