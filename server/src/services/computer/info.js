/**
 * Host information (`/get_computer_info`): OS, CPU model, hostname and IPs.
 */
import os from "node:os";
import { UNAVAILABLE, firstExternalIpv4 } from "./platform.js";

async function externalIp() {
  try {
    const response = await fetch("https://api.ipify.org");
    if (!response.ok) return UNAVAILABLE;
    return (await response.text()).trim();
  } catch {
    return UNAVAILABLE;
  }
}

export async function computerInfo() {
  return {
    system: os.type(),
    node_name: os.hostname(),
    release: os.release(),
    version: os.version(),
    machine: os.machine(),
    processor: os.cpus()?.[0]?.model ?? "",
    hostname: os.hostname(),
    ip_address: firstExternalIpv4(),
    external_ip: await externalIp(),
  };
}
