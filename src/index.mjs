import ABBR from "./abbreviations.json";

/** The browser's / runtime's IANA time zone, e.g. "Asia/Karachi". */
export function getTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** UTC offset in minutes of `timeZone` at `date` (east of UTC is positive). */
function offsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  return Math.round((asUTC - (date.getTime() - date.getMilliseconds())) / 60000);
}

/** True when `timeZone` is observing daylight saving time at `date`. */
export function isDST(date = new Date(), timeZone = getTimeZone()) {
  const y = date.getUTCFullYear();
  const jan = offsetMinutes(timeZone, new Date(Date.UTC(y, 0, 15)));
  const jul = offsetMinutes(timeZone, new Date(Date.UTC(y, 6, 15)));
  if (jan === jul) return false;
  return offsetMinutes(timeZone, date) > Math.min(jan, jul);
}

function intlName(timeZone, date, style, locale) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: style })
      .formatToParts(date)
      .find((p) => p.type === "timeZoneName")?.value;
  } catch (e) {
    if (e instanceof RangeError && /time ?zone/i.test(e.message)) return undefined;
    throw e; // bad locale etc. — surface it
  }
}

const OFFSET_ONLY = /^(GMT|UTC)([+-−]|$)/;
// Zones whose full name Intl reports only as an offset, but which share another zone's clock.
const LONG_ALIASES = {
  "Europe/Guernsey": "Europe/London",
  "Europe/Jersey": "Europe/London",
  "Europe/Isle_of_Man": "Europe/London",
};

function toDate(value) {
  const date = value == null ? new Date() : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date");
  return date;
}

/**
 * Choose the built-in name whose UTC offset equals the clock's offset at `date`,
 * and which was actually in use at that date.
 * Entries: [name, offset] | [name, offset, from] | [name, offset, from|null, to]  (minutes since epoch).
 * No match (e.g. a country changed its rules after this package was built) → undefined → Intl fallback.
 */
function byOffset(entries, offset, date) {
  const minute = date.getTime() / 60000;
  let best, bestRank;
  for (const e of entries) {
    if (e[1] !== offset) continue;
    const from = e[2] ?? -Infinity, to = e[3] ?? Infinity;
    if (minute < from || minute >= to) continue;
    // When two names overlap, the more specific one wins: narrower era, then more fixed ends.
    const rank = [to - from, -((e[2] != null) + (e[3] != null))];
    if (!bestRank || rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1])) {
      best = e[0]; bestRank = rank;
    }
  }
  return best;
}

function pick(entry, date, timeZone) {
  const list = [].concat(entry);
  return list.length > 1 && isDST(date, timeZone) ? list[1] : list[0];
}

/**
 * Time zone name in the chosen style.
 *  - style "short" (default): "PKT", "EST"/"EDT", "GMT"/"BST"
 *  - style "long": "Pakistan Standard Time", "Eastern Daylight Time" (localized via `locale`)
 * Falls back to the Intl offset ("GMT+5" / "GMT+05:00") when no name is known.
 *
 * @param {object} [options]
 * @param {"short"|"long"} [options.style] Defaults to "short".
 * @param {string} [options.timeZone] IANA zone; defaults to the browser's zone.
 * @param {Date|number|string} [options.date] Moment to evaluate (DST); defaults to now.
 * @param {string|string[]} [options.locale] Language for long names; defaults to the browser's.
 * @param {Record<string, string|[string, string]>} [options.overrides] Custom names per zone for this style.
 */
export function getTimeZoneName(options = {}) {
  const style = options.style || "short";
  if (style !== "short" && style !== "long") throw new RangeError(`Invalid style: ${style}`);
  const timeZone = options.timeZone || getTimeZone();
  const date = toDate(options.date);

  const custom = options.overrides?.[timeZone];
  if (custom != null) {
    if (intlName(timeZone, date, "short", "en-US") === undefined) throw new RangeError(`Invalid time zone: ${timeZone}`);
    return pick(custom, date, timeZone);
  }

  if (style === "short") {
    const known = ABBR[timeZone] && byOffset(ABBR[timeZone], offsetMinutes(timeZone, date), date);
    if (known) return known;
    // Unknown to our map: use Intl if it gives letters (it does for US zones in en-US).
    const intl = intlName(timeZone, date, "short", "en-US");
    if (intl === undefined) throw new RangeError(`Invalid time zone: ${timeZone}`);
    return intl;
  }

  const long = intlName(timeZone, date, "long", options.locale);
  if (long === undefined) throw new RangeError(`Invalid time zone: ${timeZone}`);
  if (OFFSET_ONLY.test(long) && LONG_ALIASES[timeZone]) {
    return intlName(LONG_ALIASES[timeZone], date, "long", options.locale) || long;
  }
  return long;
}

/** Short name, e.g. "PKT". Same options as getTimeZoneName, style fixed to "short". */
export function getShortName(options = {}) {
  return getTimeZoneName({ ...options, style: "short" });
}

/** Full name, e.g. "Pakistan Standard Time". Same options as getTimeZoneName, style fixed to "long". */
export function getLongName(options = {}) {
  return getTimeZoneName({ ...options, style: "long" });
}

/**
 * Format a date and append the zone name.
 *   style "short" (default): "Oct 14, 2026, 3:45 PM PKT"
 *   style "long":            "Oct 14, 2026, 3:45 PM Pakistan Standard Time"
 *
 * @param {Date|number|string} [date]
 * @param {object} [options]
 * @param {"short"|"long"} [options.style] Defaults to "short".
 * @param {string} [options.timeZone]
 * @param {string|string[]} [options.locale] Used for the date and the long name.
 * @param {Intl.DateTimeFormatOptions} [options.format] Defaults to dateStyle "medium", timeStyle "short".
 * @param {Record<string, string|[string, string]>} [options.overrides]
 */
export function formatWithTimeZone(date = new Date(), options = {}) {
  const d = toDate(date);
  const timeZone = options.timeZone || getTimeZone();
  const fmt = options.format || { dateStyle: "medium", timeStyle: "short" };
  const text = new Intl.DateTimeFormat(options.locale, { ...fmt, timeZone }).format(d);
  const name = getTimeZoneName({ ...options, timeZone, date: d });
  return `${text} ${name}`;
}

/** Same as formatWithTimeZone (kept for readability when you only use short names). */
export const formatWithShortName = formatWithTimeZone;

/** True when a real name (not just an offset) is known for the zone in that style. */
export function hasName(timeZone = getTimeZone(), style = "short") {

  const name = getTimeZoneName({ timeZone, style });
  return !OFFSET_ONLY.test(name);
}

/** True when a known letter abbreviation exists for the zone. */
export function hasShortName(timeZone = getTimeZone()) {
  return hasName(timeZone, "short");
}

export default getShortName;
