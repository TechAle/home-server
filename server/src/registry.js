/**
 * Registry — the runtime counterpart of the dictionaries that
 * `MyFlaskApp` builds in `flaskMain.py`:
 *
 *   routes          -> app.add_url_rule
 *   scheduled_tasks -> scheduler threads
 *   server_functions-> managers_functions
 *
 * Handlers can return a plain value (serialised as JSON) or a Response-like
 * object. Errors become 500s with a JSON body, so a broken service never
 * takes the whole server down.
 */

export function createRegistry({ app, log = console }) {
  const routes = [];
  const tasks = [];
  const serverFunctions = new Map();

  function wrap(handler, rule) {
    return async (req, res) => {
      try {
        const value = await handler(req, res);
        if (res.headersSent) return;
        if (value === undefined) return res.status(204).end();
        res.json(value);
      } catch (error) {
        log.error(`[route] ${rule.methods.join(",")} ${rule.url} failed:`, error?.message ?? error);
        const status = Number.isInteger(error?.status) ? error.status : 500;
        if (!res.headersSent) res.status(status).json({ error: error?.message ?? "Internal error" });
      }
    };
  }

  return {
    route(method, url, handler) {
      const rule = { kind: "route", url, methods: [method.toUpperCase()] };
      app[method.toLowerCase()](url, wrap(handler, rule));
      routes.push({ method: method.toUpperCase(), url });
    },

    scheduledTask(interval, handler, name = "task") {
      const timer = setInterval(async () => {
        try {
          await handler();
        } catch (error) {
          log.error(`[task] ${name} failed:`, error?.message ?? error);
        }
      }, interval);
      // Keep the event loop free: a pending task must not block shutdown.
      timer.unref?.();
      tasks.push({ name, interval, timer });
    },

    serverFunction(name, handler) {
      serverFunctions.set(name, handler);
    },

    get(name) {
      const fn = serverFunctions.get(name);
      if (!fn) throw new Error(`Unknown server function "${name}"`);
      return fn;
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
