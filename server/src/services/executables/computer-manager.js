/**
 * ComputerManager — port of `services/executables/ComputerManager.py`.
 *
 * Service adapter: it only owns the four routes. Same endpoints and JSON
 * shapes as before; the logic lives in `src/services/computer/`, outside
 * `executables/`, so the loader never instantiates it:
 *
 *   ../computer/info.js      /get_computer_info payload
 *   ../computer/metrics.js   temperature, memory, disk, CPU, resource summary
 *   ../computer/platform.js  sentinels and OS helpers
 */
import { route } from "../../rules.js";
import { computerInfo } from "../computer/info.js";
import { cpuTemperature, memoryUsage, systemResourceInfo } from "../computer/metrics.js";

export default class ComputerManager {
  getComputerInfo = route("/get_computer_info", ["GET"])(async () => computerInfo());

  getCpuTemperature = route("/get_cpu_temperature", ["GET"])(async () => cpuTemperature());

  getMemoryUsage = route("/get_memory_usage", ["GET"])(async () => memoryUsage());

  getSystemResourceInfo = route("/get_system_resource_info", ["GET"])(async () => systemResourceInfo());
}
