#!/usr/bin/env node
// Offline end-to-end ingestion dry-run test with a local mock HTTP server.
// Does not use Tankkaus credentials or write to Neon.
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");

(async () => {
  let mode = "normal";
  const fixedTime = new Date().toISOString();
  const server = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      ok: true, source: "Tankkaus.com", fuel: "diesel",
      stations: mode === "empty" ? [] : mode === "conflicting-station" ? [{ id: 42, name: "Mock station", latitude: 60.6, longitude: 24.8 }, { id: 42, name: "Conflicting station", latitude: 60.7, longitude: 24.8 }] : [{ id: 42, name: "Mock station", latitude: mode === "out-of-radius" ? 61.6 : 60.6, longitude: 24.8 }],
      coverage: { radiusKm: 10, maxObservationsPerFuel: 10 },
      observations: mode === "empty" ? [] : (mode === "duplicate" ? [0, 1] : mode === "mostly-invalid" ? [0, 1, 2, 3, 4] : [0]).map((index) => ({ stationId: mode === "mostly-invalid" && index > 0 ? -1 : 42, price: index ? 1.79901 : 1.799, observedAt: mode === "ambiguous-time" ? fixedTime.replace("Z", "") : index ? new Date(Date.parse(fixedTime)).toISOString().replace("Z", "+00:00") : fixedTime }))
    }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const port = server.address().port;
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let out = "", err = "";
      child.stdout.on("data", chunk => out += chunk);
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, out, err }));
    });
    assert.equal(result.code, 0, result.err);
    const data = JSON.parse(result.out.trim());
    assert.deepEqual(data, { mode: "dry-run", stations: 1, observations: 1, fuel: "diesel", collectionScope: { center: { lat: 60.6, lon: 24.8 }, radiusKm: 10, maxObservationsPerFuel: 10 } });
    console.log("PASS Tankkaus ingestion dry-run: validated mock station and observation, no database writes");
    mode = "duplicate";
    const duplicateResult = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let out = "", err = "";
      child.stdout.on("data", chunk => out += chunk);
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, out, err }));
    });
    assert.equal(duplicateResult.code, 0, duplicateResult.err);
    assert.deepEqual(JSON.parse(duplicateResult.out.trim()), { mode: "dry-run", stations: 1, observations: 1, fuel: "diesel", collectionScope: { center: { lat: 60.6, lon: 24.8 }, radiusKm: 10, maxObservationsPerFuel: 10 } });
    console.log("PASS Tankkaus ingestion deduplicates identical observations");
    // Timezone-free timestamps must not be persisted as absolute observations.
    mode = "ambiguous-time";
    const ambiguousResult = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let out = "", err = "";
      child.stdout.on("data", chunk => out += chunk);
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, out, err }));
    });
    assert.equal(ambiguousResult.code, 0, ambiguousResult.err);
    assert.deepEqual(JSON.parse(ambiguousResult.out.trim()), { mode: "dry-run", stations: 1, observations: 0, fuel: "diesel", collectionScope: { center: { lat: 60.6, lon: 24.8 }, radiusKm: 10, maxObservationsPerFuel: 10 } });
    console.log("PASS Tankkaus ingestion rejects timezone-free observation timestamps");
    mode = "normal";
    mode = "out-of-radius";
    const radiusResult = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let err = "";
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, err }));
    });
    assert.notEqual(radiusResult.code, 0);
    assert.match(radiusResult.err, /outside claimed collection radius/);
    console.log("PASS Tankkaus ingestion rejects stations outside claimed radius");
    mode = "conflicting-station";
    const conflictingStation = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs", "--write"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused", TANKKAUS_INGEST_WRITE_CONFIRM: "YES_TEST_BRANCH" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let err = "";
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, err }));
    });
    assert.notEqual(conflictingStation.code, 0);
    assert.match(conflictingStation.err, /Conflicting coordinates/);
    console.log("PASS Tankkaus ingestion refuses conflicting station IDs before database connection");
    // Bypass credentials must never be sent to a non-Ziiply destination.
    const unsafeBypass = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, TANKKAUS_VERCEL_AUTOMATION_BYPASS: "test-only-secret", DATABASE_URL: "" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let err = "";
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, err }));
    });
    assert.notEqual(unsafeBypass.code, 0);
    assert.match(unsafeBypass.err, /may only be used with Ziiply preview/);
    assert.doesNotMatch(unsafeBypass.err, /test-only-secret/);
    console.log("PASS Tankkaus ingestion never forwards Vercel bypass to arbitrary hosts");
    mode = "normal";
    // Invalid collection coordinates and absent fuel must fail before any network/database access.
    for (const suffix of ["?lat=91&lon=24.8&fuel=diesel", "?lat=60.6&lon=24.8", "?lat=60.6&lon=24.8&fuel=diesel&fuel=95", "?lat=&lon=24.8&fuel=diesel"]) {
      const invalid = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs"], {
          env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus${suffix}`, DATABASE_URL: "" },
          stdio: ["ignore", "pipe", "pipe"]
        });
        let err = "";
        child.stderr.on("data", chunk => err += chunk);
        child.on("error", reject);
        child.on("close", code => resolve({ code, err }));
      });
      assert.notEqual(invalid.code, 0, `invalid ingestion URL must fail: ${suffix}`);
      assert.match(invalid.err, /coordinate|query parameter/i);
    }
    console.log("PASS Tankkaus ingestion rejects invalid or missing collection coordinates/fuel");
    // An explicit write confirmation must be required even with a nonempty response.
    mode = "normal";
    const unconfirmedWrite = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs", "--write"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused", TANKKAUS_INGEST_WRITE_CONFIRM: "" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let err = "";
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, err }));
    });
    assert.notEqual(unconfirmedWrite.code, 0, "unconfirmed --write must fail");
    assert.match(unconfirmedWrite.err, /TANKKAUS_INGEST_WRITE_CONFIRM/);
    console.log("PASS Tankkaus ingestion rejects unconfirmed database writes");
    mode = "mostly-invalid";
    const mostlyInvalid = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs", "--write"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused", TANKKAUS_INGEST_WRITE_CONFIRM: "YES_TEST_BRANCH" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let err = "";
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, err }));
    });
    assert.notEqual(mostlyInvalid.code, 0);
    assert.match(mostlyInvalid.err, /excessive invalid observations/);
    console.log("PASS Tankkaus ingestion refuses mostly-invalid writes before database connection");
    mode = "empty";
    const emptyResult = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/ingest-tankkaus.mjs", "--write"], {
        env: { ...process.env, TANKKAUS_INGEST_URL: `http://127.0.0.1:${port}/api/tankkaus?lat=60.6&lon=24.8&fuel=diesel`, DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused", TANKKAUS_INGEST_WRITE_CONFIRM: "YES_TEST_BRANCH" },
        stdio: ["ignore", "pipe", "pipe"]
      });
      let err = "";
      child.stderr.on("data", chunk => err += chunk);
      child.on("error", reject);
      child.on("close", code => resolve({ code, err }));
    });
    assert.notEqual(emptyResult.code, 0, "empty --write must fail");
    assert.match(emptyResult.err, /Refusing empty ingestion write/);
    console.log("PASS Tankkaus ingestion rejects empty write before database connection");

  } finally {
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
