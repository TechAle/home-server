/**
 * Registry — routes, scheduled tasks and server functions collected at boot.
 *
 * Handlers return a plain value (serialised as JSON) or nothing (204). A thrown
 * error becomes a JSON response with its `status` when the error carries one,
 * so a broken service never takes the whole server down.
 */
import type { Express, Request, Response } from "express";
import type { RuleHandler, RouteHandler } from "./rules.js";

type Verb = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";

export interface Logger {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string, ...rest: unknown[]) => void;
}

export interface RouteSnapshot {
  method: string;
  url: string;
}

export interface RegistrySnapshot {
  routes: RouteSnapshot[];
  tasks: Array<{ name: string; interval: number }>;
  serverFunctions: string[];
}

export interface Registry {
  route(method: string, url: string, handler: RouteHandler): void;
  scheduledTask(interval: number, handler: () => unknown | Promise<unknown>, name?: string): void;
  serverFunction(name: string, handler: RouteHandler): void;
  snapshot(): RegistrySnapshot;
  stop(): void;
}

interface RegistryOptions {
  app: Express;
  log?: Logger;
}

export function createRegistry({ app, log = console }: RegistryOptions): Registry {
  const routes: RouteSnapshot[] = [];
  const tasks: Array<{ name: string; interval: number; timer: NodeJS.Timeout }> = [];
  const serverFunctions = new Map<string, RouteHandler>();

  function wrap(handler: RouteHandler, method: string, url: string) {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        const value = await handler(req, res);
        if (res.headersSent) return;
        if (value === undefined) {
          res.status(204).end();
          return;
        }
        res.json(value);
      } catch (error) {
        const err = error as { status?: unknown; message?: string };
        log.error?.(`[route] ${method} ${url} failed:`, err?.message ?? error);
        const status = Number.isInteger(err?.status) ? (err.status as number) : 500;
        if (!res.headersSent) res.status(status).json({ error: err?.message ?? "Internal error" });
      }
    };
  }

  return {
    route(method, url, handler) {
      const verb = method.toLowerCase() as Verb;
      app.route(url)[verb](wrap(handler, method.toUpperCase(), url));
      routes.push({ method: method.toUpperCase(), url });
    },

    scheduledTask(interval, handler, name = "task") {
      const timer = setInterval(async () => {
        try {
          await handler();
        } catch (error) {
          const err = error as { message?: string };
          log.error?.(`[task] ${name} failed:`, err?.message ?? error);
        }
      }, interval);
      // A pending task must not keep the process alive by itself.
      timer.unref();
      tasks.push({ name, interval, timer });
    },

    serverFunction(name, handler) {
      serverFunctions.set(name, handler);
    },

    snapshot() {
      return {
        routes: [...routes],
        tasks: tasks.map(({ name, interval }) => ({ name, interval })),
        serverFunctions: [...serverFunctions.keys()],
      };
    },

    stop() {
      for (const { timer } of tasks) clearInterval(timer);
      tasks.length = 0;
    },
  };
}

/** Narrow a value to a handler carrying decorator metadata. */
export function asRuleHandler(value: unknown): RuleHandler | null {
  if (typeof value !== "function") return null;
  const handler = value as RuleHandler;
  return handler.rule ? handler : null;
}
