import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import getShortName, { formatWithShortName, formatWithTimeZone, getTimeZoneName, getLongName, hasName, isDST, hasShortName, getTimeZone } from "../dist/index.mjs";

const require = createRequire(import.meta.url);
const WINTER = "2026-01-15T12:00:00Z";
const SUMMER = "2026-07-15T12:00:00Z";

test("Pakistan returns PKT, not GMT+5", () => {
  assert.equal(getShortName({ timeZone: "Asia/Karachi" }), "PKT");
});

test("zones where Intl only gives GMT+x", () => {
  const cases = { "Asia/Kolkata": "IST", "Asia/Calcutta": "IST", "Asia/Dubai": "GST", "Asia/Dhaka": "BST",
    "Asia/Tokyo": "JST", "Asia/Singapore": "SGT", "Asia/Riyadh": "AST", "Asia/Kathmandu": "NPT", "Europe/Istanbul": "TRT" };
  for (const [tz, want] of Object.entries(cases)) assert.equal(getShortName({ timeZone: tz }), want, tz);
});

test("daylight saving switches names", () => {
  assert.equal(getShortName({ timeZone: "America/New_York", date: WINTER }), "EST");
  assert.equal(getShortName({ timeZone: "America/New_York", date: SUMMER }), "EDT");
  assert.equal(getShortName({ timeZone: "Europe/London", date: WINTER }), "GMT");
  assert.equal(getShortName({ timeZone: "Europe/London", date: SUMMER }), "BST");
  assert.equal(getShortName({ timeZone: "Europe/Berlin", date: SUMMER }), "CEST");
  // Southern hemisphere: DST is in January
  assert.equal(getShortName({ timeZone: "Australia/Sydney", date: WINTER }), "AEDT");
  assert.equal(getShortName({ timeZone: "Australia/Sydney", date: SUMMER }), "AEST");
});

test("isDST", () => {
  assert.equal(isDST(new Date(SUMMER), "America/New_York"), true);
  assert.equal(isDST(new Date(WINTER), "America/New_York"), false);
  assert.equal(isDST(new Date(SUMMER), "Asia/Karachi"), false);
});

test("overrides win", () => {
  assert.equal(getShortName({ timeZone: "Asia/Kolkata", overrides: { "Asia/Kolkata": "IND" } }), "IND");
  assert.equal(getShortName({ timeZone: "America/New_York", date: SUMMER, overrides: { "America/New_York": ["ET", "ET-D"] } }), "ET-D");
});

test("unknown-but-valid zone falls back to Intl", () => {
  assert.match(getShortName({ timeZone: "Asia/Amman" }), /^GMT[+-]\d/);
  assert.equal(hasShortName("Asia/Karachi"), true);
});

test("invalid input throws", () => {
  assert.throws(() => getShortName({ timeZone: "Mars/Olympus" }), RangeError);
  assert.throws(() => getShortName({ date: "nope" }), RangeError);
});

test("formatWithShortName", () => {
  const s = formatWithShortName("2026-10-14T10:45:00Z", { timeZone: "Asia/Karachi", locale: "en-US" });
  assert.equal(s, "Oct 14, 2026, 3:45 PM PKT");
});

test("defaults to runtime zone", () => {
  assert.equal(typeof getTimeZone(), "string");
  assert.equal(typeof getShortName(), "string");
});

test("CommonJS build works", () => {
  const cjs = require("../dist/index.cjs");
  assert.equal(cjs.getShortName({ timeZone: "Asia/Karachi" }), "PKT");
  assert.equal(cjs.default({ timeZone: "Asia/Karachi" }), "PKT");
});

test("every browser-supported zone returns something in both styles", () => {
  for (const tz of Intl.supportedValuesOf("timeZone")) {
    assert.ok(getShortName({ timeZone: tz, date: SUMMER }).length > 0, tz);
    assert.ok(getLongName({ timeZone: tz, date: SUMMER, locale: "en-US" }).length > 0, tz);
  }
});

test("half-hour daylight saving (Lord Howe)", () => {
  assert.equal(getShortName({ timeZone: "Australia/Lord_Howe", date: WINTER }), "LHDT");
  assert.equal(getShortName({ timeZone: "Australia/Lord_Howe", date: SUMMER }), "LHST");
});

