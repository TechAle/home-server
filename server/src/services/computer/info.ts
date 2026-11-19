/**
 * Host information (`/get_computer_info`): OS, CPU model, hostname and IPs.
 */
import os from "node:os";
import { firstExternalIpv4, UNAVAILABLE } from "./platform.js";

export interface ComputerInfo {
  system: string;
  node_name: string;
  release: string;
  version: string;
  machine: string;
  processor: string;
  hostname: string;
  ip_address: string;
  external_ip: string | number;
}

async function externalIp(): Promise<string | number> {
  try {
    const response = await fetch("https://api.ipify.org");
    if (!response.ok) return UNAVAILABLE;
    return (await response.text()).trim();
  } catch {
    return UNAVAILABLE;
  }
}

export async function computerInfo(): Promise<ComputerInfo> {
  return {
    system: os.type(),
    node_name: os.hostname(),
    release: os.release(),
    version: os.version(),
    machine: os.machine(),
    processor: os.cpus()[0]?.model ?? "",
    hostname: os.hostname(),
    ip_address: firstExternalIpv4(),
    external_ip: await externalIp(),
  };
}
