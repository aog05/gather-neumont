const GUEST_CHOSEN_KEY = "happy-volhard.auth.guestChosen.v1";

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeBool(key: string, value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(key, "1");
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export const authStorage = {
  keys: {
    guestChosen: GUEST_CHOSEN_KEY,
  },

  isGuestChosen(): boolean {
    return readBool(GUEST_CHOSEN_KEY);
  },

  setGuestChosen(chosen: boolean): void {
    writeBool(GUEST_CHOSEN_KEY, chosen);
  },

  clear(): void {
    writeBool(GUEST_CHOSEN_KEY, false);
  },
};

