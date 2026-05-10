import { useEffect, useState } from "react";
import type {
  CreatePricingServiceInput,
  PricingService,
} from "../domain/pricingService";
import { PricingServiceRepositoryImpl } from "../../../data/local/PricingServiceRepositoryImpl";
import { pricingStrings } from "../domain/strings";
import { useNetworkStatus } from "../../../shared/utils/network";

interface UsePricingFormOptions {
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export function usePricingForm(id?: string, options?: UsePricingFormOptions) {
  const [initialValues, setInitialValues] = useState<
    Partial<CreatePricingServiceInput>
  >({});
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "pending" | "synced" | "error" | undefined
  >(undefined);
  const repo = new PricingServiceRepositoryImpl();
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    repo
      .getById(id)
      .then((service) => {
        if (service) {
          setInitialValues({
            name: service.name,
            price: service.price,
            notes: service.notes || undefined,
          });
          setSyncStatus(service.syncStatus);
        }
      })
      .catch((e) => setError(e.message || pricingStrings.fetchError))
      .finally(() => setLoading(false));
  }, [id]);

  const onSubmit = async (data: CreatePricingServiceInput) => {
    setSubmitting(true);
    setError(null);
    try {
      let result: PricingService | undefined;
      if (id) {
        result = await repo.update(id, data);
      } else {
        result = await repo.create(data);
      }
      setSyncStatus(result?.syncStatus);
      options?.onSuccess?.();
    } catch (e: any) {
      setError(e.message || pricingStrings.saveError);
      options?.onError?.(e.message || pricingStrings.saveError);
    } finally {
      setSubmitting(false);
    }
  };

  // Si está offline, forzar syncStatus pending
  const effectiveSyncStatus = !isOnline ? "pending" : syncStatus;

  return {
    initialValues,
    loading,
    submitting,
    error,
    onSubmit,
    syncStatus: effectiveSyncStatus,
    isOffline: !isOnline,
  };
}
