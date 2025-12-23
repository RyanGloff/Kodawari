import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  access_token: string | undefined;
  loading: boolean;
  login: () => any;
  logout: () => any;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

