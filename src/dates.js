// ---------------------------------------------------------------------------
// Shared date parsing / formatting for the whole UI.
//
// PocketBase returns timestamps as "YYYY-MM-DD HH:MM:SS.mmmZ" (space instead
// of "T"), values embedded in JSON come back as standard ISO "…T…Z", and a
// few code paths pass Date objects or epoch numbers. Parse ALL of them here
// so no screen ever renders "Invalid Date" — Safari in particular rejects
// the space-separated PocketBase format outright.
// ---------------------------------------------------------------------------

/**
 * parseDate('2026-10-19 08:23:22.486Z') → Date (same instant as the ISO form)
 * Accepts Date instances, epoch milliseconds, ISO strings, and PocketBase's
 * space-separated form. Returns an INVALID Date for blank/garbage input —
 * check with Number.isNaN(d.getTime()) or just use fmtDate.
 */
export function parseDate(value) {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value)
  let s = String(value ?? '').trim()
  if (!s) return new Date(NaN)
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(s)) {
    s = s.replace(' ', 'T')
    // A date-time without any timezone came from the server, which always
    // writes UTC — mark it so browsers don't guess the local zone.
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z'
  }
  return new Date(s)
}

/**
 * fmtDate('2026-10-19 08:23:22.486Z') → 'Oct 19, 2026, 9:23 AM' (local tz).
 * Blank / never-set / unparseable values render as an em dash — never
 * "Invalid Date" or "Invalid Date RangeError".
 */
export function fmtDate(value) {
  const d = parseDate(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
