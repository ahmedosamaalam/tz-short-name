export type NameStyle = "short" | "long";
export type NameOverrides = Record<string, string | [standard: string, daylight: string]>;
/** @deprecated use NameOverrides */
export type ShortNameOverrides = NameOverrides;

export interface NameOptions {
  /** "short" (default) → "PKT"; "long" → "Pakistan Standard Time". */
  style?: NameStyle;
  /** IANA time zone, e.g. "Asia/Karachi". Defaults to the browser's zone. */
  timeZone?: string;
  /** Moment to evaluate (decides EST vs EDT). Defaults to now. */
  date?: Date | number | string;
  /** Language for long names, e.g. "ur-PK". Defaults to the browser's language. */
  locale?: string | string[];
  /** Your own names per zone for the chosen style; wins over the built-in data. */
  overrides?: NameOverrides;
}

export type ShortNameOptions = Omit<NameOptions, "style">;

export interface FormatOptions {
  /** "short" (default) or "long". */
  style?: NameStyle;
  timeZone?: string;
  /** Used for the date text and the long name. */
  locale?: string | string[];
  /** Defaults to { dateStyle: "medium", timeStyle: "short" }. */
  format?: Intl.DateTimeFormatOptions;
  overrides?: NameOverrides;
}

/** The browser's IANA time zone, e.g. "Asia/Karachi". */
export function getTimeZone(): string;
/** Zone name in the chosen style (short by default); falls back to the Intl offset when unknown. */
export function getTimeZoneName(options?: NameOptions): string;
/** Short name like "PKT", "EST"/"EDT". */
export function getShortName(options?: ShortNameOptions): string;
/** Full name like "Pakistan Standard Time". */
export function getLongName(options?: ShortNameOptions): string;
/** "Oct 14, 2026, 3:45 PM PKT" (or the full name with style "long"). */
export function formatWithTimeZone(date?: Date | number | string, options?: FormatOptions): string;
/** Alias of formatWithTimeZone. */
export function formatWithShortName(date?: Date | number | string, options?: FormatOptions): string;
/** Whether the zone observes daylight saving at that date. */
export function isDST(date?: Date, timeZone?: string): boolean;
/** Whether a real name (not just an offset) is known for the zone in that style. */
export function hasName(timeZone?: string, style?: NameStyle): boolean;
/** Whether a letter abbreviation is known for the zone. */
export function hasShortName(timeZone?: string): boolean;

export default getShortName;
