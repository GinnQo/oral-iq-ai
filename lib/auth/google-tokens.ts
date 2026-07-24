import prisma from "@/lib/prisma";

export class GoogleReconnectRequiredError extends Error {
  constructor(message = "Google reconnect required") {
    super(message);
  }
}

type GoogleTokenResult = {
  accessToken: string;
  expiresAt: number | null;
};

const EXPIRY_SAFETY_WINDOW_SECONDS = 60;

function isTokenStillValid(expiresAt: number | null | undefined): boolean {
  if (!expiresAt) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return expiresAt - EXPIRY_SAFETY_WINDOW_SECONDS > nowSeconds;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    id_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new GoogleReconnectRequiredError(
      payload.error_description ?? payload.error ?? "Google token refresh failed"
    );
  }

  return payload;
}

export async function getGoogleAccessTokenForUser(userId: string): Promise<GoogleTokenResult> {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
      type: "oauth",
    },
    orderBy: {
      id: "asc",
    },
  });

  if (!account) {
    throw new GoogleReconnectRequiredError("Google account connection is missing");
  }

  if (account.access_token && isTokenStillValid(account.expires_at)) {
    return {
      accessToken: account.access_token,
      expiresAt: account.expires_at ?? null,
    };
  }

  if (!account.refresh_token) {
    throw new GoogleReconnectRequiredError("Google refresh token is missing");
  }

  const refreshed = await refreshGoogleAccessToken(account.refresh_token);
  const expiresAt = Math.floor(Date.now() / 1000) + (refreshed.expires_in ?? 3600);

  const updatedAccount = await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    data: {
      access_token: refreshed.access_token,
      expires_at: expiresAt,
      token_type: refreshed.token_type ?? account.token_type,
      scope: refreshed.scope ?? account.scope,
      id_token: refreshed.id_token ?? account.id_token,
      refresh_token: refreshed.refresh_token ?? account.refresh_token,
    },
  });

  if (!updatedAccount.access_token) {
    throw new GoogleReconnectRequiredError("Google access token is unavailable after refresh");
  }

  return {
    accessToken: updatedAccount.access_token,
    expiresAt: updatedAccount.expires_at ?? null,
  };
}
