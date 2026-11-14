import { useCallback, useEffect, useState } from "react";
import { toMessage } from "../../api/client";
import { fetchMyProviders, type Provider } from "../../api/providers";
import { useAuth } from "../../context/AuthContext";

export default function useMyShops() {
  const { token } = useAuth();
  const [shops, setShops] = useState<Provider[]>([]);
  const [shopId, setShopId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setShops([]);
      setShopId("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchMyProviders(token);
      const activeShops = rows.filter((row) =>
        row.kind === "SHOP" &&
        row.status === "ACTIVE" &&
        row.suspended !== true);
      setShops(activeShops);
      setShopId((current) =>
        activeShops.some((row) => row.id === current) ?
          current :
          activeShops[0]?.id ?? "");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { token, shops, shopId, setShopId, loading, error, reload };
}