test("past daylight saving (Pakistan 2008)", () => {
  assert.equal(getShortName({ timeZone: "Asia/Karachi", date: "2008-07-01T00:00:00Z" }), "PKST");
  assert.equal(getShortName({ timeZone: "Asia/Karachi", date: "2008-01-01T00:00:00Z" }), "PKT");
});

test("exact switch minute (US and UK, 2026)", () => {
  assert.equal(getShortName({ timeZone: "America/New_York", date: "2026-03-08T06:59:00Z" }), "EST");
  assert.equal(getShortName({ timeZone: "America/New_York", date: "2026-03-08T07:01:00Z" }), "EDT");
  assert.equal(getShortName({ timeZone: "Europe/London", date: "2026-03-29T00:59:00Z" }), "GMT");
  assert.equal(getShortName({ timeZone: "Europe/London", date: "2026-03-29T01:01:00Z" }), "BST");
});

test("short name always agrees with the clock's real offset", async () => {
  const { createRequire } = await import("node:module");
  const map = createRequire(import.meta.url)("../src/abbreviations.json");
  const offset = (tz, d) => {
    const v = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d).map((p) => [p.type, p.value]));
    return Math.round((Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second) - d.getTime()) / 60000);
  };
  for (const tz of Intl.supportedValuesOf("timeZone")) {
    for (let t = Date.UTC(2005, 0, 1); t < Date.UTC(2028, 0, 1); t += 37 * 864e5) {
      const d = new Date(t);
      const name = getShortName({ timeZone: tz, date: d });
      const entry = map[tz]?.find((e) => e[0] === name && e[1] === offset(tz, d));
      assert.ok(entry || /^(GMT|UTC)/.test(name) || !map[tz]?.some((e) => e[0] === name), `${tz} ${d.toISOString()} → ${name}`);
    }
  }
});

test("style defaults to short", () => {
  assert.equal(getTimeZoneName({ timeZone: "Asia/Karachi" }), "PKT");
  assert.equal(getTimeZoneName({ timeZone: "Asia/Karachi", style: "short" }), "PKT");
});

test("long names", () => {
  const L = (timeZone, date) => getTimeZoneName({ timeZone, date, style: "long", locale: "en-US" });
  assert.equal(L("Asia/Karachi"), "Pakistan Standard Time");
  assert.equal(L("Asia/Dubai"), "Gulf Standard Time");
  assert.equal(L("America/New_York", WINTER), "Eastern Standard Time");
  assert.equal(L("America/New_York", SUMMER), "Eastern Daylight Time");
  assert.equal(L("Europe/London", SUMMER), "British Summer Time");
  assert.equal(L("Europe/Jersey", SUMMER), "British Summer Time"); // alias to London
  assert.equal(getLongName({ timeZone: "Asia/Karachi", locale: "en-US" }), "Pakistan Standard Time");
});

test("long names are localized", () => {
  assert.notEqual(getLongName({ timeZone: "Asia/Karachi", locale: "ur-PK" }), "Pakistan Standard Time");
});

test("long overrides", () => {
  assert.equal(getLongName({ timeZone: "Asia/Amman", overrides: { "Asia/Amman": "Jordan Time" } }), "Jordan Time");
});

test("formatWithTimeZone short (default) and long", () => {
  const at = "2026-10-14T10:45:00Z";
  assert.equal(formatWithTimeZone(at, { timeZone: "Asia/Karachi", locale: "en-US" }), "Oct 14, 2026, 3:45 PM PKT");
  assert.equal(formatWithTimeZone(at, { timeZone: "Asia/Karachi", locale: "en-US", style: "long" }), "Oct 14, 2026, 3:45 PM Pakistan Standard Time");
});

test("hasName", () => {
  assert.equal(hasName("Asia/Karachi", "short"), true);
  assert.equal(hasName("Asia/Amman", "short"), false);
  assert.equal(hasName("Asia/Almaty", "long"), true);
});

test("bad style throws", () => {
  assert.throws(() => getTimeZoneName({ style: "medium" }), RangeError);
});
