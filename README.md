# tz-short-name

Show time zone names like **PKT**, **GST**, **AST**, **IST** and **EST/EDT** from the user's browser time zone, or the full name (**Pakistan Standard Time**, **Gulf Standard Time**) when you need it. Short is the default.

## The problem

JavaScript's built-in `Intl` only knows short names for a few regions, mostly the US. For most of the world, including Pakistan, India and the Gulf, it gives you an offset instead:

```js
new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Karachi", timeZoneName: "short" }).format(new Date());
// "10/14/2026, GMT+5"   ← users expect "PKT"

new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dubai", timeZoneName: "short" }).format(new Date());
// "10/14/2026, GMT+4"   ← users expect "GST"
```

`tz-short-name` returns the name people actually use:

```js
getTimeZoneName();   // "PKT"  in Pakistan
                     // "GST"  in the UAE
                     // "AST"  in Saudi Arabia
                     // "EDT"  in New York (summer), "EST" in winter
```

- Zero dependencies, ~7 KB gzipped
- Works in browsers, Node, Deno and Bun
- ESM, CommonJS and a `<script>` build, with TypeScript types
- Handles daylight saving automatically

## Install

```bash
npm install tz-short-name
```

## Usage

```js
import { getTimeZoneName, formatWithTimeZone } from "tz-short-name";

// Short (default), uses the browser's time zone
getTimeZoneName();                                   // "PKT"

// Any time zone
getTimeZoneName({ timeZone: "Asia/Dubai" });         // "GST"
getTimeZoneName({ timeZone: "Asia/Riyadh" });        // "AST"
getTimeZoneName({ timeZone: "Asia/Kolkata" });       // "IST"
getTimeZoneName({ timeZone: "America/New_York", date: "2026-07-01" }); // "EDT"

// Full name
getTimeZoneName({ style: "long" });                  // "Pakistan Standard Time"
getTimeZoneName({ timeZone: "Asia/Riyadh", style: "long" });            // "Arabian Standard Time"

// Full name in the user's language
getTimeZoneName({ style: "long", locale: "ur-PK" }); // "پاکستان کا معیاری وقت"
getTimeZoneName({ timeZone: "Asia/Dubai", style: "long", locale: "ar" }); // "توقيت الخليج"

// Date + time zone
formatWithTimeZone(new Date());                      // "Oct 14, 2026, 3:45 PM PKT"
formatWithTimeZone(new Date(), { style: "long" });   // "Oct 14, 2026, 3:45 PM Pakistan Standard Time"
formatWithTimeZone(new Date(), { timeZone: "Asia/Dubai" });            // "Oct 14, 2026, 2:45 PM GST"
formatWithTimeZone(Date.now(), {
  locale: "en-GB",
  format: { hour: "2-digit", minute: "2-digit" },
});                                                  // "15:45 PKT"
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

## Examples by country

| Country | Time zone | Short | Full |
| --- | --- | --- | --- |
| Pakistan | `Asia/Karachi` | PKT | Pakistan Standard Time |
| India | `Asia/Kolkata` | IST | India Standard Time |
| Bangladesh | `Asia/Dhaka` | BST | Bangladesh Standard Time |
| Saudi Arabia | `Asia/Riyadh` | AST | Arabian Standard Time |
| UAE | `Asia/Dubai` | GST | Gulf Standard Time |
| Qatar | `Asia/Qatar` | AST | Arabian Standard Time |
| Kuwait | `Asia/Kuwait` | AST | Arabian Standard Time |
| Bahrain | `Asia/Bahrain` | AST | Arabian Standard Time |
| Oman | `Asia/Muscat` | GST | Gulf Standard Time |
| Iraq | `Asia/Baghdad` | AST | Arabian Standard Time |
| Yemen | `Asia/Aden` | AST | Arabian Standard Time |
| Egypt | `Africa/Cairo` | EET / EEST | Eastern European Standard / Summer Time |
| Lebanon | `Asia/Beirut` | EET / EEST | Eastern European Standard / Summer Time |
| Algeria | `Africa/Algiers` | CET | Central European Standard Time |
| Tunisia | `Africa/Tunis` | CET | Central European Standard Time |
| Libya | `Africa/Tripoli` | EET | Eastern European Standard Time |
| Sudan | `Africa/Khartoum` | CAT | Central Africa Time |
| United Kingdom | `Europe/London` | GMT / BST | Greenwich Mean Time / British Summer Time |
| United States (East) | `America/New_York` | EST / EDT | Eastern Standard / Daylight Time |
| Australia (Sydney) | `Australia/Sydney` | AEST / AEDT | Australian Eastern Standard / Daylight Time |

A few countries have no widely agreed short name, so you get the offset instead: **Jordan** and **Syria** (`GMT+3`), **Morocco** (`GMT+1`) and **Kazakhstan** (`GMT+5`). You can set your own with `overrides`.

## Daylight saving

Names switch automatically at the exact minute the clocks change: EST → EDT, GMT → BST, EET → EEST in Egypt and Lebanon. Pass `date` to get the name for any moment, past or future. For example, Pakistan in July 2008 shows `PKST`.

When a country changes its daylight saving rules, the switch dates follow the user's browser, which is kept up to date with the operating system.

## API

| Function | Returns |
| --- | --- |
| `getTimeZoneName({ style?, timeZone?, date?, locale?, overrides? })` | `"PKT"`, or `"Pakistan Standard Time"` with `style: "long"` |
| `getShortName(options?)` | Same, always short |
| `getLongName(options?)` | Same, always long |
| `formatWithTimeZone(date?, { style?, timeZone?, locale?, format?, overrides? })` | Formatted date + time zone name |
| `formatWithShortName(...)` | Alias of `formatWithTimeZone` |
| `getTimeZone()` | Browser time zone, e.g. `"Asia/Karachi"` |
| `isDST(date?, timeZone?)` | `true` during daylight saving |
| `hasName(timeZone?, style?)` | `true` if a real name (not an offset) is known |
| `hasShortName(timeZone?)` | Same as `hasName(tz, "short")` |

`style` defaults to `"short"`. `locale` defaults to the browser's language. An invalid time zone, date or style throws a `RangeError`.

## Overrides

Some short names are used by more than one country: **AST** is Arabia and the Atlantic, **IST** is India, Ireland and Israel, **BST** is Britain and Bangladesh. To show something specific, pass your own:

```js
getTimeZoneName({ overrides: { "Asia/Dhaka": "BDT", "Asia/Riyadh": "KSA" } });
getTimeZoneName({ overrides: { "Asia/Amman": "AST" } });                       // Jordan
getTimeZoneName({ style: "long", overrides: { "Asia/Amman": "Jordan Time" } });
```

A string sets one name; a `[standard, daylight]` pair sets both, e.g. `["EET", "EEST"]`. Overrides apply to the style you ask for.

## License

MIT
