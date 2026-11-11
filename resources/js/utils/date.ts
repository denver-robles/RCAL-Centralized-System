/**
 * Date and time utilities for RCAL PIMS Sacrament Scheduling.
 *
 * Preserves wall-clock local church time without unwanted UTC/timezone shifts.
 */

/**
 * Safely parses a sacrament date/time string from the backend into a Date object
 * preserving the exact wall-clock church time.
 */
export function parseSacramentDate(dateStr?: string | null): Date | null {
    if (!dateStr) return null;
    // Strip trailing Z or timezone offset to ensure local church wall-clock time is preserved
    const normalized = dateStr.replace(/Z$/, '').replace(/([+-]\d{2}:\d{2})$/, '');
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a sacrament date for display (e.g., "Sat, Dec 12, 2026").
 */
export function formatSacramentDate(dateStr?: string | null, fallback = 'Pending Assignment'): string {
    const d = parseSacramentDate(dateStr);
    if (!d) return fallback;
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Formats a sacrament time (12-hour AM/PM format, e.g., "10:00 AM").
 */
export function formatSacramentTime(dateStr?: string | null, fallback = ''): string {
    const d = parseSacramentDate(dateStr);
    if (!d) return fallback;
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Formats a sacrament time range (e.g. "10:00 AM – 11:00 AM").
 */
export function formatSacramentTimeRange(startsAt?: string | null, endsAt?: string | null, fallback = 'Pending Assignment'): string {
    const start = formatSacramentTime(startsAt);
    if (!start) return fallback;
    const end = formatSacramentTime(endsAt);
    return end ? `${start} – ${end}` : start;
}

/**
 * Converts a date string to "YYYY-MM-DDTHH:mm" format for <input type="datetime-local">.
 */
export function toDateTimeLocalString(dateStr?: string | null): string {
    if (!dateStr) return '';
    const d = parseSacramentDate(dateStr);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * Adds hours to a "YYYY-MM-DDTHH:mm" string.
 */
export function addHoursToDateTimeLocal(dateTimeLocalStr: string, hours = 1): string {
    if (!dateTimeLocalStr) return '';
    const d = parseSacramentDate(dateTimeLocalStr);
    if (!d) return '';
    d.setHours(d.getHours() + hours);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${h}:${min}`;
}
