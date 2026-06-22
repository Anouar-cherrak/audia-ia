import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  
  // 🔒 FORCE NEXTAUTH À ACCEPTER TON DOMAINE EN PRODUCTION
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: '.vercel.app'
      }
    }
  },
  
  // 🔒 COUPE LA BOUCLE ET TYPE LES PARAMÈTRES POUR TYPESCRIPT
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return "https://audia-ia.vercel.app";
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };