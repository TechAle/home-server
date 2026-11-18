/**
 * Rule decorators — the Node equivalent of the Flask project's
 * `services/Routes.py`, `services/Scheduled_Task.py` and
 * `services/Server_Function.py`.
 *
 * Python decorators attach an attribute to the function through the AST.
 * Here each decorator is a higher-order function that stamps metadata on the
 * handler, and the loader reads it back when it boots the services.
 */

/** @typedef {{ kind: "route", url: string, methods: string[] }} RouteRule */

export function route(url, methods = ["GET"]) {
  if (!url || !url.startsWith("/")) {
    throw new TypeError(`route(): url must start with "/" (received "${url}")`);
  }
  /**
   * @param {Function} handler
   * @returns {Function}
   */
  return (handler) => {
    handler.rule = { kind: "route", url, methods: methods.map((m) => m.toUpperCase()) };
    return handler;
  };
}

export function scheduledTask(interval) {
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new TypeError("scheduledTask(): interval must be a positive number of milliseconds");
  }
  return (handler) => {
    handler.rule = { kind: "scheduledTask", interval };
    return handler;
  };
}

export function serverFunction(options = {}) {
  return (handler) => {
    handler.rule = { kind: "serverFunction", ...options };
    return handler;
  };
}
