const PLATFORM_OWNER_EMAIL_FALLBACK = "grammargalaxy1@gmail.com";

function normalizeEmail(email: string | null | undefined) {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function getPlatformOwnerEmail() {
  return (
    normalizeEmail(process.env.PLATFORM_OWNER_EMAIL) ??
    PLATFORM_OWNER_EMAIL_FALLBACK
  );
}

export function isPlatformOwner(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return false;
  }

  return normalizedEmail === getPlatformOwnerEmail();
}

export function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === "development";
}

export function hasTeacherSubscriptionBypass(email: string | null | undefined) {
  if (isPlatformOwner(email)) {
    return true;
  }

  return isDevelopmentEnvironment() && Boolean(normalizeEmail(email));
}