import NextAuth, {
  type NextAuthOptions,
} from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import prisma from "@/lib/prisma";

type OAuthAccountLike = {
  provider?: string;
  providerAccountId?: string;
  type?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "database",
  },

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
    async signIn({ user, account }) {
      const oauth = account as OAuthAccountLike | null;

      if (
        !oauth ||
        oauth.provider !== "google" ||
        oauth.type !== "oauth" ||
        !oauth.providerAccountId
      ) {
        return true;
      }

      const email = user.email?.trim().toLowerCase();
      const persistedUser = email
        ? await prisma.user.findUnique({
            where: { email },
            select: { id: true },
          })
        : null;

      // For first-time OAuth users, let PrismaAdapter create/link User + Account first.
      if (!persistedUser) {
        return true;
      }

      const existingAccount = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: oauth.providerAccountId,
          },
        },
      });

      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: oauth.providerAccountId,
          },
        },
        update: {
          userId: persistedUser.id,
          type: "oauth",
          access_token: oauth.access_token ?? existingAccount?.access_token ?? undefined,
          refresh_token: oauth.refresh_token ?? existingAccount?.refresh_token ?? undefined,
          expires_at: oauth.expires_at ?? existingAccount?.expires_at ?? undefined,
          token_type: oauth.token_type ?? existingAccount?.token_type ?? undefined,
          scope: oauth.scope ?? existingAccount?.scope ?? undefined,
          id_token: oauth.id_token ?? existingAccount?.id_token ?? undefined,
          session_state: oauth.session_state ?? existingAccount?.session_state ?? undefined,
        },
        create: {
          userId: persistedUser.id,
          type: "oauth",
          provider: "google",
          providerAccountId: oauth.providerAccountId,
          access_token: oauth.access_token,
          refresh_token: oauth.refresh_token,
          expires_at: oauth.expires_at,
          token_type: oauth.token_type,
          scope: oauth.scope,
          id_token: oauth.id_token,
          session_state: oauth.session_state,
        },
      });

      await prisma.user.update({
        where: { id: persistedUser.id },
        data: {
          googleAccountId: oauth.providerAccountId,
        },
      });

      return true;
    },

    async session({ session, user }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = user.id;

        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });

        (session.user as { id?: string; role?: string }).role =
          (dbUser?.role as string | undefined) ?? "TEACHER";
      }

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