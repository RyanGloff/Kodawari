import { AuthContext } from "../context/AuthContext";
import { useApiAuth } from "../hooks/useApiAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useApiAuth(); // <-- called ONCE

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
}

