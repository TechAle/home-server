# Home Server — backend

Node.js backend for the Home Server. Services declare their own routes,
scheduled tasks and server functions, and the server discovers them at boot
without a central list.

TypeScript sources in `src/`, compiled to `dist/` with `tsc`.

```sh
npm install
npm run dev        # tsx watch, http://0.0.0.0:5000
npm run typecheck  # tsc --noEmit
npm test           # node:test via tsx
npm run build      # tsc -> dist/
npm start          # runs the built dist/
```

## Debug in WebStorm

Two shared run configurations live in the repository root (`.run/`):

- **Server: Node** — runs `src/index.ts` from `server/` (`node --import tsx`) with `PORT=5000`.
  Press **Debug** instead of **Run** to start it with the inspector attached:
  breakpoints in `src/**` work out of the box, including inside the service
  classes loaded dynamically.
- **Server: Node tests** — runs `npm test`; the Debug button works here too, so
  you can step through the loader and the registry while the suite runs.

Environment and configuration live next to the code:

- `configuration.json` — non-secret settings (AniList API, client id, redirect uri)
- `.env` — secrets (`ANILIST_CLIENT_SECRET`, `ANILIST_ACCESS_TOKEN`, `REGISTRATION_KEY`)
- `data/home-server.db` — SQLite users/sessions, created on first boot (gitignored)
- `templates/` — the three HTML stubs

## Provenance (former Flask backend)

| Python | Node |
| --- | --- |
| `flaskMain.py` (`MyFlaskApp`) | `src/app.ts` (`createApp`) + `src/index.ts` |
| `utils/ClassUtils.py` (AST scan) | `src/loader.ts` (directory scan + `import()`) |
| `utils/PathUtils.py` | `readdir` inside `src/loader.ts` |
| `services/Routes.py` | `route()` in `src/rules.ts` |
| `services/Scheduled_Task.py` | `scheduledTask()` in `src/rules.ts` |
| `services/Server_Function.py` | `serverFunction()` in `src/rules.ts` |
| `managers_functions` / scheduler threads | `src/registry.ts` |
| `services/executables/ComputerManager.py` | `src/services/executables/computer-manager.ts` |
| `services/executables/AnilistManager.py` | `src/services/executables/anilist-manager.ts` |

## The core difference

The Flask version read each file with `ast` and found decorated methods **before**
importing the module. JavaScript cannot inspect exports without importing, so the
loader
walks `src/services/executables`, imports every module (`.ts` in development,
`.js` in `dist/`), instantiates its default class and reads the metadata that the
decorators stamped on each handler:

```js
export default class ComputerManager {
  getComputerInfo = route("/get_computer_info", ["GET"])(async () => ({ ... }));
}
```

Adding a service = drop a file into `src/services/executables`. Nothing else to
register.

Only the adapter goes in `executables/`: the loader instantiates every module
there (no subdirectories, and `_`-prefixed files are skipped), so pure logic
lives in `src/services/<domain>/` and is never instantiated.

| File | Role |
| --- | --- |
| `src/services/executables/anilist-manager.ts` | class + `/get_anime` route (the only AniList file the loader sees) |
| `src/services/anilist/client.ts` | `createAniListClient()`: viewer id, current + planning lists |
| `src/services/anilist/links.ts` | AniSaturn search, matching, `nextEpisodeLink()`, cache and pacing |
| `src/services/anilist/next-episode.ts` | `nextEpisodeState()`: waiting + `nextEpisode` schedule |
| `src/services/anilist/queries.ts` | GraphQL documents |
| `src/services/executables/computer-manager.ts` | class + the four metrics routes |
| `src/services/computer/info.ts` | `/get_computer_info` payload |
| `src/services/computer/metrics.ts` | temperature, memory, disk, CPU, resource summary |
| `src/services/computer/platform.ts` | `-591`/`-590` sentinels and OS helpers |
| `src/services/executables/auth-manager.ts` | class + the `auth/*` routes |
| `src/services/auth/passwords.ts` | scrypt hashing and verification |
| `src/services/auth/tokens.ts` | session token generation, SHA-256 and constant-time compare |
| `src/services/auth/store.ts` | SQLite users and sessions |
| `src/services/auth/middleware.ts` | Bearer guard for every protected route |

Factories (`createAniListClient`, `createAnisaturnResolver`) accept
`fetchImpl`/cache options, so the tests inject a fake `fetch` instead of
monkey-patching globals.

## Streaming links

