
import { addDays, differenceInDays, nextThursday, startOfDay } from 'date-fns';

/**
 * Calculates the current bi-weekly pay period based on a given date.
 * A pay period starts on a Sunday and ends 13 days later on a Saturday.
 * The pay date is the Thursday following the end of the pay period.
 *
 * @param date The date to calculate the pay period for.
 * @returns An object with the start date, end date, and pay date of the period.
 */
export function getNextPayPeriod(date: Date): { start: Date, end: Date, payDate: Date } {
    // A fixed anchor date for a known pay period start (Sunday, August 25, 2024)
    const anchorDate = new Date('2024-08-25T00:00:00');
    
    // Normalize the input date to the start of the day to avoid time zone issues
    const normalizedDate = startOfDay(date);

    // Calculate the number of days that have passed since the anchor date
    const daysSinceAnchor = differenceInDays(normalizedDate, anchorDate);

    // Determine how many 14-day cycles have passed since the anchor
    const cyclesPassed = Math.floor(daysSinceAnchor / 14);

    // Calculate the start date of the current pay period
    const periodStart = addDays(anchorDate, cyclesPassed * 14);

    // Calculate the end date of the pay period (13 days after the start)
    const periodEnd = addDays(periodStart, 13);
    
    // The pay date is the next Thursday after the period ends
    const payDate = nextThursday(periodEnd);

    return {
        start: periodStart,
        end: periodEnd,
        payDate: payDate,
    };
}
