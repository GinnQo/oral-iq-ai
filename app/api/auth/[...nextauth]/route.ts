import NextAuth, {
  type NextAuthOptions,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

async function refreshGoogleAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      throw new Error(
        "No Google refresh token is available. Please sign in again."
      );
    }

    const response = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id:
            process.env.GOOGLE_CLIENT_ID ?? "",
          client_secret:
            process.env.GOOGLE_CLIENT_SECRET ?? "",
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
        }),
      }
    );

    const refreshedTokens =
      (await response.json()) as GoogleTokenResponse & {
        error?: string;
        error_description?: string;
      };

    if (!response.ok) {
      throw new Error(
        refreshedTokens.error_description ??
          refreshedTokens.error ??
          "Google token refresh failed."
      );
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires:
        Date.now() +
        refreshedTokens.expires_in * 1000,
      refreshToken:
        refreshedTokens.refresh_token ??
        token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    console.error(
      "[NextAuth] Google token refresh failed:",
      error
    );

    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.rosters.readonly",
            "https://www.googleapis.com/auth/classroom.profile.emails",
            "https://www.googleapis.com/auth/drive.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires:
            typeof account.expires_at === "number"
              ? account.expires_at * 1000
              : Date.now() + 60 * 60 * 1000,
          refreshToken:
            account.refresh_token ??
            (token as any).refreshToken,
          error: undefined,
        };
      }

      const accessTokenExpires =
        typeof (token as any)
          .accessTokenExpires === "number"
          ? (token as any).accessTokenExpires
          : 0;

      if (
        Date.now() <
        accessTokenExpires - 60_000
      ) {
        return token;
      }

      return refreshGoogleAccessToken(token);
    },

    async session({ session, token }) {
      (session as any).accessToken =
        (token as any).accessToken;

      (session as any).authError =
        (token as any).error;

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export {
  handler as GET,
  handler as POST,
};