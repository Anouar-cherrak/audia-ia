import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 🔒 FORCE GOOGLE À TOUJOURS ENVOYER VERS TON URL FIXE
      authorization: {
        params: {
          redirect_uri: "https://audia-ia.vercel.app/api/auth/callback/google"
        }
      }
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  // 🔒 FORCE NEXTAUTH À RECONNAÎTRE UNIQUEMENT TON ADRESSE DE PROD
  useSecureCookies: true,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };