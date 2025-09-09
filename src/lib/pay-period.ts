
import { addDays, differenceInDays, getYear, isBefore, nextThursday, startOfDay, startOfYear } from 'date-fns';

export interface PayPeriod {
    start: Date;
    end: Date;
    payDate: Date;
}

/**
 * Calculates the current bi-weekly pay period based on a given date.
 * A pay period starts on a Sunday and ends 13 days later on a Saturday.
 * The pay date is the Thursday following the end of the pay period.
 * The "current" period is the one whose pay date has not yet passed.
 *
 * @param date The date to calculate the pay period for.
 * @returns An object with the start date, end date, and pay date of the period.
 */
export function getCurrentPayPeriod(date: Date): PayPeriod {
    // A fixed anchor date for a known pay period start (Sunday, August 24, 2025)
    const anchorDate = new Date('2025-08-24T00:00:00');
    
    // Normalize the input date to the start of the day to avoid time zone issues
    const normalizedDate = startOfDay(date);

    // Calculate the number of days between the target date and the anchor.
    const daysDifference = differenceInDays(normalizedDate, anchorDate);

    // Determine how many 14-day cycles are between the dates.
    // Math.floor correctly handles both past and future dates.
    const cycles = Math.floor(daysDifference / 14);
    
    // Calculate the start of the period that CONTAINS the normalizedDate.
    let periodStart = addDays(anchorDate, cycles * 14);
    let periodEnd = addDays(periodStart, 13);
    let payDate = nextThursday(periodEnd);

    // If the calculated pay date is before today, we need the *next* period to be the "current" one.
    if (isBefore(payDate, normalizedDate)) {
        periodStart = addDays(periodStart, 14);
        periodEnd = addDays(periodStart, 13);
        payDate = nextThursday(periodEnd);
    }
    
    return {
        start: periodStart,
        end: periodEnd,
        payDate: payDate,
    };
}


/**
 * Calculates the *next* bi-weekly pay period based on a given date.
 * This is useful for predicting the upcoming pay cycle.
 *
 * @param date The date to calculate the next pay period from.
 * @returns An object for the next pay period.
 */
export function getNextPayPeriod(date: Date): PayPeriod {
    // Get the current period first
    const currentPeriod = getCurrentPayPeriod(date);
    
    // The next period starts 14 days after the current one starts
    const nextPeriodStart = addDays(currentPeriod.start, 14);
    const nextPeriodEnd = addDays(nextPeriodStart, 13);
    const nextPayDate = nextThursday(nextPeriodEnd);

    return {
        start: nextPeriodStart,
        end: nextPeriodEnd,
        payDate: nextPayDate,
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
