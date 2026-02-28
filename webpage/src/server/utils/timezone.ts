const MOUNTAIN_TIMEZONE = "America/Denver";

function getMountainParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: MOUNTAIN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const value = (type: string): number =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? "0", 10);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hours: value("hour"),
    minutes: value("minute"),
  };
}

export function getMountainDateKey(): string {
  const now = getMountainParts(new Date());
  return `${String(now.year).padStart(4, "0")}-${String(now.month).padStart(
    2,
    "0"
  )}-${String(now.day).padStart(2, "0")}`;
}

export function getMountainDateTime(): {
  dateKey: string;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  const now = getMountainParts(new Date());
  return {
    dateKey: `${String(now.year).padStart(4, "0")}-${String(now.month).padStart(
      2,
      "0"
    )}-${String(now.day).padStart(2, "0")}`,
    ...now,
  };
}

