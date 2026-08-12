import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveLocationArtwork, slugifyLocationName } from "@/presentation/components/journey/locationArtworkResolver";

// Fake asset handles (require() yields a number in RN; any distinct sentinel works here).
const GENERIC = 0 as unknown as import("react-native").ImageSourcePropType;
const MILLBROOK_ART = 42 as unknown as import("react-native").ImageSourcePropType;

test("slugifyLocationName normalizes canonical names", () => {
  assert.equal(slugifyLocationName("Eastbridge"), "eastbridge");
  assert.equal(slugifyLocationName("Green Hollow"), "green-hollow");
  assert.equal(slugifyLocationName("  Stoneford  "), "stoneford");
});

test("known settlement with no dedicated artwork falls back to generic", () => {
  const result = resolveLocationArtwork({ name: "Eastbridge" }, {}, GENERIC);
  assert.equal(result, GENERIC);
});

test("mapped artwork is used when a dedicated entry exists", () => {
  const registry = { millbrook: MILLBROOK_ART };
  const result = resolveLocationArtwork({ name: "Millbrook" }, registry, GENERIC);
  assert.equal(result, MILLBROOK_ART);
});

test("unknown / missing settlement falls back to generic", () => {
  assert.equal(resolveLocationArtwork(undefined, { millbrook: MILLBROOK_ART }, GENERIC), GENERIC);
  assert.equal(resolveLocationArtwork(null, {}, GENERIC), GENERIC);
  assert.equal(resolveLocationArtwork({ name: "" }, {}, GENERIC), GENERIC);
  assert.equal(resolveLocationArtwork({ name: null }, {}, GENERIC), GENERIC);
  assert.equal(resolveLocationArtwork({ name: "Nowhere" }, { millbrook: MILLBROOK_ART }, GENERIC), GENERIC);
});
