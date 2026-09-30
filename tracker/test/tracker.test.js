import test from "node:test";
import assert from "node:assert/strict";

import { platformFor, referrerHost, validSlug } from "../src/index.js";

test("accepts generated link slugs and rejects arbitrary paths", () => {
  assert.equal(validSlug("bl-2301cd4c-bs"), true);
  assert.equal(validSlug("rc-d2a7a5f2"), true);
  assert.equal(validSlug("https://evil.example"), false);
  assert.equal(validSlug("../../admin"), false);
});

test("extracts a bounded platform code", () => {
  assert.equal(platformFor("bl-2301cd4c-bs"), "bs");
  assert.equal(platformFor("bl-2301cd4c"), "unspecified");
});

test("stores only the referring hostname", () => {
  assert.equal(referrerHost("https://bsky.app/profile/example/post/123?secret=value"), "bsky.app");
  assert.equal(referrerHost("not a url"), null);
});
