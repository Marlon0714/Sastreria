import { useMemo, useState } from "react";
import type { FieldErrors, UseFormReset } from "react-hook-form";

import type { ClientsDependenciesOverrides } from "../domain/repository";
import {
  createClientSchema,
  type CreateClientSchemaInput,
  type CreateClientSchemaOutput,
} from "../domain/schemas";
import type { Client } from "../domain/types";
import { useClientRepository } from "./ClientsDependenciesProvider";

interface UseCreateClientResult {
  isSubmitting: boolean;
  error: string | null;
  createClient: (
    values: CreateClientSchemaInput,
    reset: UseFormReset<CreateClientSchemaInput>,
  ) => Promise<Client | null>;
  validate: (
    values: CreateClientSchemaInput,
  ) => FieldErrors<CreateClientSchemaInput>;
}

function mapValidationErrors(
  values: CreateClientSchemaInput,
): FieldErrors<CreateClientSchemaInput> {
  const parsed = createClientSchema.safeParse(values);

  if (parsed.success) {
    return {};
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;

  return {
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

type UseCreateClientDependencies = Pick<
  ClientsDependenciesOverrides,
  "clientRepository"
>;

export function useCreateClient(
  dependencies: UseCreateClientDependencies = {},
): UseCreateClientResult {
  const defaultClientRepository = useClientRepository();
  const clientRepository = useMemo(
    () => dependencies.clientRepository ?? defaultClientRepository,
    [defaultClientRepository, dependencies.clientRepository],
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createClient = async (
    values: CreateClientSchemaInput,
    reset: UseFormReset<CreateClientSchemaInput>,
  ): Promise<Client | null> => {
    setError(null);
    setIsSubmitting(true);

    try {
      const parsed: CreateClientSchemaOutput = createClientSchema.parse(values);
      const phones = [values.phone2, values.phone3].filter((p): p is string =>
        Boolean(p?.trim()),
      );
      const payload = {
        ...parsed,
        phones: phones.length > 0 ? phones : undefined,
      };
      const createdClient = await clientRepository.create(payload);
      reset({
        firstName: "",
        lastName: "",
        phone: "",
        phone2: "",
        phone3: "",
        cedula: "",
        notes: "",
      });
      return createdClient;
    } catch {
      setError("No se pudo crear el cliente. Intenta nuevamente.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    error,
    createClient,
    validate: mapValidationErrors,
  };
}
