// Dev-time generator: builds src/abbreviations.json as
//   { "Zone/Name": [["ABBR", offsetMinutes], ...] }   (newest first)
// Each name is stored with the UTC offset it belongs to, so at runtime we pick the
// name whose offset matches the clock right now. If a country changes its rules and
// no name matches, the package falls back to Intl ("GMT+5") instead of showing a wrong name.
//
// Sources: moment-timezone (official tz database names, all periods since 2000),
// @vvo/tzdb as a fallback for zones where the tz database only has numbers ("+04"),
// and scripts/overrides.json for manual fixes.
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { getTimeZones } = require("@vvo/tzdb");

const isAlpha = (s) => typeof s === "string" && /^[A-Z][A-Za-z]{1,5}$/.test(s);
const SINCE = Date.UTC(2000, 0, 1);
const NOW = Date.now();
const FAR_FUTURE = Date.UTC(2100, 0, 1); // tz data projects current rules out to 2499

const tzdb = {};
for (const z of getTimeZones({ includeUtc: true })) {
  for (const n of z.group) tzdb[n] = { abbr: z.abbreviation, offset: z.rawOffsetInMinutes };
}

// overrides.json: zone -> null (no agreed letters) | [["ABBR", offsetMinutes], ...]
const overrides = require("./overrides.json");

// Every distinct (name, offset) used since 2000, newest first, with the era it was used in:
//   [abbr, offset]               in use since before 2000 and still in use
//   [abbr, offset, from]         first used at `from` (minutes since epoch), still in use
//   [abbr, offset, from|null, to] stopped being used at `to`
// Runtime only shows a name inside its era, so a retired name (Jordan's EEST, used until
// 2022) is never shown for today's clock even if the offset happens to match again.
function fromMoment(name) {
  const z = moment.tz.zone(name);
  if (!z) return [];
  const seen = new Map(); // "ABBR|offset" -> { abbr, offset, from, to }
  for (let i = z.untils.length - 1; i >= 0; i--) {
    if (z.untils[i] <= SINCE) break; // period ended before 2000
    const abbr = z.abbrs[i], offset = -z.offsets[i];
    if (!isAlpha(abbr)) continue;
    const start = i > 0 ? z.untils[i - 1] : -Infinity;
    const end = z.untils[i];
    const key = abbr + "|" + offset;
    const e = seen.get(key);
    if (e) { e.from = Math.min(e.from, start); }
    else seen.set(key, { abbr, offset, from: start, to: end });
  }
  // A name first used before 2000 has an open start: look back through all history.
  for (let i = 0; i < z.untils.length; i++) {
    const e = seen.get(z.abbrs[i] + "|" + -z.offsets[i]);
    if (e) e.from = Math.min(e.from, i > 0 ? z.untils[i - 1] : -Infinity);
  }
  return [...seen.values()].map(({ abbr, offset, from, to }) => {
    const f = from > SINCE ? Math.round(from / 60000) : null;
    const t = to < FAR_FUTURE ? Math.round(to / 60000) : null;
    if (t !== null) return [abbr, offset, f, t];
    if (f !== null) return [abbr, offset, f];
    return [abbr, offset];
  });
}

function currentOffsets(name) {
  const z = moment.tz.zone(name);
  if (!z) return [];
  const y = new Date(NOW).getUTCFullYear();
  return [...new Set([0, 6].map((m) => -z.utcOffset(Date.UTC(y, m, 15))))];
}

const names = new Set([...moment.tz.names(), ...Object.keys(tzdb)]);
const map = {};
for (const name of [...names].sort()) {
  if (name in overrides) { if (overrides[name]) map[name] = overrides[name]; continue; }
  const entries = fromMoment(name);
  // Fill offsets in use today that the tz database only names with numbers.
  for (const off of currentOffsets(name)) {
    const t = tzdb[name];
    if (!entries.some(([, o]) => o === off) && t && isAlpha(t.abbr) && t.offset === off) entries.push([t.abbr, off]);
  }
  if (!entries.length && tzdb[name] && isAlpha(tzdb[name].abbr)) entries.push([tzdb[name].abbr, tzdb[name].offset]);
  if (entries.length) map[name] = entries;
}

const out = path.join(__dirname, "..", "src", "abbreviations.json");
fs.writeFileSync(out, JSON.stringify(map));
console.log(`Wrote ${Object.keys(map).length} zones to ${out}`);