`GET /get_anime` returns, for every title being watched (`CURRENT`), planned
(`PLANNING`) or rewatching (`REPEATING`), the link of the next episode to watch
(`progress + 1`). For each title it searches AniSaturn and builds
`https://www.animesaturn.net/anime/{id}/ep-{progress + 1}`. Planned titles start
at episode 1 and move to `CURRENT` as soon as an episode is marked as watched;
`REPEATING` is preserved when a rewatch progresses. `POST /anime/rewatch` puts
a title back into `REPEATING` from a chosen progress.

AniSaturn names later seasons with a number or with a subtitle, so the exact
AniList title often has no result. The search tries, in order:

1. the full title (`That Time I Got Reincarnated as a Slime Season 4`);
2. the title without the season word (`... Slime 4`);
3. the main title before the colon
   (`Ascendance of a Bookworm: Adopted Daughter of an Archduke` ->
   `Ascendance of a Bookworm`).

## Episode downloads

`POST /anime/download` resolves the AniSaturn page to its signed MP4 and streams
it to `server/data/downloads` (the job runs in the background):

```json
{"url":"https://www.animesaturn.net/anime/…/ep-1","title":"…","episode":1}
```

`GET /anime/download/<id>` returns `status` (`downloading`/`done`/`error`),
`progress`, byte counts and, once done, a `playUrl`. `GET
/anime/downloads?title=…` lists the jobs for one title (including active ones);
without `title` it returns the completed library across all anime.
`DELETE /anime/download/<id>` cancels an active download (aborting the transfer
and removing partial data) or deletes a finished file. The file is served by
`GET /downloads/<file>` with HTTP Range support, protected by a short-lived
HMAC signature in the query string (the `<video>` player cannot send the
Bearer header on range requests). Downloads are capped at 2 GB and the newest
10 files are kept; set `DOWNLOAD_SECRET` to keep signed links valid across
restarts.

Each completed entry stores a snapshot of the AniList metadata (media id,
episode base, status and progress) so the completed library can play an episode
without looking it up again.

When several results share the base name, the AniList `startDate.year` picks
the right season (`Ascendance of a Bookworm` 2019 vs `... 4` 2026). Requests
are cached for six hours and spaced out, since the search endpoint answers
"Too many requests" under bursts. If nothing matches or the search fails, the
title gets an empty `link` array.

A title is never dropped for waiting on the next episode: when AniList says
the next airing episode is `progress + 1` (the last one is already watched),
`link` stays `[]` and the entry carries the schedule:

```json
{
  "progress": 6,
  "link": [],
  "nextEpisode": { "episode": 7, "airingAt": 1795000000, "airingAtIso": "2026-11-18T12:26:40.000Z" }
}
```

`nextEpisode` is `null` when AniList has no upcoming episode scheduled.

## Auth

Registration and login live in `src/services/executables/auth-manager.ts`.

| Method | Path | Public | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | yes | body `{ username, password, registrationKey }`, answers `201` |
| POST | `/auth/login` | yes | body `{ username, password }`, answers `200` |
| POST | `/auth/logout` | no | revokes the current token, answers `204` |
| GET | `/auth/me` | no | returns `{ user }` |

Every other route (`/get_*`) requires `Authorization: Bearer <token>` and
answers `401` without a valid key.

- **Passwords**: scrypt with a random 16-byte salt per user; the parameters and
  salt live inside the stored hash, so the cost can be raised later.
- **Tokens**: 32 random bytes, returned to the client once. The database keeps
  only their SHA-256, so a database leak does not leak usable keys.
- **Sessions**: expire after `SESSION_TTL_DAYS` (default 30) and are cleaned on
  login; logout deletes the single session row.
- **Database**: SQLite at `server/data/home-server.db` (gitignored), created on
  first boot.
- **Registration**: disabled when `REGISTRATION_KEY` is empty; the key is read
  from `.env` only, never from the repository.

## Docker

```sh
cp .env.example .env
mkdir -p data
sudo chown -R 1000:1000 data   # the container runs as uid 1000 (node)
docker compose up -d --build
```

The compose file uses host networking so the API can bind loopback only
(`127.0.0.1:5000`, with Caddy in front) and reach the Foundry helper on
`127.0.0.1:5050`. Host networking also lets the container reach other host
loopback services, which is intentional here. SQLite lives in `server/data` and
must be writable by uid 1000; the container drops all Linux capabilities.

## Foundry control

The dashboard can show whether Foundry is online and start/restart it. The
container cannot manage host processes, so `server/host/foundry-control.mjs`
runs as a small systemd unit on the host (`server/host/foundry-control.service`).
It listens on `127.0.0.1:5050`, checks TCP port 30000 and restarts
`foundry-script.service` on request. Requests need
`Authorization: Bearer $FOUNDRY_CONTROL_TOKEN`; both processes read the token
from `server/.env`.

