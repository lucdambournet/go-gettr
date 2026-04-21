const TOKEN_KEY = 'pending-invite-token';
const NAME_KEY = 'pending-invite-name';

export const inviteStorage = {
  save(token: string, name: { firstName: string; lastName: string }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(NAME_KEY, JSON.stringify(name));
  },
  get(): { token: string; firstName: string; lastName: string } | null {
    const token = localStorage.getItem(TOKEN_KEY);
    const nameStr = localStorage.getItem(NAME_KEY);
    if (!token || !nameStr) return null;
    try {
      const name = JSON.parse(nameStr);
      return { token, ...name };
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
  },
};
