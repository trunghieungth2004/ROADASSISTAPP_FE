import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import AdminBillDialog from "./AdminBillDialog";

type AdminBillState = {
  openBill: (ticketId: string) => void;
};

const AdminBillContext = createContext<AdminBillState | null>(null);

export function useAdminBill(): AdminBillState {
  const value = useContext(AdminBillContext);
  if (!value) throw new Error("AdminBillProvider missing");
  return value;
}

export default function AdminBillProvider({
  token,
  children,
}: {
  token: string | null;
  children: ReactNode;
}) {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const openBill = useCallback((next: string) => setTicketId(next), []);
  return (
    <AdminBillContext.Provider value={{ openBill }}>
      {children}
      <AdminBillDialog token={token} ticketId={ticketId} onClose={() => setTicketId(null)} />
    </AdminBillContext.Provider>
  );
}
