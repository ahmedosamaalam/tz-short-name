# tz-short-name

Get time zone names like **PKT**, **IST**, **GST**, **EST/EDT** from the user's browser time zone — or the full name (**Pakistan Standard Time**) when you need it. Short is the default.

JavaScript's built-in `Intl` only knows letter abbreviations for a few regions (mostly the US). For most of the world it returns an offset instead:

```js
new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Karachi", timeZoneName: "short" }).format(new Date());
// "10/14/2026, GMT+5"   ← not "PKT"
```

`tz-short-name` fixes that with a small built-in map, and still switches correctly between standard and daylight time (EST → EDT, GMT → BST, AEST → AEDT).

- Zero dependencies, ~7 KB gzipped
- Works in browsers, Node, Deno, Bun
- ESM, CommonJS and a `<script>` build, with TypeScript types
- Every country except Jordan, Syria and Kazakhstan has letter names (409 of the 418 zones browsers report). Those three changed their offsets recently and have no agreed abbreviation, so they fall back to `Intl` (`GMT+3`, `GMT+5`); set your own with `overrides` if you need letters.

## Install

```bash
npm install tz-short-name
```

## Usage

```js
import { getTimeZoneName, formatWithTimeZone } from "tz-short-name";

// Short (default)
getTimeZoneName();                              // "PKT"  (uses the browser's time zone)
getTimeZoneName({ timeZone: "Asia/Dubai" });    // "GST"
getTimeZoneName({ timeZone: "America/New_York", date: "2026-07-01" }); // "EDT"

// Full
getTimeZoneName({ style: "long" });             // "Pakistan Standard Time"
getTimeZoneName({ style: "long", locale: "ur-PK" }); // "پاکستان کا معیاری وقت"

// Date + zone
formatWithTimeZone(new Date());                 // "Oct 14, 2026, 3:45 PM PKT"
formatWithTimeZone(new Date(), { style: "long" }); // "Oct 14, 2026, 3:45 PM Pakistan Standard Time"
formatWithTimeZone(Date.now(), {
  locale: "en-GB",
  format: { hour: "2-digit", minute: "2-digit" },
});                                             // "15:45 PKT"
```

Shortcuts: `getShortName()` and `getLongName()` take the same options without `style`.

Let users pick:

```jsx
const [style, setStyle] = useState("short");
<span>{formatWithTimeZone(order.createdAt, { style })}</span>
```

CommonJS:

```js
const { getTimeZoneName } = require("tz-short-name");
```

Browser `<script>`:

```html
<script src="https://unpkg.com/tz-short-name"></script>
<script>console.log(TzShortName.getTimeZoneName());</script>
```

### Daylight saving

Both styles switch automatically at the exact minute the clocks change (EST → EDT, GMT → BST, AEST → AEDT, even Lord Howe Island's half-hour shift). Pass `date` to get the name that applied at any moment, including the past — `Asia/Karachi` in July 2008 is `PKST`.

The package never decides on its own when daylight saving starts. It asks the browser what the clock's UTC offset is at that moment, then picks the name that belongs to that offset. So when a country changes its rules (British Columbia, Alberta, Manitoba and Yukon stop changing clocks on 1 Nov 2026), the clock follows the browser's own up-to-date data, and if the browser reports an offset this package has no name for, it shows `GMT-7` rather than a wrong name.

### Where the names come from

- **Short** names come from this package's built-in map, because browsers don't have them. Each name is stored with its UTC offset and the dates it was in use.
- **Long** names come from the browser itself (`Intl`), so they're translated into the user's language and kept up to date by the browser. About 396 of 418 zones have one; the rest fall back to an offset like `GMT+03:00`.

## API

| Function | Returns |
| --- | --- |
| `getTimeZoneName({ style?, timeZone?, date?, locale?, overrides? })` | `"PKT"`, or `"Pakistan Standard Time"` with `style: "long"` |
| `getShortName(options?)` | Same, always short |
| `getLongName(options?)` | Same, always long |
| `formatWithTimeZone(date?, { style?, timeZone?, locale?, format?, overrides? })` | Formatted date + zone name |
| `formatWithShortName(...)` | Alias of `formatWithTimeZone` |
| `getTimeZone()` | Browser IANA zone, e.g. `"Asia/Karachi"` |
| `isDST(date?, timeZone?)` | `true` during daylight saving |
| `hasName(timeZone?, style?)` | `true` if a real name (not an offset) is known |
| `hasShortName(timeZone?)` | Same as `hasName(tz, "short")` |

`style` defaults to `"short"`. `locale` defaults to the browser's language. Invalid zones, dates or styles throw a `RangeError`.

### Overrides

Some abbreviations are shared by more than one country (**IST** is India, Ireland and Israel; **BST** is British Summer Time and Bangladesh; **CST** is US Central and China). If you need something specific, pass your own:

```js
getTimeZoneName({ overrides: { "Asia/Dhaka": "BDT", "America/New_York": ["ET", "ET"] } });
getTimeZoneName({ style: "long", overrides: { "Asia/Amman": "Jordan Time" } });
```

A string sets one name; a `[standard, daylight]` pair sets both. Overrides apply to the style you ask for, so pass short names with short and full names with long.

The raw map is also exported: `import map from "tz-short-name/abbreviations.json"`. Each zone maps to `[name, offsetMinutes, from?, to?]` entries (`from`/`to` are minutes since 1970, present only when a name was introduced or retired after 2000).

## Updating the data

The map is generated from `moment-timezone` and `@vvo/tzdb` (dev dependencies only), plus manual fixes in `scripts/overrides.json`:

```bash
npm run generate && npm run build && npm test
```

## Accuracy

Checked against the official time zone database (2026e) one minute before and after every clock change from 2010 to 2027 — 9,060 checks. Every name since 2023 is correct. 43 older dates (2010–2022) in four zones that changed their rules several times (Libya, Ciudad Juárez, Metlakatla, Istanbul) show a neighbouring name or `GMT±`.

## License

MIT
