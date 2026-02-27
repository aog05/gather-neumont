/**
 * Date/time helpers for server-local time.
 * NOTE: Function names are kept for compatibility with existing imports.
 */
export function getMountainDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the current local date/time as an object.
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
  const dateKey = getMountainDateKey();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  return { dateKey, year, month, day, hours, minutes };
}
