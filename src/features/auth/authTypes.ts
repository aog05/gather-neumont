export type AuthMode = "unknown" | "guest" | "user" | "admin";

export type AuthMe = {
  username: string;
  isAdmin: boolean;
};

