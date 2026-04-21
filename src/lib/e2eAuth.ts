import type { Family, Profile } from '@/types/entities';

const E2E_AUTH_KEY = 'gogettr-e2e-auth';

interface E2EUser {
  id: string;
  email: string;
}

interface E2EAuthState {
  user: E2EUser | null;
  profile: Profile | null;
  family: Family | null;
}

export function isE2EMockAuthEnabled() {
  return import.meta.env.VITE_E2E_MOCK_AUTH === 'true';
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function readE2EAuthState(): E2EAuthState | null {
  if (!isE2EMockAuthEnabled() || !canUseStorage()) {
    return null;
  }

  const raw = window.sessionStorage.getItem(E2E_AUTH_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as E2EAuthState;
  } catch {
    window.sessionStorage.removeItem(E2E_AUTH_KEY);
    return null;
  }
}

export function writeE2EAuthState(state: E2EAuthState) {
  if (!isE2EMockAuthEnabled() || !canUseStorage()) {
    return;
  }

  window.sessionStorage.setItem(E2E_AUTH_KEY, JSON.stringify(state));
}

export function clearE2EAuthState() {
  if (!isE2EMockAuthEnabled() || !canUseStorage()) {
    return;
  }

  window.sessionStorage.removeItem(E2E_AUTH_KEY);
}
