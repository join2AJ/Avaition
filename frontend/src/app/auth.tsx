import { createContext, useContext, useState, type ReactNode } from "react";
import type { Role } from "@/domain/types";

export interface Session {
  role: Role;
  name: string;
  entityId?: string; // set for entity / individual sessions (query scoping)
}

const AuthCtx = createContext<{
  session: Session | null;
  signIn: (s: Session) => void;
  signOut: () => void;
}>({ session: null, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = sessionStorage.getItem("aep-session");
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const signIn = (s: Session) => {
    setSession(s);
    sessionStorage.setItem("aep-session", JSON.stringify(s));
  };
  const signOut = () => {
    setSession(null);
    sessionStorage.removeItem("aep-session");
  };
  return <AuthCtx.Provider value={{ session, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
