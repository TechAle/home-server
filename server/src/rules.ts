/**
 * Rule decorators — the Node equivalent of the Flask project's
 * `services/Routes.py`, `services/Scheduled_Task.py` and
 * `services/Server_Function.py`.
 *
 * Each decorator stamps metadata on the handler; the loader reads it back when
 * it boots the services.
 */
import type { Request, Response } from "express";

export type RouteHandler = (req: Request, res: Response) => unknown | Promise<unknown>;

export type Rule =
  | { kind: "route"; url: string; methods: string[] }
  | { kind: "scheduledTask"; interval: number }
  | { kind: "serverFunction" };

export type RuleHandler = RouteHandler & { rule?: Rule };

export function route(url: string, methods: string[] = ["GET"]) {
  if (!url || !url.startsWith("/")) {
    throw new TypeError(`route(): url must start with "/" (received "${url}")`);
  }
  return (handler: RouteHandler): RouteHandler => {
    return Object.assign(handler, {
      rule: { kind: "route", url, methods: methods.map((method) => method.toUpperCase()) } satisfies Rule,
    });
  };
}

export function scheduledTask(interval: number) {
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new TypeError("scheduledTask(): interval must be a positive number of milliseconds");
  }
  return (handler: RouteHandler): RouteHandler => {
    return Object.assign(handler, { rule: { kind: "scheduledTask", interval } satisfies Rule });
  };
}

export function serverFunction() {
  return (handler: RouteHandler): RouteHandler => {
    return Object.assign(handler, { rule: { kind: "serverFunction" } satisfies Rule });
  };
}
