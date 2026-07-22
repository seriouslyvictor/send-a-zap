import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import {
  readOperatorCredentialConfig,
  verifyOperatorCredentials,
} from "@/lib/auth-credentials";
import { LOGIN_PATH } from "@/lib/auth-routing";

/**
 * Auth.js v5 configuration for the single-Operator demo gate.
 *
 * One Credentials provider checks a submitted username/password against the
 * shared credentials held in server-side environment variables. There are no
 * user accounts and no database — sessions are stateless JWTs.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: LOGIN_PATH,
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize(credentials) {
        const config = readOperatorCredentialConfig();
        if (!verifyOperatorCredentials(credentials, config)) {
          return null;
        }
        return { id: "operator", name: "Operator" };
      },
    }),
  ],
});
