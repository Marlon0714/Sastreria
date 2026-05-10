import { useEffect, useState } from "react";
import type { PricingService } from "../domain/pricingService";
import { PricingServiceRepositoryImpl } from "../../../data/local/PricingServiceRepositoryImpl";
import { pricingStrings } from "../domain/strings";

export function usePricingDetail(id: string) {
  const [service, setService] = useState<PricingService | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "pending" | "synced" | "error" | undefined
  >(undefined);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    new PricingServiceRepositoryImpl()
      .getById(id)
      .then((s) => {
        if (mounted) {
          setService(s);
          setSyncStatus(s?.syncStatus);
        }
      })
      .catch((e) => {
        if (mounted) setError(e.message || pricingStrings.fetchError);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return { service, loading, error, syncStatus };
}
