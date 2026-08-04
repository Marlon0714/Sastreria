import { createContext, useContext, type ReactNode } from "react";

interface AuthActions {
  signOut: () => Promise<void>;
}

const AuthActionsContext = createContext<AuthActions | null>(null);

interface AuthActionsProviderProps {
  signOut: () => Promise<void>;
  children: ReactNode;
}

export function AuthActionsProvider({
  signOut,
  children,
}: AuthActionsProviderProps) {
  return (
    <AuthActionsContext.Provider value={{ signOut }}>
      {children}
    </AuthActionsContext.Provider>
  );
}

export function useAuthActions(): AuthActions {
  const context = useContext(AuthActionsContext);
  if (!context) {
    throw new Error(
      "useAuthActions debe usarse dentro de un AuthActionsProvider",
    );
  }
  return context;
}
