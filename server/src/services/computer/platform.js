/**
 * Constants and tiny process helpers shared by the computer modules.
 */
import os from "node:os";

/** Sentinel used by the Python project when a metric is unavailable (-591). */
export const UNAVAILABLE = -591;

export const isMac = os.platform() === "darwin";
export const isLinux = os.platform() === "linux";

export function round(value) {
  return Math.round(value * 100) / 100;
}

export function firstExternalIpv4() {
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) return iface.address;
    }
  }
  return "127.0.0.1";
}
