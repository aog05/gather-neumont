import type { MajorId } from "../../config/majors";
import type { DicebearStyleId } from "../../avatars/dicebear_registry";

export type ProfileDraft = {
  displayName: string;
  email?: string;
  avatar: { provider: "dicebear"; style: DicebearStyleId; seed: string };
  intendedMajorId: MajorId;
};
