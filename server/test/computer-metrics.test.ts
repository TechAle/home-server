import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diskUsage,
  memoryUsage,
  parseVmStat,
  systemResourceInfo,
} from "../src/services/computer/metrics.js";

const vmStat = `Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                               1234.
Pages active:                           100000.
Pages inactive:                          50000.
Pages speculative:                        2500.
Pages wired down:                        20000.
Pages occupied by compressor:             8000.
`;

test("parseVmStat treats inactive and speculative pages as available", () => {
  assert.deepEqual(parseVmStat(vmStat), {
    pageSize: 16384,
    freeBytes: (1234 + 50000 + 2500) * 16384,
  });
});

test("parseVmStat returns null for unexpected output", () => {
  assert.equal(parseVmStat("nope"), null);
  assert.equal(parseVmStat("Mach Virtual Memory Statistics: (page size of 0 bytes)"), null);
});

test("memoryUsage returns real values on every platform", async () => {
  const memory = await memoryUsage();

  assert.ok(memory.total_memory > 0, "total memory must be positive");
  assert.ok(memory.used_memory >= 0);
  assert.ok(memory.free_memory >= 0);
  assert.ok(
    Math.abs(memory.total_memory - memory.used_memory - memory.free_memory) <= 0.05,
    "used + free should match total",
  );
  assert.ok(memory.memory_percent >= 0 && memory.memory_percent <= 100);
});

test("diskUsage reports the root volume", async () => {
  const disk = await diskUsage("/");

  assert.ok(disk.total_gib > 0, "total disk must be positive");
  assert.ok(disk.used_gib >= 0);
  assert.ok(disk.free_gib >= 0);
  assert.ok(disk.percent_used >= 0 && disk.percent_used <= 100);
});

test("systemResourceInfo combines cpu, ram and disk", async () => {
  // cpuUsage samples with an unref'd timer, which alone would not keep the test
  // process alive; this interval holds the loop open for the sample window.
  const keepAlive = setInterval(() => {}, 10);

  try {
    const info = await systemResourceInfo();

    assert.equal(typeof info.cpu_temperature, "number");
    assert.ok(info.cpu_usage_percent >= 0 && info.cpu_usage_percent <= 100);
    assert.ok(info.ram.total_mib > 0, "total ram must be positive");
    assert.ok(info.ram.percent_used >= 0 && info.ram.percent_used <= 100);
    assert.ok(info.disk.total_gib > 0, "total disk must be positive");
  } finally {
    clearInterval(keepAlive);
  }
});
