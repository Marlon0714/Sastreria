import { useCallback, useEffect, useState } from "react";
import type {
  PricingService,
  CreatePricingServiceInput,
} from "../domain/pricingService";
import { PricingServiceRepositoryImpl } from "../../../data/local/PricingServiceRepositoryImpl";
import { pricingStrings } from "../domain/strings";
import { useNetworkStatus } from "../../../shared/utils/network";

const repo = new PricingServiceRepositoryImpl();

export function usePricingServices() {
  const [services, setServices] = useState<PricingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useNetworkStatus();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await repo.getAll();
      setServices(all);
    } catch (e: any) {
      setError(e.message || pricingStrings.fetchError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreatePricingServiceInput) => {
      await repo.create(input);
      await refresh();
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, input: Partial<CreatePricingServiceInput>) => {
      await repo.update(id, input);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await repo.delete(id);
      await refresh();
    },
    [refresh],
  );

  // Exponer syncStatus global y estado offline
  const syncStatus = services.some((s) => s.syncStatus !== "synced")
    ? "pending"
    : "synced";

  return {
    services,
    loading,
    error,
    refresh,
    create,
    update,
    remove,
    syncStatus,
    isOffline: !isOnline,
  };
}
