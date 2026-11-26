/**
 * Loader — walks `services/executables`, imports every module and registers the
 * methods that carry decorator metadata.
 *
 * Python parsed the AST before importing. JavaScript cannot inspect exports
 * without importing, so the directory scan is the equivalent step. Both `.js`
 * and `.ts` are accepted: `dist/` holds `.js`, `tsx` runs the sources.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Logger, Registry } from "./registry.js";
import { asRuleHandler } from "./registry.js";

export interface AppliedRules {
  routes: number;
  tasks: number;
  serverFunctions: number;
}

export interface LoadedService extends AppliedRules {
  file: string;
  service: string;
}

export interface LoadOptions {
  log?: Logger;
  setup?: (instance: object, file: string) => void;
}

const MODULE_EXTENSION = /\.(js|ts)$/;
const DECLARATION = /\.d\.ts$/;

export async function loadExecutables(
  directory: string,
  registry: Registry,
  { log = console, setup }: LoadOptions = {},
): Promise<LoadedService[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        MODULE_EXTENSION.test(entry.name) &&
        !DECLARATION.test(entry.name) &&
        !entry.name.startsWith("_"),
    )
    .map((entry) => entry.name)
    .sort();

  const loaded: LoadedService[] = [];

  for (const file of files) {
    const moduleUrl = pathToFileURL(join(directory, file)).href;
    const imported = (await import(moduleUrl)) as { default?: unknown };
    const Service = imported.default;

    if (typeof Service !== "function") {
      log.warn?.(`[loader] ${file} has no default class, skipped`);
      continue;
    }

    const instance = new (Service as new () => object)();
    setup?.(instance, file);
    const rules = applyRules(instance, registry);
    const serviceName = Service.name || file;
    loaded.push({ file, service: serviceName, ...rules });
  }

  return loaded;
}

export function applyRules(instance: object, registry: Registry): AppliedRules {
  const applied: AppliedRules = { routes: 0, tasks: 0, serverFunctions: 0 };
  const target = instance as Record<string, unknown>;

  for (const name of Object.getOwnPropertyNames(instance)) {
    const handler = asRuleHandler(target[name]);
    if (!handler?.rule) continue;

    const rule = handler.rule;
    if (rule.kind === "route") {
      for (const method of rule.methods) {
        registry.route(method, rule.url, handler.bind(instance) as typeof handler);
        applied.routes += 1;
      }
    } else if (rule.kind === "scheduledTask") {
      registry.scheduledTask(
        rule.interval,
        handler.bind(instance) as () => unknown,
        `${instance.constructor.name}.${name}`,
      );
      applied.tasks += 1;
    } else if (rule.kind === "serverFunction") {
      registry.serverFunction(name, handler.bind(instance) as typeof handler);
      applied.serverFunctions += 1;
    }
  }

  return applied;
}
