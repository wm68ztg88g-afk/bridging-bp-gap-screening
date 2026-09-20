import { createContext, useContext, useState, type ReactNode } from "react";

interface VolunteerSession {
  id: number;
  name: string;
  code: string;
}

interface StoreValue {
  volunteer: VolunteerSession | null;
  setVolunteer: (v: VolunteerSession | null) => void;
  adminPassword: string | null;
  setAdminPassword: (p: string | null) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [volunteer, setVolunteer] = useState<VolunteerSession | null>(null);
  const [adminPassword, setAdminPassword] = useState<string | null>(null);

  return (
    <StoreContext.Provider value={{ volunteer, setVolunteer, adminPassword, setAdminPassword }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
