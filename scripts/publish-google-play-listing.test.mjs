import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createPlayClient, parseServiceAccount } from "./lib/google-play.mjs";
import { loadListingPlan, publishListings, validateListing } from "./publish-google-play-listing.mjs";

const listing = { title: "News on Africa", shortDescription: "Independent African news", fullDescription: "Stories from across Africa." };

async function fixture(t, value = listing) {
  const directory = await mkdtemp(join(tmpdir(), "play-listing-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(join(directory, "listings"));
  await writeFile(join(directory, "listings", "en-US.json"), JSON.stringify(value));
  return directory;
}

function png(width, height, colorType = 2) {
  const bytes = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.write("IHDR", 12);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  bytes[24] = 8;
  bytes[25] = colorType;
  return bytes;
}

async function graphics(directory) {
  const root = join(directory, "graphics", "en-US");
  await mkdir(join(root, "phoneScreenshots"), { recursive: true });
  await writeFile(join(root, "icon.png"), png(512, 512, 6));
  await writeFile(join(root, "featureGraphic.png"), png(1024, 500));
  await writeFile(join(root, "phoneScreenshots", "02-article.png"), png(1080, 1920));
  await writeFile(join(root, "phoneScreenshots", "01-home.png"), png(1080, 1920));
  return root;
}

function mockClient(failPath) {
  const calls = [];
  return {
    calls,
    async request(path, options = {}) {
      calls.push({ path, method: options.method, body: options.body });
      if (path === failPath) throw new Error("Rejected by Google Play");
      return path === "/edits" ? { id: "edit-1" } : {};
    },
    async upload(path, bytes) { calls.push({ path, method: "UPLOAD", bytes: bytes.length }); return {}; },
  };
}

test("dry run validates without credentials or any API calls", async (t) => {
  const directory = await fixture(t);
  const client = mockClient();
  const result = await publishListings({ directory, client, log() {} });
  assert.equal(result.dryRun, true);
  assert.equal(result.listings[0].title, listing.title);
  assert.equal(client.calls.length, 0);
});

test("invalid or missing text fails validation", () => {
  assert.throws(() => validateListing({ ...listing, title: "x".repeat(31) }, "en-US"), /exceeds 30/);
  assert.throws(() => validateListing({ ...listing, shortDescription: " " }, "en-US"), /required/);
  assert.throws(() => validateListing({ ...listing, video: "url" }, "en-US"), /unknown listing fields/);
  assert.throws(() => validateListing(listing, "../en-US"), /Invalid listing language/);
});

test("invalid metadata rejects before a publishing edit is created", async (t) => {
  const directory = await fixture(t, { ...listing, fullDescription: "" });
  const client = mockClient();
  await assert.rejects(publishListings({ directory, dryRun: false, client, log() {} }), /fullDescription is required/);
  assert.equal(client.calls.length, 0);
});

test("graphics publishing requires a complete packet before any API call", async (t) => {
  const directory = await fixture(t);
  const client = mockClient();
  await assert.rejects(publishListings({ directory, dryRun: false, uploadGraphics: true, client, log() {} }), /ENOENT/);
  assert.equal(client.calls.length, 0);
});

test("graphics validation requires at least two screenshots and no feature alpha", async (t) => {
  const directory = await fixture(t);
  const root = await graphics(directory);
  await rm(join(root, "phoneScreenshots", "02-article.png"));
  await assert.rejects(loadListingPlan(directory, true), /between 2 and 8/);
  await writeFile(join(root, "featureGraphic.png"), png(1024, 500, 6));
  await assert.rejects(loadListingPlan(directory, true), /without alpha/);
});

test("graphics dry run sorts screenshots and never changes Play", async (t) => {
  const directory = await fixture(t);
  await graphics(directory);
  const client = mockClient();
  const result = await publishListings({ directory, uploadGraphics: true, client, log() {} });
  assert.match(result.listings[0].images.phoneScreenshots[0].file, /01-home.png$/);
  assert.equal(client.calls.length, 0);
});

test("text publication patches listing then validates before committing and preserves images", async (t) => {
  const directory = await fixture(t);
  const client = mockClient();
  await publishListings({ directory, dryRun: false, client, log() {} });
  assert.deepEqual(client.calls.map(({ method, path }) => `${method} ${path}`), [
    "POST /edits",
    "PATCH /edits/edit-1/listings/en-US",
    "POST /edits/edit-1:validate",
    "POST /edits/edit-1:commit",
  ]);
  assert.deepEqual(JSON.parse(client.calls[1].body), listing);
});

test("validation errors discard the edit and never commit", async (t) => {
  const directory = await fixture(t);
  const client = mockClient("/edits/edit-1:validate");
  await assert.rejects(publishListings({ directory, dryRun: false, client, log() {} }), /Rejected by Google Play/);
  assert.equal(client.calls.at(-1).method, "DELETE");
  assert.equal(client.calls.at(-1).path, "/edits/edit-1");
  assert.ok(!client.calls.some(({ path }) => path.endsWith(":commit")));
});

test("upload errors discard the edit without deleting live images outside the edit", async (t) => {
  const directory = await fixture(t);
  await graphics(directory);
  const client = mockClient();
  client.upload = async () => { throw new Error("Upload failed"); };
  await assert.rejects(publishListings({ directory, dryRun: false, uploadGraphics: true, client, log() {} }), /Upload failed/);
  assert.equal(client.calls.at(-1).path, "/edits/edit-1");
  assert.ok(!client.calls.some(({ path }) => path.endsWith(":commit")));
});

test("complete graphics packet is replaced inside one edit in filename order", async (t) => {
  const directory = await fixture(t);
  await graphics(directory);
  const client = mockClient();
  await publishListings({ directory, dryRun: false, uploadGraphics: true, client, log() {} });
  const uploads = client.calls.filter(({ method }) => method === "UPLOAD");
  assert.equal(uploads.length, 4);
  assert.equal(client.calls.filter(({ method }) => method === "DELETE").length, 3);
  assert.equal(client.calls.at(-1).path, "/edits/edit-1:commit");
});

test("credential parser supports raw, escaped and base64 JSON without leaking invalid input", () => {
  const value = JSON.stringify({ client_email: "test@example.com", private_key: "key\\nbody" });
  for (const encoding of [value, Buffer.from(value).toString("base64")]) {
    assert.equal(parseServiceAccount(encoding).privateKey, "key\nbody");
  }
  assert.throws(() => parseServiceAccount("sensitive-invalid-json"), (error) => !error.message.includes("sensitive-invalid-json"));
});

test("API client sends JSON and image bytes to the correct Google endpoints", async () => {
  const calls = [];
  const client = createPlayClient({ accessToken: "test-token", fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response("{}", { status: 200 });
  } });
  await client.request("/edits", { method: "POST", body: "{}" });
  const bytes = png(512, 512);
  await client.upload("/edits/edit-1/listings/en-US/icon", bytes);
  assert.equal(calls[0].url, "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.newsonafrica.app/edits");
  assert.equal(calls[1].url, "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/com.newsonafrica.app/edits/edit-1/listings/en-US/icon?uploadType=media");
  assert.equal(calls[1].options.body, bytes);
  assert.equal(calls[1].options.headers["content-type"], "image/png");
});
