/**
 * Formats timestamps into compact relative times:
 * e.g., 'Just now', '5m', '1h', '18h', '2d'
 * Prevents raw ISO strings from leaking to the UI.
 */
export function formatStoryRelativeTime(dateInput?: string | number | null): string {
  if (!dateInput) return 'Just now';
  
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (trimmed === 'Just now' || trimmed === 'Recent') return trimmed;
    // If it is already in compact relative format
    if (/^\d+[mhd]$/.test(trimmed)) return trimmed;
  }

  try {
    const timeMs = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
    if (isNaN(timeMs) || timeMs <= 0) return 'Just now';

    const diffSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    return `${Math.floor(diffSec / 86400)}d`;
  } catch {
    return 'Just now';
  }
}
