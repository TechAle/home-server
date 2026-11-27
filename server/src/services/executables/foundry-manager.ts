/**
 * FoundryManager — status and lifecycle routes for the host Foundry server.
 * The container talks to a loopback helper; it never touches Foundry's port.
 */
import { route } from "../../rules.js";
import { createFoundryControl, type FoundryStatus } from "../foundry/control.js";

export default class FoundryManager {
  #control = createFoundryControl();

  status = route("/foundry/status", ["GET"])(async (): Promise<FoundryStatus> => {
    return this.#control.status();
  });

  start = route("/foundry/start", ["POST"])(async () => {
    await this.#control.restart();
    return { ok: true };
  });

  restart = route("/foundry/restart", ["POST"])(async () => {
    await this.#control.restart();
    return { ok: true };
  });
}
