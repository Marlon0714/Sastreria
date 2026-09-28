import { useCallback, useState } from "react";

import { computeSubnetHosts } from "../domain/subnetRange";
import { usePrintingDependencies } from "./PrintingDependenciesProvider";

/** Puerto AppSocket/JetDirect, el mismo que usa `TcpLabelPrinterRepositoryImpl`. */
const DISCOVERY_PORT = 9100;

/**
 * Timeout corto por host (ver límites explícitos del plan): con ~254 hosts
 * de una `/24` y concurrencia limitada, un escaneo completo toma unos pocos
 * segundos en vez de minutos.
 */
const PROBE_TIMEOUT_MS = 500;

const NO_NETWORK_INFO_MESSAGE =
  "No se detectó una red WiFi local. Conéctate a la red del taller e intenta de nuevo.";

const UNSUPPORTED_SUBNET_MESSAGE =
  "La red es demasiado grande para buscar automáticamente. Agrega la IP de la impresora manualmente.";

const SCAN_FAILED_MESSAGE = "Ocurrió un error al buscar impresoras en la red.";

interface UsePrinterDiscoveryResult {
  isScanning: boolean;
  results: string[];
  error: string | null;
  scan: () => Promise<void>;
}

/**
 * Orquesta el descubrimiento de impresoras en la red local para
 * `PrinterSettingsScreen`: obtiene IP/máscara del dispositivo →
 * calcula el rango de hosts de la subred → prueba el puerto 9100 en cada uno.
 * Cada paso reutiliza una pieza ya testeada por separado (`computeSubnetHosts`)
 * o inyectada vía `PrintingDependencies` (`getLocalNetworkInfo`,
 * `printerDiscoveryRepository`), por lo que este hook se testea con ambas
 * mockeadas, sin red real.
 *
 * A propósito no crea impresoras ni toca `printerSettingsStore`: solo expone
 * `results` para que la pantalla precargue el formulario existente.
 */
export function usePrinterDiscovery(): UsePrinterDiscoveryResult {
  const { getLocalNetworkInfo, printerDiscoveryRepository } = usePrintingDependencies();
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (): Promise<void> => {
    setIsScanning(true);
    setError(null);
    setResults([]);

    try {
      const networkInfo = await getLocalNetworkInfo();
      if (!networkInfo) {
        setError(NO_NETWORK_INFO_MESSAGE);
        return;
      }

      const hosts = computeSubnetHosts(networkInfo.ipAddress, networkInfo.subnetMask);
      if (!hosts) {
        setError(UNSUPPORTED_SUBNET_MESSAGE);
        return;
      }

      const found = await printerDiscoveryRepository.scanPort(
        hosts,
        DISCOVERY_PORT,
        PROBE_TIMEOUT_MS,
      );
      setResults(found);
    } catch (scanError) {
      console.error(
        JSON.stringify({
          level: "error",
          service: "usePrinterDiscovery",
          message: "Fallo al escanear la red en busca de impresoras",
          error: scanError instanceof Error ? scanError.message : String(scanError),
        }),
      );
      setError(SCAN_FAILED_MESSAGE);
    } finally {
      setIsScanning(false);
    }
  }, [getLocalNetworkInfo, printerDiscoveryRepository]);

  return { isScanning, results, error, scan };
}
