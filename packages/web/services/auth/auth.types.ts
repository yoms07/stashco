/**
 * Auth types — aligned with better-auth's session model.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}

export interface SignInInput {
  email: string;
  password: string;
  callbackURL?: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  callbackURL?: string;
}
