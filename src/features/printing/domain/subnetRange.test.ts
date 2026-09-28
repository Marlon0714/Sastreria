import { describe, expect, it } from "@jest/globals";

import { computeSubnetHosts } from "./subnetRange";

describe("computeSubnetHosts", () => {
  it("calcula los 254 hosts de una subred /24 típica, excluyendo red y broadcast (caso feliz)", () => {
    const hosts = computeSubnetHosts("192.168.1.34", "255.255.255.0");

    expect(hosts).not.toBeNull();
    expect(hosts).toHaveLength(254);
    expect(hosts?.[0]).toBe("192.168.1.1");
    expect(hosts?.[hosts.length - 1]).toBe("192.168.1.254");
    expect(hosts).not.toContain("192.168.1.0");
    expect(hosts).not.toContain("192.168.1.255");
  });

  it("retorna null cuando el rango excede maxHosts (red /16, 65534 hosts)", () => {
    const hosts = computeSubnetHosts("10.0.5.20", "255.255.0.0");

    expect(hosts).toBeNull();
  });

  it("respeta un maxHosts mayor pasado explícitamente por options", () => {
    const hosts = computeSubnetHosts("10.0.5.20", "255.255.0.0", { maxHosts: 70000 });

    expect(hosts).not.toBeNull();
    expect(hosts).toHaveLength(65534);
  });

  it("retorna null si la IP no es una IPv4 válida", () => {
    expect(computeSubnetHosts("no-es-una-ip", "255.255.255.0")).toBeNull();
    expect(computeSubnetHosts("192.168.1.999", "255.255.255.0")).toBeNull();
  });

  it("retorna null si la máscara no es una IPv4 válida", () => {
    expect(computeSubnetHosts("192.168.1.34", "no-es-una-mascara")).toBeNull();
    expect(computeSubnetHosts("192.168.1.34", "")).toBeNull();
  });

  it("retorna null para máscaras degeneradas que no dejan hosts utilizables (/31)", () => {
    expect(computeSubnetHosts("192.168.1.1", "255.255.255.254")).toBeNull();
  });
});
