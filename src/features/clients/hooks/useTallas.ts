import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";

import {
  createTallaSchema,
  updateTallaSchema,
  type CreateTallaSchemaInput,
  type UpdateTallaSchemaInput,
} from "../domain/schemas";
import type { ClientTalla } from "../domain/types";
import { useTallaRepository } from "./ClientsDependenciesProvider";

type TallaFieldErrors = FieldErrors<
  Pick<CreateTallaSchemaInput, "type" | "value" | "notes">
>;

/**
 * Valida los campos editables del formulario de talla (tipo/valor/notas) sin
 * depender de `clientId` (no forma parte del formulario, ya llega desde la
 * ruta) — reutiliza el mismo schema que `upsertTalla` usa internamente para
 * la coerción, evitando así que la única señal de error visible sea el
 * banner genérico de `error`.
 */
function mapValidationErrors(
  input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
): TallaFieldErrors {
  const schema = "id" in input ? updateTallaSchema : createTallaSchema;
  const parsed = schema.safeParse(input);

  if (parsed.success) {
    return {};
  }

  const fieldErrors = parsed.error.flatten().fieldErrors;

  return {
    type: fieldErrors.type?.[0]
      ? { type: "zod", message: fieldErrors.type[0] }
      : undefined,
    value: fieldErrors.value?.[0]
      ? { type: "zod", message: fieldErrors.value[0] }
      : undefined,
    notes: fieldErrors.notes?.[0]
      ? { type: "zod", message: fieldErrors.notes[0] }
      : undefined,
  };
}

export function useTallas(clientId: string): {
  tallas: ClientTalla[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  upsertTalla: (
    input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
  ) => Promise<ClientTalla | null>;
  validate: (
    input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
  ) => TallaFieldErrors;
  deleteTalla: (id: string) => Promise<boolean>;
  reload: () => Promise<void>;
} {
  const repo = useTallaRepository();
  const [tallas, setTallas] = useState<ClientTalla[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await repo.findByClientId(clientId);
      setTallas(data);
    } catch (err) {
      setError("Error al cargar las tallas.");
      // TODO: replace with Crashlytics when telemetry is integrated
      console.error(
        JSON.stringify({
          level: "error",
          service: "useTallas",
          message: "reload failed",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [repo, clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Lock síncrono (no depende de que React re-renderice) para que un doble
  // tap en "Guardar" no dispare dos upserts en paralelo — ver
  // TallaRepositoryImpl.upsert() para por qué eso podía huerfanar una fila
  // ya sincronizada en Supabase.
  const isSubmittingRef = useRef(false);

  const upsertTalla = useCallback(
    async (
      input: CreateTallaSchemaInput | UpdateTallaSchemaInput,
    ): Promise<ClientTalla | null> => {
      if (isSubmittingRef.current) {
        return null;
      }
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        let talla: ClientTalla;
        if ("id" in input) {
          const result = updateTallaSchema.safeParse(input);
          if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Datos inválidos.");
            return null;
          }
          talla = await repo.upsert(result.data);
        } else {
          const result = createTallaSchema.safeParse(input);
          if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Datos inválidos.");
            return null;
          }
          talla = await repo.upsert(result.data);
        }
        await reload();
        return talla;
      } catch (err) {
        setError("Error al guardar la talla.");
        // TODO: replace with Crashlytics when telemetry is integrated
        console.error(
          JSON.stringify({
            level: "error",
            service: "useTallas",
            message: "upsertTalla failed",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        return null;
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [repo, reload],
  );

  const deleteTalla = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        await repo.delete(id);
        await reload();
        return true;
      } catch (err) {
        setError("Error al eliminar la talla.");
        // TODO: replace with Crashlytics when telemetry is integrated
        console.error(
          JSON.stringify({
            level: "error",
            service: "useTallas",
            message: "deleteTalla failed",
            error: err instanceof Error ? err.message : String(err),
          }),
        );
        return false;
      }
    },
    [repo, reload],
  );

  return {
    tallas,
    isLoading,
    isSubmitting,
    error,
    upsertTalla,
    validate: mapValidationErrors,
    deleteTalla,
    reload,
  };
}