Install it once on the Raspberry:

```sh
sudo cp server/host/foundry-control.service /etc/systemd/system/
sudo cp server/host/foundry-control.sudoers /etc/sudoers.d/foundry-control
sudo chmod 440 /etc/sudoers.d/foundry-control
sudo visudo -cf /etc/sudoers.d/foundry-control
sudo systemctl daemon-reload
sudo systemctl enable --now foundry-control
```

The helper never opens, closes or reconfigures Foundry's port: it only checks
the port and restarts the systemd unit that owns the process. `/start` is a
no-op when Foundry is already listening, so it cannot drop live sessions; only
`/restart` restarts an online server.

The unit, sudoers file and paths assume the `alessandro` user with the repo at
`~/Desktop/home-server`; adjust them when deploying elsewhere.

## Behaviour notes

- Ports, routes and JSON shapes are the same as the Flask app, including the
  `-591` sentinel for metrics the host cannot provide.
- System metrics are real on both Linux and macOS: CPU usage, RAM and disk come
  from Node/`statfs`. On Linux the CPU temperature is read from
  `/sys/class/thermal/thermal_zone0/temp` (so it also works inside Docker),
  with `vcgencmd` as fallback. On macOS RAM is read from `vm_stat`, because
  `os.freemem()` counts only free pages and would report ~99% used; the CPU
  temperature keeps the `-591` sentinel because it needs privileged tools
  (`powermetrics`).
- `ram.*_mib` values are **GiB**, as in the Python code (the suffix is a legacy
  of the original implementation). Fixing the units would change the API, so it
  is left as-is on purpose.
- `AnilistManager` no longer throws at startup when the token is missing: the
  constructor stays alive and `GET /get_anime` answers `503` with a clear
  message. In Flask, a missing token prevented the whole server from booting.
- Scheduled tasks use `setInterval` with `unref()`, so a pending task never
  blocks shutdown; `registry.stop()` clears them on `SIGINT`/`SIGTERM`.
- CPU usage is sampled over 100 ms, since Node has no `psutil.cpu_percent()`.
- `/auth/login` and `/auth/register` are rate-limited per IP (10 requests per
  15 minutes, override with `AUTH_RATE_LIMIT_MAX`). Behind a reverse proxy set
  `TRUST_PROXY=1` so `req.ip` comes from `X-Forwarded-For`; leave it unset when
  the server is reachable directly, otherwise clients could spoof the header.
- The server listens on `0.0.0.0` by default. On a host with Caddy/nginx in
  front, run it with `HOST=127.0.0.1` so only the proxy can reach it.
- `REGISTRATION_KEY` must be a long random string when the server is public:
  empty disables registration, short values can be guessed.

## Endpoints

| Method | Path | Source |
| --- | --- | --- |
| GET | `/` | `templates/index.html` |
| GET | `/unsubscribe` | `templates/unsubscribe.html` |
| GET | `/admin` | `templates/admin.html` |
| GET | `/info` | plain text `Hello!.` |
| POST | `/auth/register` | AuthManager (public) |
| POST | `/auth/login` | AuthManager (public) |
| POST | `/auth/logout` | AuthManager |
| GET | `/auth/me` | AuthManager |
| GET | `/get_computer_info` | ComputerManager |
| GET | `/get_cpu_temperature` | ComputerManager |
| GET | `/get_memory_usage` | ComputerManager |
| GET | `/get_system_resource_info` | ComputerManager |
| GET | `/get_anime` | AnilistManager |
| POST | `/anime/download` | AnimeDownloadManager |
| GET | `/anime/download/:id` | AnimeDownloadManager |
| GET | `/anime/downloads` | AnimeDownloadManager |
| DELETE | `/anime/download/:id` | AnimeDownloadManager |
| POST | `/anime/rewatch` | AnilistManager |
| GET | `/downloads/:file` | AnimeDownloadManager (signed URL) |
| GET | `/foundry/status` | FoundryManager |
| POST | `/foundry/start` | FoundryManager |
| POST | `/foundry/restart` | FoundryManager |

Every row below `/admin` except `/auth/login` and `/auth/register` requires
`Authorization: Bearer <token>`; the three HTML pages (`/`, `/unsubscribe`,
`/admin`) stay public.

## TypeScript

Everything under `src/` is TypeScript with `strict` enabled; there is no
JavaScript source left. `tsx` runs the sources in development, `npm run build`
emits `dist/*.js`, and the loader accepts both extensions so the same code boots
from either place.

`npm run typecheck` checks `src/` only; tests run through `tsx`, which strips
types without type-checking them.
