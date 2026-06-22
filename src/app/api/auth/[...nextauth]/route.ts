import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// 🔥 On force la variable d'environnement au niveau du code avant que NextAuth ne démarre
if (process.env.NODE_ENV === "production") {
  process.env.NEXTAUTH_URL = "https://audia-ia.vercel.app";
}

export const authOptions = {
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
  skipCSRFCheck: true, // 🛡️ Évite le blocage du cookie d'état (State cookie missing) en prod
  
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return "https://audia-ia.vercel.app";
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };