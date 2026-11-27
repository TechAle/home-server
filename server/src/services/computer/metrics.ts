/**
 * System metrics, without psutil:
 *   CPU temperature -> sysfs thermal zone, then vcgencmd on Linux
 *   disk usage      -> fs.statfs (Linux and macOS)
 *   CPU usage       -> two samples from node:os
 *   memory on macOS -> vm_stat, so cached pages are not counted as used
 *
 * The -591 / -590 sentinels are the Python project's, kept for API compatibility.
 */
import { readFile, statfs } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { isLinux, isMac, round, UNAVAILABLE } from "./platform.js";

const execFileAsync = promisify(execFile);

export interface MemoryUsage {
  total_memory: number;
  used_memory: number;
  free_memory: number;
  memory_percent: number;
}

export interface DiskUsage {
  total_gib: number;
  used_gib: number;
  free_gib: number;
  percent_used: number;
}

export interface SystemResourceInfo {
  cpu_temperature: number;
  cpu_usage_percent: number;
  ram: {
    total_mib: number;
    used_mib: number;
    free_mib: number;
    percent_used: number;
  };
  disk: DiskUsage;
}

/** `/sys/class/thermal/thermal_zone0/temp` reports millidegrees Celsius. */
export function parseThermalZone(value: string): number | null {
  const millidegrees = Number(value.trim());
  return Number.isFinite(millidegrees) && millidegrees > 0
    ? round(millidegrees / 1000)
    : null;
}

/**
 * sysfs first: it works inside containers, where `vcgencmd` is usually absent.
 * The Raspberry Pi exposes the CPU zone as `cpu-thermal` in zone 0.
 */
async function sysfsTemperature(): Promise<number | null> {
  try {
    const raw = await readFile("/sys/class/thermal/thermal_zone0/temp", "utf8");
    return parseThermalZone(raw);
  } catch {
    return null;
  }
}

export async function cpuTemperature(): Promise<number> {
  if (isLinux) {
    const fromSysfs = await sysfsTemperature();
    if (fromSysfs !== null) return fromSysfs;

    try {
      const { stdout } = await execFileAsync("/usr/bin/vcgencmd", ["measure_temp"]);
      const match = stdout.match(/=([\d.]+)/);
      if (match?.[1]) return Number(match[1]);
    } catch {
      return -590;
    }
  }
  return isMac ? UNAVAILABLE : -590;
}

export async function memoryUsage(): Promise<MemoryUsage> {
  const total = os.totalmem();
  const free = isMac ? await macFreeMemory(total) : os.freemem();
  const used = total - free;

  return {
    total_memory: round(total / 1024 ** 3),
    used_memory: round(used / 1024 ** 3),
    free_memory: round(free / 1024 ** 3),
    memory_percent: total > 0 ? round((used / total) * 100) : 0,
  };
}

interface VmStat {
  pageSize: number;
  freeBytes: number;
}

/**
 * macOS `vm_stat`: `Pages free` ignores inactive and speculative pages, so
 * treating them as used would always report ~99% memory usage. This mirrors
 * Activity Monitor, where cached pages count as available memory.
 */
export function parseVmStat(output: string): VmStat | null {
  const pageSize = /page size of (\d+) bytes/.exec(output)?.[1];
  if (!pageSize) return null;

  const pages = new Map<string, number>();
  for (const line of output.split("\n")) {
    const match = /^([^:]+):\s+([\d.]+)/.exec(line.trim());
    if (!match?.[1] || !match[2]) continue;
    pages.set(match[1].trim(), Number(match[2]));
  }

  const freePages =
    (pages.get("Pages free") ?? 0) +
    (pages.get("Pages inactive") ?? 0) +
    (pages.get("Pages speculative") ?? 0);

  if (freePages <= 0) return null;
  return { pageSize: Number(pageSize), freeBytes: freePages * Number(pageSize) };
}

/** Available RAM on macOS, with `os.freemem()` as a last resort. */
async function macFreeMemory(totalBytes: number): Promise<number> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/vm_stat", []);
    const parsed = parseVmStat(stdout);
    if (parsed) return Math.min(totalBytes, parsed.freeBytes);
  } catch {
    // Fall through to the Node value.
  }
  return os.freemem();
}

export async function diskUsage(path = "/"): Promise<DiskUsage> {
  const stats = await statfs(path);
  const total = stats.bsize * stats.blocks;
  const free = stats.bsize * stats.bavail;
  const used = total - free;

  return {
    total_gib: round(total / 2 ** 30),
    used_gib: round(used / 2 ** 30),
    free_gib: round(free / 2 ** 30),
    percent_used: total > 0 ? round((used / total) * 100) : 0,
  };
}

/** CPU usage sampled over a short window, since Node has no psutil equivalent. */
export function cpuUsage(sampleMs = 100): Promise<number> {
  const start = snapshotCpu();
  return new Promise((resolve) => {
    setTimeout(() => {
      const end = snapshotCpu();
      const idle = end.idle - start.idle;
      const total = end.total - start.total;
      resolve(total > 0 ? round((1 - idle / total) * 100) : 0);
    }, sampleMs).unref();
  });
}

interface CpuSnapshot {
  idle: number;
  total: number;
}

function snapshotCpu(): CpuSnapshot {
  return os.cpus().reduce<CpuSnapshot>(
    (acc, cpu) => {
      const times = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      acc.total += times;
      acc.idle += cpu.times.idle;
      return acc;
    },
    { idle: 0, total: 0 },
  );
}

export async function systemResourceInfo(): Promise<SystemResourceInfo> {
  const [temperature, memory, disk, cpu] = await Promise.all([
    cpuTemperature(),
    memoryUsage(),
    diskUsage("/"),
    cpuUsage(),
  ]);

  return {
    cpu_temperature: temperature,
    cpu_usage_percent: cpu,
    ram: {
      total_mib: memory.total_memory,
      used_mib: memory.used_memory,
      free_mib: memory.free_memory,
      percent_used: memory.memory_percent,
    },
    disk,
  };
}
