const INTERNAL_AUTH_DOMAIN = 'users.gogettr.local';

function sanitizeAliasSegment(value: string): string {
  return value
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildInternalAuthEmail(email: string): string {
  const normalized = email.normalize('NFKC').trim().toLowerCase();

  if (!normalized) {
    throw new Error('email must not be blank');
  }

  const [localPart, ...domainParts] = normalized.split('@');
  const safeLocalPart = sanitizeAliasSegment(localPart);

  if (!safeLocalPart) {
    throw new Error('email must contain a usable local part');
  }

  const safeDomain = sanitizeAliasSegment(domainParts.join('@'));

  if (!safeDomain) {
    return `${safeLocalPart}@${INTERNAL_AUTH_DOMAIN}`;
  }

  return `${safeLocalPart}-at-${safeDomain}@${INTERNAL_AUTH_DOMAIN}`;
}

export function suggestStarterPassword(firstName: string): string {
  const normalized = firstName.normalize('NFKC').trim();

  if (!normalized) {
    throw new Error('firstName must not be blank');
  }

  return `${normalized}123`;
}
