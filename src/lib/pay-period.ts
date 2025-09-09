
import { startOfWeek, endOfWeek, addDays, nextThursday } from 'date-fns';

/**
 * Calculates the current or next bi-weekly pay period based on a given date.
 * A pay period starts on a Sunday and ends 13 days later on a Saturday.
 * The pay date is the Thursday following the end of the pay period.
 *
 * @param date The date to calculate the pay period for.
 * @returns An object with the start date, end date, and pay date of the period.
 */
export function getNextPayPeriod(date: Date): { start: Date, end: Date, payDate: Date } {
    // A week in our context starts on Sunday.
    const weekOptions = { weekStartsOn: 0 as 0 | 1 | 2 | 3 | 4 | 5 | 6 };

    // Find the start of the week for the given date.
    const weekStart = startOfWeek(date, weekOptions);

    // Bi-weekly periods can be determined by the week number of the year.
    // We'll use a reference point. Let's assume the first pay period of 2024 started on Jan 7.
    const referenceDate = new Date('2024-01-07T00:00:00');
    const daysSinceReference = Math.floor((weekStart.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine if we are in an "even" or "odd" 14-day cycle.
    const cycleNumber = Math.floor(daysSinceReference / 14);

    // Calculate the start of the current 14-day cycle.
    const periodStart = addDays(referenceDate, cycleNumber * 14);

    // If the provided date is already past the calculated start, we might need the next period.
    // However, the logic here will place the date within its correct period.
    let currentPeriodStart = periodStart;
    if (date < currentPeriodStart) {
        // This case should be rare if we calculate from today, but handles past dates.
        const prevCycleNumber = Math.floor(daysSinceReference / 14) -1;
         currentPeriodStart = addDays(referenceDate, prevCycleNumber * 14);
    }
     // If the date falls into the second week of a cycle, we need to adjust.
    if(daysSinceReference % 14 >= 7 && startOfWeek(date, weekOptions) > periodStart) {
        // no-op, periodStart is correct
    } else if (date < periodStart) {
         // This can happen if a date is right at the beginning of a cycle.
        const cycles = Math.floor(daysSinceReference / 14);
        currentPeriodStart = addDays(referenceDate, (cycles-1) * 14);
    }

    // A pay period is always 14 days (Sunday to the Saturday 13 days later).
    const periodEnd = addDays(currentPeriodStart, 13);
    
    // The pay date is the next Thursday after the period ends.
    const payDate = nextThursday(periodEnd);

    return {
        start: currentPeriodStart,
        end: periodEnd,
        payDate: payDate,
    };
}
