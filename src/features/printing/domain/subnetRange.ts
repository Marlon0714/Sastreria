/**
 * Convierte una IPv4 en su representación entera sin signo de 32 bits.
 * Retorna `null` si el string no tiene exactamente 4 octetos numéricos en
 * el rango 0-255 (evita aceptar IPv6, hostnames o basura).
 */
function ipv4ToUint32(value: string): number | null {
  const parts = value.trim().split(".");
  if (parts.length !== 4) {
    return null;
  }

  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }

    const octet = Number(part);
    if (octet < 0 || octet > 255) {
      return null;
    }

    result = (result << 8) | octet;
  }

  return result >>> 0;
}

function uint32ToIpv4(value: number): string {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(
    ".",
  );
}

export interface ComputeSubnetHostsOptions {
  maxHosts?: number;
}

/**
 * Tamaño de una subred `/24` típica (254 hosts utilizables): el límite por
 * defecto para mantener acotado el costo de un escaneo (ver plan de
 * descubrimiento de impresoras — nunca se escanean redes `/16` o más
 * grandes salvo que se pida explícitamente con `options.maxHosts`).
 */
const DEFAULT_MAX_HOSTS = 254;

/**
 * Calcula la lista de IPs de host (dirección de red y broadcast excluidas)
 * de la subred que contiene `ipAddress` con máscara `subnetMask`. Es la
 * función de dominio pura que genera los candidatos a probar en el puerto
 * 9100 (ver `usePrinterDiscovery.ts` / `TcpPrinterDiscoveryRepositoryImpl`).
 *
 * Retorna `null` (en vez de lanzar) en dos casos, ambos tratados igual por
 * el hook que lo consume ("red no soportada, agrega la IP a mano"):
 * - `ipAddress`/`subnetMask` no son IPv4 válidas.
 * - el rango de hosts resultante es 0 (máscaras degeneradas tipo /31, /32)
 *   o excede `options.maxHosts` (default 254) — evita escanear miles de
 *   hosts en redes con máscaras más amplias que una `/24`.
 */
export function computeSubnetHosts(
  ipAddress: string,
  subnetMask: string,
  options: ComputeSubnetHostsOptions = {},
): string[] | null {
  const maxHosts = options.maxHosts ?? DEFAULT_MAX_HOSTS;

  const ipInt = ipv4ToUint32(ipAddress);
  const maskInt = ipv4ToUint32(subnetMask);

  if (ipInt === null || maskInt === null) {
    return null;
  }

  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
  const hostCount = broadcastInt - networkInt - 1;

  if (hostCount <= 0 || hostCount > maxHosts) {
    return null;
  }

  const hosts: string[] = [];
  for (let host = networkInt + 1; host < broadcastInt; host += 1) {
    hosts.push(uint32ToIpv4(host));
  }

  return hosts;
}
