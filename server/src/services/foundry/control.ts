/**
 * Client for the host-side Foundry helper (`server/host/foundry-control.mjs`).
 *
 * The home-server container cannot manage host processes, so a localhost
 * helper checks Foundry's port and restarts its systemd unit. The helper is
 * token protected; when it is not configured the status call still resolves so
 * the dashboard can show the service as offline.
 */
export interface FoundryStatus {
  online: boolean;
  service: string;
  error?: string;
}

export interface FoundryControl {
  status(): Promise<FoundryStatus>;
  restart(): Promise<void>;
}

export interface FoundryControlOptions {
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}

function defaultBaseUrl(): string {
  return (process.env.FOUNDRY_CONTROL_URL ?? "http://127.0.0.1:5050").replace(/\/+$/, "");
}

export function createFoundryControl({
  baseUrl = defaultBaseUrl(),
  token = (process.env.FOUNDRY_CONTROL_TOKEN ?? "").trim(),
  fetchImpl = globalThis.fetch,
}: FoundryControlOptions = {}): FoundryControl {
  async function call(path: string, method: "GET" | "POST"): Promise<unknown> {
    if (!token) {
      throw httpError(
        503,
        "Foundry control is not configured: set FOUNDRY_CONTROL_TOKEN in server/.env.",
      );
    }

    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).trim();
      throw httpError(
        502,
        `Foundry helper answered ${response.status}${detail ? `: ${detail}` : ""}`,
      );
    }

    return (await response.json()) as unknown;
  }

  return {
    async status() {
      try {
        const data = (await call("/status", "GET")) as {
          online?: unknown;
          service?: unknown;
        };
        return {
          online: Boolean(data.online),
          service:
            typeof data.service === "string" && data.service ? data.service : "unknown",
        };
      } catch (error) {
        const failure = error as { message?: string };
        return {
          online: false,
          service: "unknown",
          error: failure.message ?? "Foundry helper unreachable.",
        };
      }
    },

    async restart() {
      await call("/restart", "POST");
    },
  };
}
