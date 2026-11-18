/**
 * Loader — the Node counterpart of `utils/ClassUtils.py`.
 *
 * Python parses the AST to find classes and decorated methods, then imports
 * them by module path. In JavaScript we cannot inspect exports without
 * importing the file, so the loader walks the directory and imports every
 * module, then reads the metadata stamped by the rule decorators.
 *
 * Same contract as the Python project: every file in `services/executables`
 * exports a default class; every own method carrying `handler.rule` is
 * registered on the registry.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function loadExecutables(directory, registry, { log = console, setup } = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js") && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();

  const loaded = [];

  for (const file of files) {
    const moduleUrl = pathToFileURL(join(directory, file)).href;
    const module = await import(moduleUrl);
    const Service = module.default;

    if (typeof Service !== "function") {
      log.warn(`[loader] ${file} has no default class, skipped`);
      continue;
    }

    const instance = new Service();
    if (typeof setup === "function") setup(instance, file);
    const rules = applyRules(instance, registry);
    loaded.push({ file, service: Service.name, ...rules });
  }

  return loaded;
}

export function applyRules(instance, registry) {
  const applied = { routes: 0, tasks: 0, serverFunctions: 0 };

  for (const name of Object.getOwnPropertyNames(instance)) {
    const handler = instance[name];
    if (typeof handler !== "function" || !handler.rule) continue;

    const rule = handler.rule;
    if (rule.kind === "route") {
      for (const method of rule.methods) {
        registry.route(method, rule.url, handler.bind(instance));
        applied.routes += 1;
      }
    } else if (rule.kind === "scheduledTask") {
      registry.scheduledTask(rule.interval, handler.bind(instance), `${instance.constructor.name}.${name}`);
      applied.tasks += 1;
    } else if (rule.kind === "serverFunction") {
      registry.serverFunction(name, handler.bind(instance));
      applied.serverFunctions += 1;
    }
  }

  return applied;
}
