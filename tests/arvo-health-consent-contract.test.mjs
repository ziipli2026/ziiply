import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("../src/app/api/arvo/health/consent/route.ts", import.meta.url), "utf8");
const settings = readFileSync(new URL("../src/app/components/ziiply/ArvoSettingsPanel.tsx", import.meta.url), "utf8");
const schema = readFileSync(new URL("../db/migrations/20261029_arvo_health_consent_draft.sql", import.meta.url), "utf8");

test("health consent API fails closed for every HTTP method", () => {
  for (const method of ["GET", "POST", "DELETE"]) {
    assert.match(route, new RegExp("export async function " + method + "\\(\\) \\{ return disabled\\(\\); \\}"));
  }
  assert.match(route, /status: 503/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /DATABASE_URL|process\.env\.|user_id\s*=/);
});

test("health settings cannot claim or collect consent before integration", () => {
  assert.match(settings, /Yhteys ei ole vielä käytössä/);
  assert.match(settings, /disabled aria-disabled="true"/);
  assert.match(settings, /Tällä sivulla ei pyydetä suostumusta/);
});

test("schema is scoped by user and supports revocation", () => {
  assert.match(schema, /user_id text NOT NULL/);
  assert.match(schema, /'granted','revoked'/);
  assert.match(schema, /consent_id uuid NOT NULL/);
  assert.match(schema, /PRIMARY KEY\(user_id,provider,local_date\)/);
});
