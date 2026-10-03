import { useEffect, useRef, useState } from "react";

import { useIdentityStore } from "../../../shared/state/identityStore";
import {
  PrinterSettingsValidationError,
  usePrinterSettingsStore,
} from "../../../shared/state/printerSettingsStore";
import {
  useIdentityGate,
  type ResolvedIdentity,
} from "../../auth/hooks/useIdentityGate";
import {
  PrinterConfigValidationError,
  recoveryHostSchema,
  type CreatePrinterConfigInput,
} from "../domain/printerConfig";
import type { CapturedLabelBitmap, PrinterTarget } from "../domain/types";
import { usePrintArregloLabel } from "./usePrintArregloLabel";

interface RecoveryConfirmation {
  printer: PrinterTarget;
  newHost: string;
  actorId: string;
  sessionId: string;
}

export function usePrinterManagement(
  capture: () => Promise<CapturedLabelBitmap>,
) {
  const identityGate = useIdentityGate();
  const ownProfile = useIdentityStore((state) => state.ownProfile);
  const resolvedActor = useIdentityStore((state) => state.resolvedActor);
  const printers = usePrinterSettingsStore((state) => state.printers);
  const defaultPrinterId = usePrinterSettingsStore(
    (state) => state.defaultPrinterId,
  );
  const loadError = usePrinterSettingsStore((state) => state.loadError);
  const { printLabel } = usePrintArregloLabel();
  const busy = useRef(false);
  const mounted = useRef(true);
  const ownerVerification = useRef<{
    sessionId: string;
    resolve: (identity: ResolvedIdentity | null) => void;
  } | null>(null);
  const [isOwnerVerificationVisible, setIsOwnerVerificationVisible] =
    useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    printerId: string;
    status: "sent" | "error";
  } | null>(null);
  const [pendingRecovery, setPendingRecovery] =
    useState<RecoveryConfirmation | null>(null);
  const actor = ownProfile?.isSharedDevice ? resolvedActor : ownProfile;
  const canManage = actor?.role === "owner";

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      ownerVerification.current?.resolve(null);
      ownerVerification.current = null;
      if (
        ownProfile?.isSharedDevice &&
        useIdentityStore.getState().ownProfile?.id === ownProfile.id
      ) {
        useIdentityStore.getState().clearResolvedActor();
      }
    };
  }, [ownProfile?.id, ownProfile?.isSharedDevice]);

  const execute = async (
    ownerOnly: boolean,
    operation: (identity: ResolvedIdentity) => Promise<void>,
    keepIdentity = false,
  ): Promise<boolean> => {
    if (busy.current || !mounted.current) return false;
    busy.current = true;
    setIsBusy(true);
    setError(null);
    const sessionId = useIdentityStore.getState().ownProfile?.id;
    let succeeded = false;
    try {
      const currentIdentity = useIdentityStore.getState();
      const needsOwnerPassword =
        ownerOnly &&
        currentIdentity.ownProfile?.isSharedDevice &&
        currentIdentity.ownProfile.role === "owner" &&
        currentIdentity.resolvedActor?.role !== "owner";
      const identity = needsOwnerPassword
        ? await new Promise<ResolvedIdentity | null>((resolve) => {
            ownerVerification.current = {
              sessionId: currentIdentity.ownProfile!.id,
              resolve,
            };
            setIsOwnerVerificationVisible(true);
          })
        : await identityGate.requireIdentity();
      if (!identity) return false;
      if (
        !mounted.current ||
        sessionId !== useIdentityStore.getState().ownProfile?.id
      ) {
        throw new PrinterSettingsValidationError(
          "La sesión cambió. Intenta de nuevo.",
        );
      }
      if (
        ownerOnly &&
        (!identity.verified || identity.profile.role !== "owner")
      ) {
        throw new PrinterSettingsValidationError(
          "Solo el dueño verificado puede administrar impresoras.",
        );
      }
      await operation(identity);
      succeeded = true;
      return true;
    } catch (failure) {
      const expected =
        failure instanceof PrinterSettingsValidationError ||
        failure instanceof PrinterConfigValidationError;
      setError(
        expected
          ? failure.message
          : "No se pudo completar la operación. Verifica la conexión e intenta de nuevo.",
      );
      console.error(
        JSON.stringify({
          level: "error",
          service: "printerManagement",
          timestamp: new Date().toISOString(),
          message: "Operación de impresora rechazada o fallida",
        }),
      );
      return false;
    } finally {
      if (!keepIdentity || !succeeded) identityGate.releaseIdentity();
      busy.current = false;
      setIsBusy(false);
    }
  };

  const savePrinter = (
    input: CreatePrinterConfigInput,
    id?: string,
  ): Promise<boolean> =>
    execute(true, async () => {
      const store = usePrinterSettingsStore.getState();
      if (id) await store.updatePrinter(id, input);
      else await store.addPrinter(input);
      setPendingRecovery(null);
      setTestResult(null);
    });

  const sendTest = (printer: PrinterTarget): Promise<boolean> =>
    execute(false, async () => {
      setPendingRecovery(null);
      setTestResult(null);
      try {
        await printLabel({ capture, target: printer });
        setTestResult({ printerId: printer.id, status: "sent" });
      } catch (failure) {
        setTestResult({ printerId: printer.id, status: "error" });
        throw failure;
      }
    });

  const testConnection = (
    printer: PrinterTarget,
    host: string,
  ): Promise<boolean> =>
    execute(false, async (identity) => {
      setPendingRecovery(null);
      const parsedHost = recoveryHostSchema.safeParse(host.trim());
      if (!parsedHost.success)
        throw new PrinterSettingsValidationError(
          parsedHost.error.issues[0]?.message ?? "Dirección inválida.",
        );
      await printLabel({
        capture,
        target: { ...printer, host: parsedHost.data },
      });
      setPendingRecovery({
        printer: { ...printer },
        newHost: parsedHost.data,
        actorId: identity.profile.id,
        sessionId: useIdentityStore.getState().ownProfile?.id ?? "",
      });
    });

  const confirmConnection = (): Promise<boolean> =>
    execute(false, async (identity) => {
      const recovery = pendingRecovery;
      const current = usePrinterSettingsStore
        .getState()
        .printers.find((printer) => printer.id === recovery?.printer.id);
      if (
        !recovery ||
        recovery.actorId !== identity.profile.id ||
        recovery.sessionId !== useIdentityStore.getState().ownProfile?.id ||
        JSON.stringify(current) !== JSON.stringify(recovery.printer)
      ) {
        setPendingRecovery(null);
        throw new PrinterSettingsValidationError(
          "La prueba ya no es válida. Envía una nueva prueba.",
        );
      }
      await usePrinterSettingsStore
        .getState()
        .updateConnection(recovery.printer.id, recovery.newHost);
      setPendingRecovery(null);
      setTestResult(null);
    });

  return {
    printers,
    defaultPrinterId,
    canManage,
    canAuthorizeOwner:
      ownProfile?.isSharedDevice === true && ownProfile.role === "owner",
    isBusy,
    error: error ?? loadError,
    testResult,
    pendingRecovery,
    identityGate,
    isOwnerVerificationVisible,
    completeOwnerVerification: () => {
      const pending = ownerVerification.current;
      const current = useIdentityStore.getState().ownProfile;
      ownerVerification.current = null;
      setIsOwnerVerificationVisible(false);
      if (!pending) return;
      if (
        !mounted.current ||
        !current ||
        current.id !== pending.sessionId ||
        current.role !== "owner" ||
        !current.isSharedDevice
      ) {
        pending.resolve(null);
        return;
      }
      const verifiedOwner = { ...current, isSharedDevice: false };
      useIdentityStore.getState().setResolvedActor(verifiedOwner);
      pending.resolve({ profile: verifiedOwner, verified: true });
    },
    cancelOwnerVerification: () => {
      ownerVerification.current?.resolve(null);
      ownerVerification.current = null;
      setIsOwnerVerificationVisible(false);
    },
    authorizeAdministration: () => execute(true, async () => {}, true),
    cancelAdministration: () => identityGate.releaseIdentity(),
    clearError: () => setError(null),
    cancelRecovery: () => {
      setPendingRecovery(null);
      setError(null);
    },
    savePrinter,
    sendTest,
    testConnection,
    confirmConnection,
    setDefaultPrinter: (id: string) =>
      execute(false, () =>
        usePrinterSettingsStore.getState().setDefaultPrinter(id),
      ),
    removePrinter: (id: string) =>
      execute(true, async () => {
        await usePrinterSettingsStore.getState().removePrinter(id);
        setPendingRecovery(null);
        setTestResult(null);
      }),
  };
}
