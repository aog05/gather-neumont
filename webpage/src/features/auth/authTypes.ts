export type AuthMode = "unknown" | "guest" | "user" | "admin";

export type AuthMe = {
  userId: string;
  username: string;
  isGuest: boolean;
  isAdmin: boolean;
};

