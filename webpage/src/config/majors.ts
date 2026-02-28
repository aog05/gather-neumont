export type MajorId =
  | "BSCS"
  | "BSSE"
  | "BSIS"
  | "BSGD"
  | "BSAIE"
  | "BSAAI"
  | "UNDECIDED";

export const MAJORS: Array<{ id: MajorId; label: string; logoPath: string }> = [
  { id: "BSCS", label: "Computer Science", logoPath: "/assets/majors/bscs.svg" },
  { id: "BSSE", label: "Software Engineering", logoPath: "/assets/majors/bsse.svg" },
  { id: "BSIS", label: "Information Systems", logoPath: "/assets/majors/bsis.svg" },
  { id: "BSGD", label: "Game Development", logoPath: "/assets/majors/bsgd.svg" },
  { id: "BSAIE", label: "AI Engineering", logoPath: "/assets/majors/bsaie.svg" },
  { id: "BSAAI", label: "Applied AI", logoPath: "/assets/majors/bsaai.svg" },
  { id: "UNDECIDED", label: "Undecided", logoPath: "/assets/majors/undecided.svg" },
];
