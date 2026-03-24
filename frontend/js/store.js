const USER_ID_KEY = "campus-books-user-id";
const USER_PROFILE_KEY = "campus-books-user-profile";

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const authStore = {
  getUserId() {
    return parseNumber(window.localStorage.getItem(USER_ID_KEY));
  },

  setUserId(userId) {
    const parsed = parseNumber(userId);
    if (parsed === null) {
      window.localStorage.removeItem(USER_ID_KEY);
      return;
    }
    window.localStorage.setItem(USER_ID_KEY, String(parsed));
  },

  getProfile() {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(USER_PROFILE_KEY);
      return null;
    }
  },

  setProfile(profile) {
    if (!profile) {
      window.localStorage.removeItem(USER_PROFILE_KEY);
      return;
    }
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  },

  setSession({ userId, profile }) {
    this.setUserId(userId);
    this.setProfile(profile ?? null);
  },

  clear() {
    window.localStorage.removeItem(USER_ID_KEY);
    window.localStorage.removeItem(USER_PROFILE_KEY);
  },
};
