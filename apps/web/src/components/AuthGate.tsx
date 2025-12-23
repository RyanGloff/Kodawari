import { useAuth } from "../hooks/useAuth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.loading) return null;
  if (!auth.session) return 
    <div className="AuthGate">
      <button onClick={auth.login}>Login</button>
    </div>

  return <>{children}</>;
}
