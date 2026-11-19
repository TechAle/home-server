/**
 * ComputerManager — service adapter that owns the four routes. The logic lives
 * in `src/services/computer/`, outside `executables/`, so the loader never
 * instantiates it.
 */
import { route } from "../../rules.js";
import { computerInfo, type ComputerInfo } from "../computer/info.js";
import {
  cpuTemperature,
  memoryUsage,
  systemResourceInfo,
  type MemoryUsage,
  type SystemResourceInfo,
} from "../computer/metrics.js";

export default class ComputerManager {
  getComputerInfo = route("/get_computer_info", ["GET"])(async (): Promise<ComputerInfo> => computerInfo());

  getCpuTemperature = route("/get_cpu_temperature", ["GET"])(async (): Promise<number> => cpuTemperature());

  getMemoryUsage = route("/get_memory_usage", ["GET"])(async (): Promise<MemoryUsage> => memoryUsage());

  getSystemResourceInfo = route("/get_system_resource_info", ["GET"])(
    async (): Promise<SystemResourceInfo> => systemResourceInfo(),
  );
}
