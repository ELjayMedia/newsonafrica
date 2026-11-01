import assert from "node:assert/strict";
import test from "node:test";
import { resolveReleaseVersion } from "./android-release-version.mjs";

const manual = { INPUT_VERSION_NAME: "1.0.3", GITHUB_REF: "refs/heads/main", GITHUB_RUN_NUMBER: "1" };

test("tag controls version name and run numbers advance past checked-in code 3", () => {
  assert.deepEqual(resolveReleaseVersion({ ...manual, GITHUB_REF: "refs/tags/android-v2.3.4-rc.1", GITHUB_RUN_NUMBER: "7" }), { versionName: "2.3.4-rc.1", versionCode: "10" });
});
test("manual builds accept explicit version code for existing Play apps", () => {
  assert.deepEqual(resolveReleaseVersion({ ...manual, INPUT_VERSION_CODE: "500" }), { versionName: "1.0.3", versionCode: "500" });
  assert.equal(resolveReleaseVersion(manual).versionCode, "4");
});
test("rejects invalid names, injected output, and unrecognised tag prefix", () => {
  for (const INPUT_VERSION_NAME of ["", "1.2", "1.2.3\nversion-code=9", "1.2.3;echo bad"]) {
    assert.throws(() => resolveReleaseVersion({ ...manual, INPUT_VERSION_NAME }));
  }
  assert.throws(() => resolveReleaseVersion({ ...manual, GITHUB_REF: "refs/tags/v1.2.3" }));
});
test("rejects zero, fractional, negative, overflowing or missing version codes", () => {
  for (const INPUT_VERSION_CODE of ["0", "-1", "1.5", "2100000001", "2e3"]) {
    assert.throws(() => resolveReleaseVersion({ ...manual, INPUT_VERSION_CODE }));
  }
  assert.throws(() => resolveReleaseVersion({ ...manual, GITHUB_RUN_NUMBER: undefined }));
  assert.throws(() => resolveReleaseVersion({ ...manual, GITHUB_RUN_NUMBER: "2100000000" }));
});
