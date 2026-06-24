import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@auth/supabase-adapter"; // 👈 1. AJOUTE CET IMPORT

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // 👈 2. AJOUTE CE BLOC ADAPTER ICI
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!, // Nécessite ta clé secrète de service
  }),
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: true,
  
  callbacks: {
    async redirect({ url, baseUrl }) {
      return "https://audia-ia.vercel.app";
    },
    // 👈 3. MODIFIE LA SESSION POUR RÉCUPÉRER L'ID DE L'UTILISATEUR
    async session({ session, user }) {
      if (session.user && user) {
        // @ts-ignore
        session.user.id = user.id;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };