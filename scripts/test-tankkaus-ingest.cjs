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
      stations: mode === "empty" ? [] : [{ id: 42, name: "Mock station", latitude: 60.6, longitude: 24.8 }],
      observations: mode === "empty" ? [] : (mode === "duplicate" ? [0, 1] : [0]).map((index) => ({ stationId: 42, price: index ? 1.79901 : 1.799, observedAt: index ? new Date(Date.parse(fixedTime)).toISOString().replace("Z", "+00:00") : fixedTime }))
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
    assert.deepEqual(data, { mode: "dry-run", stations: 1, observations: 1, fuel: "diesel" });
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
    assert.deepEqual(JSON.parse(duplicateResult.out.trim()), { mode: "dry-run", stations: 1, observations: 1, fuel: "diesel" });
    console.log("PASS Tankkaus ingestion deduplicates identical observations");
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
