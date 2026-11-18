/**
 * System metrics, without psutil:
 *   CPU temperature -> vcgencmd on Linux, sentinels elsewhere
 *   disk usage      -> fs.statfs
 *   CPU usage       -> two /proc-independent samples from node:os
 *
 * The -591/-590 sentinels are the Python project's, kept for API compatibility.
 */
import { statfs } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { UNAVAILABLE, isLinux, isMac, round } from "./platform.js";

const execFileAsync = promisify(execFile);

export async function cpuTemperature() {
  if (isLinux) {
    try {
      const { stdout } = await execFileAsync("/usr/bin/vcgencmd", ["measure_temp"]);
      const match = stdout.match(/=([\d.]+)/);
      if (match) return Number(match[1]);
    } catch {
      return -590;
    }
  }
  return isMac ? UNAVAILABLE : -590;
}

export async function memoryUsage() {
  if (isMac) {
    return {
      total_memory: UNAVAILABLE,
      used_memory: UNAVAILABLE,
      free_memory: UNAVAILABLE,
      memory_percent: UNAVAILABLE,
    };
  }

  const total = os.totalmem() / 1024 ** 3;
  const free = os.freemem() / 1024 ** 3;
  const used = total - free;

  return {
    total_memory: round(total),
    used_memory: round(used),
    free_memory: round(free),
    memory_percent: total > 0 ? round((used / total) * 100) : 0,
  };
}

export async function diskUsage(path = "/") {
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
export function cpuUsage(sampleMs = 100) {
  const start = snapshotCpu();
  return new Promise((resolve) => {
    setTimeout(() => {
      const end = snapshotCpu();
      const idle = end.idle - start.idle;
      const total = end.total - start.total;
      resolve(total > 0 ? round((1 - idle / total) * 100) : 0);
    }, sampleMs).unref?.();
  });
}

function snapshotCpu() {
  return os.cpus().reduce(
    (acc, cpu) => {
      const times = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      acc.total += times;
      acc.idle += cpu.times.idle;
      return acc;
    },
    { idle: 0, total: 0 },
  );
}

export async function systemResourceInfo() {
  if (isMac) {
    return {
      cpu_temperature: UNAVAILABLE,
      cpu_usage_percent: UNAVAILABLE,
      ram: { total_mib: UNAVAILABLE, used_mib: UNAVAILABLE, free_mib: UNAVAILABLE, percent_used: UNAVAILABLE },
      disk: { total_gib: UNAVAILABLE, used_gib: UNAVAILABLE, free_gib: UNAVAILABLE, percent_used: UNAVAILABLE },
    };
  }

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
