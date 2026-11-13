import { createContext, useContext } from "react";

export type AdminToastInput = {
  title: string;
  body?: string;
  route?: string;
};

type AdminToastContextValue = {
  showToast: (toast: AdminToastInput) => void;
};

const AdminToastContext = createContext<AdminToastContextValue>({
  showToast: () => undefined,
});

export function useAdminToast(): AdminToastContextValue {
  return useContext(AdminToastContext);
}

export default AdminToastContext;
