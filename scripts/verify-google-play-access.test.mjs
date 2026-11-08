import assert from "node:assert/strict";
import test from "node:test";
import { selectVersionCode, verifyPlayAccess } from "./verify-google-play-access.mjs";

function mockClient({ bundles = [], apks = [], failList = false } = {}) {
  const calls = [];
  return { calls, async request(path, options = {}) {
    calls.push([path, options.method ?? "GET"]);
    if (options.method === "POST") return { id: "test-edit" };
    if (options.method === "DELETE") return {};
    if (failList) throw new Error("Access denied");
    if (path.endsWith("/apks")) return { apks };
    return { bundles };
  } };
}

test("read-only access check creates then deletes an edit and never commits", async () => {
  const client = mockClient({ bundles: [{ versionCode: 3 }] });
  assert.deepEqual(await verifyPlayAccess(client), { bundleCount: 1, apkCount: 0, versionCode: undefined });
  assert.deepEqual(client.calls, [["/edits", "POST"], ["/edits/test-edit/bundles", "GET"], ["/edits/test-edit/apks", "GET"], ["/edits/test-edit", "DELETE"]]);
});
test("auto allocation advances past existing higher Play versions and manual overrides", async () => {
  const client = mockClient({ bundles: [{ versionCode: 400 }, { versionCode: 3 }] });
  assert.equal((await verifyPlayAccess(client, { versionCode: "4", autoVersionCode: true })).versionCode, "401");
  assert.equal(selectVersionCode("500", [{ versionCode: 400 }]), "500");
  assert.equal(selectVersionCode("4", [], true), "4");
});
test("duplicate manual code fails preflight and still deletes the edit", async () => {
  const client = mockClient({ bundles: [{ versionCode: 4 }] });
  await assert.rejects(verifyPlayAccess(client, { versionCode: "4" }), /already been used/);
  assert.deepEqual(client.calls.at(-1), ["/edits/test-edit", "DELETE"]);
});
test("version codes account for existing APK releases as well as bundles", async () => {
  const client = mockClient({ bundles: [{ versionCode: 3 }], apks: [{ versionCode: 800 }] });
  assert.equal((await verifyPlayAccess(client, { versionCode: "4", autoVersionCode: true })).versionCode, "801");
  await assert.rejects(verifyPlayAccess(mockClient({ apks: [{ versionCode: 800 }] }), { versionCode: "4" }), /already been used/);
});
test("API failure still deletes the temporary edit", async () => {
  const client = mockClient({ failList: true });
  await assert.rejects(verifyPlayAccess(client), /Access denied/);
  assert.deepEqual(client.calls.at(-1), ["/edits/test-edit", "DELETE"]);
});
test("rejects overflow or invalid version codes", () => {
  for (const code of ["0", "NaN", "2.5", "2100000001"]) assert.throws(() => selectVersionCode(code, []));
  assert.throws(() => selectVersionCode("10", [{ versionCode: 2100000000 }], true), /No higher/);
});
