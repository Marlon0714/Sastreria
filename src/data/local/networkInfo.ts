import type { LocalNetworkInfo } from "../../features/printing/domain/repository";

/**
 * Subconjunto de `NetInfoState` que necesitamos: solo los tipos de conexión
 * (`wifi`/`ethernet`) exponen `ipAddress`/`subnet` en sus `details`
 * (ver `@react-native-community/netinfo`, `NetInfoWifiState`/
 * `NetInfoEthernetState`). El resto (`cellular`, `none`, etc.) no trae esos
 * campos, por eso se filtran antes de leerlos.
 */
interface NetInfoStateWithNetworkDetails {
  type: string;
  details: { ipAddress?: string | null; subnet?: string | null } | null;
}

const NETWORK_TYPES_WITH_LOCAL_SUBNET = new Set(["wifi", "ethernet"]);

/**
 * Obtiene la IP local y la máscara de subred del dispositivo, usadas para
 * calcular el rango de hosts a escanear en busca de impresoras (ver
 * `subnetRange.ts` / `usePrinterDiscovery.ts`). `require()` perezoso, mismo
 * patrón que `SyncConnectivityController.ts`, para no tirar del módulo nativo
 * de NetInfo en tests unitarios.
 *
 * Retorna `null` cuando no aplica (no es WiFi/Ethernet, o el sistema
 * operativo no reportó `ipAddress`/`subnet`) — el hook que la consume trata
 * ese caso como "agrega la IP de la impresora a mano".
 *
 * Sin test unitario a propósito (regla del plan): es I/O real de red/SO.
 */
export async function getLocalNetworkInfo(): Promise<LocalNetworkInfo> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load, ver comentario del archivo.
    const netInfoModule = require("@react-native-community/netinfo") as {
      fetch: () => Promise<NetInfoStateWithNetworkDetails>;
    };

    const state = await netInfoModule.fetch();

    if (!NETWORK_TYPES_WITH_LOCAL_SUBNET.has(state.type)) {
      return null;
    }

    const ipAddress = state.details?.ipAddress;
    const subnetMask = state.details?.subnet;

    if (!ipAddress || !subnetMask) {
      return null;
    }

    return { ipAddress, subnetMask };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        service: "networkInfo",
        message: "No se pudo obtener la información de red local",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return null;
  }
}
