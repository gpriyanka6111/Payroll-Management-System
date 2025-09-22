
import { getMinutes, setMinutes, setSeconds, setMilliseconds, addHours } from 'date-fns';

/**
 * Applies custom rounding rules to a given date object.
 * Rules:
 * - 0-9 minutes past the hour: round down to the hour (:00).
 * - 10-15 minutes past the hour: round up to the next quarter-hour (:15).
 * - 16-30 minutes past the hour: round up to the next half-hour (:30).
 * - 31-44 minutes past the hour: round down to the half-hour (:30).
 * - 45-59 minutes past the hour: round up to the next hour (:00 of next hour).
 *
 * This is a specific business logic implementation and may not align with
 * standard FLSA (e.g., 7-minute rule) rounding practices.
 *
 * @param date The date object to apply rounding to.
 * @returns A new Date object with the rounding rules applied.
 */
export function applyRoundingRules(date: Date): Date {
  const minutes = getMinutes(date);
  let roundedDate = setSeconds(setMilliseconds(date, 0), 0);

  if (minutes >= 1 && minutes <= 9) {
    // Round down to :00 (grace period)
    roundedDate = setMinutes(roundedDate, 0);
  } else if (minutes >= 10 && minutes <= 15) {
    // Round up to :15
    roundedDate = setMinutes(roundedDate, 15);
  } else if (minutes >= 16 && minutes <= 30) {
    // Round up to :30
    roundedDate = setMinutes(roundedDate, 30);
  } else if (minutes >= 31 && minutes <= 44) {
    // Round down to :30
    roundedDate = setMinutes(roundedDate, 30);
  } else if (minutes >= 45 && minutes <= 59) {
    // Round up to the next hour
    roundedDate = setMinutes(addHours(roundedDate, 1), 0);
  }
  // If minutes are 0, no change is needed.

  return roundedDate;
}
