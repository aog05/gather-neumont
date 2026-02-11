export type ProfileAvatar = {
  provider: "dicebear";
  style: string;
  seed: string;
};

export type ProfileRecord = {
  username: string;
  displayName: string;
  email?: string;
  intendedMajorId: string;
  avatar: ProfileAvatar;
  updatedAt: string; // ISO timestamp
};

export type ProfileUpsertInput = Omit<ProfileRecord, "username" | "updatedAt">;
