/**
 * Timezone utilities for Mountain Time (America/Denver).
 * All quiz dates are determined in Mountain Time.
 */

const MOUNTAIN_TZ = "America/Denver";

/**
 * Get the current date in Mountain Time as YYYY-MM-DD.
 */
export function getMountainDateKey(): string {
  const now = new Date();
  // Format in Mountain Time
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOUNTAIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA gives YYYY-MM-DD format
  return formatter.format(now);
}

/**
 * Get the current date/time in Mountain Time as an object.
 */
export function getMountainDateTime(): {
  dateKey: string;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const now = new Date();

  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MOUNTAIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MOUNTAIN_TZ,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const dateKey = dateFormatter.format(now);
  const [year, month, day] = dateKey.split("-").map(Number);

  const timeParts = timeFormatter.format(now).split(":");
  const hours = parseInt(timeParts[0], 10);
  const minutes = parseInt(timeParts[1], 10);

  return { dateKey, year, month, day, hours, minutes };
}
