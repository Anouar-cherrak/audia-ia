import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

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
  
  // On laisse NextAuth gérer les cookies par défaut, mais on verrouille la redirection
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      return "https://audia-ia.vercel.app";
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };