import { useMemo, useState } from "react";
import type { FieldErrors } from "react-hook-form";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import {
  updateClientSchema,
  type UpdateClientSchemaInput,
  type UpdateClientSchemaOutput,
} from "../domain/schemas";
import type { Client } from "../domain/types";
import { useClientRepository } from "./ClientsDependenciesProvider";

interface UseUpdateClientResult {
  isSubmitting: boolean;
  error: string | null;
  updateClient: (values: UpdateClientSchemaInput) => Promise<Client | null>;
  validate: (
    values: UpdateClientSchemaInput,
  ) => FieldErrors<UpdateClientSchemaInput>;
}

function mapValidationErrors(
  values: UpdateClientSchemaInput,
): FieldErrors<UpdateClientSchemaInput> {
  const parsed = updateClientSchema.safeParse(values);

  if (parsed.success) {
    return {};
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;

  return {
    id: fieldErrors.id?.[0]
      ? { type: "zod", message: fieldErrors.id[0] }
      : undefined,
    firstName: fieldErrors.firstName?.[0]
      ? { type: "zod", message: fieldErrors.firstName[0] }
      : undefined,
    lastName: fieldErrors.lastName?.[0]
      ? { type: "zod", message: fieldErrors.lastName[0] }
      : undefined,
    phone: fieldErrors.phone?.[0]
      ? { type: "zod", message: fieldErrors.phone[0] }
      : undefined,
    phone2: fieldErrors.phone2?.[0]
      ? { type: "zod", message: fieldErrors.phone2[0] }
      : undefined,
    phone3: fieldErrors.phone3?.[0]
      ? { type: "zod", message: fieldErrors.phone3[0] }
      : undefined,
    cedula: fieldErrors.cedula?.[0]
      ? { type: "zod", message: fieldErrors.cedula[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
}

type UseUpdateClientDependencies = Pick<
  ClientsDependenciesOverrides,
  "clientRepository"
>;

export function useUpdateClient(
  dependencies: UseUpdateClientDependencies = {},
): UseUpdateClientResult {
  const defaultClientRepository = useClientRepository();
  const clientRepository = useMemo(
    () => dependencies.clientRepository ?? defaultClientRepository,
    [defaultClientRepository, dependencies.clientRepository],
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const updateClient = async (
    values: UpdateClientSchemaInput,
  ): Promise<Client | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const parsed: UpdateClientSchemaOutput = updateClientSchema.parse(values);
      const phones = [values.phone2, values.phone3].filter((p): p is string =>
        Boolean(p?.trim()),
      );
      const payload = {
        ...parsed,
        phones: phones.length > 0 ? phones : undefined,
      };
      return await clientRepository.update(payload);
    } catch {
      setError("No se pudo actualizar el cliente. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    updateClient,
    validate: mapValidationErrors,
  };
}
