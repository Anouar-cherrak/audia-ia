import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Force NextAuth à faire confiance au proxy Vercel pour les cookies HTTPS
  useSecureCookies: true,
  
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Force le retour strict sur la page d'accueil de production
      return "https://audia-ia.vercel.app";
    },
    async session({ session, token }) {
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };