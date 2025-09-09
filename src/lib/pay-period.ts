
import { addDays, differenceInDays, getYear, nextThursday, startOfDay, startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';

export interface PayPeriod {
    start: Date;
    end: Date;
    payDate: Date;
}

/**
 * Calculates the current bi-weekly pay period based on a given date.
 * A pay period starts on a Sunday and ends 13 days later on a Saturday.
 * The pay date is the Thursday following the end of the pay period.
 *
 * @param date The date to calculate the pay period for.
 * @returns An object with the start date, end date, and pay date of the period.
 */
export function getNextPayPeriod(date: Date): PayPeriod {
    // A fixed anchor date for a known pay period start (Sunday, August 24, 2025)
    const anchorDate = new Date('2025-08-24T00:00:00');
    
    // Normalize the input date to the start of the day to avoid time zone issues
    const normalizedDate = startOfDay(date);

    // Calculate the number of days that have passed since the anchor date
    const daysSinceAnchor = differenceInDays(normalizedDate, anchorDate);

    // Determine how many 14-day cycles have passed since the anchor
    // We use Math.floor to get the cycle the date falls within, and add 1 to get the next one.
    const cyclesForNextPeriod = Math.floor(daysSinceAnchor / 14) + 1;

    // Calculate the start date of the current pay period
    const periodStart = addDays(anchorDate, cyclesForNextPeriod * 14);

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


/**
 * Generates all bi-weekly pay periods for a given year.
 * @param year The year to generate pay periods for.
 * @returns An array of PayPeriod objects for the entire year.
 */
export function getYearlyPayPeriods(year: number): PayPeriod[] {
    // A fixed anchor date for a known pay period start (Sunday, August 24, 2025)
    const anchorDate = new Date('2025-08-24T00:00:00');
    const periods: PayPeriod[] = [];
    
    // Find the first Sunday of a pay period for the given year or earlier
    const yearStartDate = startOfYear(new Date(year, 0, 1));
    const daysSinceAnchor = differenceInDays(yearStartDate, anchorDate);
    const cyclesSinceAnchor = Math.floor(daysSinceAnchor / 14);
    let currentPeriodStart = addDays(anchorDate, cyclesSinceAnchor * 14);

    // Loop until we are past the given year
    while (getYear(currentPeriodStart) <= year) {
        const periodEnd = addDays(currentPeriodStart, 13);
        const payDate = nextThursday(periodEnd);

        // Only add the period if its start date is within the target year
        if (getYear(currentPeriodStart) === year) {
             periods.push({
                start: currentPeriodStart,
                end: periodEnd,
                payDate,
            });
        }
       
        // Move to the start of the next 14-day period
        currentPeriodStart = addDays(currentPeriodStart, 14);
    }

    return periods;
}
