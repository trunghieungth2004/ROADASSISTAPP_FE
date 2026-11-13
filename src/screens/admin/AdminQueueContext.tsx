import { createContext, useContext } from "react";

type AdminQueueState = {
  counts: Record<string, number>;
  refresh: () => void;
};

const AdminQueueContext = createContext<AdminQueueState>({
  counts: {},
  refresh: () => undefined,
});

export function useAdminQueue(): AdminQueueState {
  return useContext(AdminQueueContext);
}

export default AdminQueueContext;
