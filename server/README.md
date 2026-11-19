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
- `.env` — secrets (`ANILIST_CLIENT_SECRET`, `ANILIST_ACCESS_TOKEN`)
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
| `src/services/anilist/client.ts` | `createAniListClient()`: viewer id, watching list |
| `src/services/anilist/links.ts` | AniSaturn search, matching, `nextEpisodeLink()`, cache and pacing |
| `src/services/anilist/next-episode.ts` | `nextEpisodeState()`: waiting + `nextEpisode` schedule |
| `src/services/anilist/queries.ts` | GraphQL documents |
| `src/services/executables/computer-manager.ts` | class + the four metrics routes |
| `src/services/computer/info.ts` | `/get_computer_info` payload |
| `src/services/computer/metrics.ts` | temperature, memory, disk, CPU, resource summary |
| `src/services/computer/platform.ts` | `-591`/`-590` sentinels and OS helpers |

Factories (`createAniListClient`, `createAnisaturnResolver`) accept
`fetchImpl`/cache options, so the tests inject a fake `fetch` instead of
monkey-patching globals.

## Streaming links

`GET /get_anime` returns, for every title currently being watched, the link of
the next episode to watch (`progress + 1`). For each title it searches
AniSaturn and builds `https://www.animesaturn.net/anime/{id}/ep-{progress + 1}`.

AniSaturn names later seasons with a number or with a subtitle, so the exact
AniList title often has no result. The search tries, in order:

1. the full title (`That Time I Got Reincarnated as a Slime Season 4`);
2. the title without the season word (`... Slime 4`);
3. the main title before the colon
   (`Ascendance of a Bookworm: Adopted Daughter of an Archduke` ->
   `Ascendance of a Bookworm`).

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

## Behaviour notes

- Ports, routes and JSON shapes are the same as the Flask app, including the
  `-591` sentinel used for metrics that are unavailable on macOS.
- `ram.*_mib` values are **GiB**, as in the Python code (the suffix is a legacy
  of the original implementation). Fixing the units would change the API, so it
  is left as-is on purpose.
- `AnilistManager` no longer throws at startup when the token is missing: the
  constructor stays alive and `GET /get_anime` answers `503` with a clear
  message. In Flask, a missing token prevented the whole server from booting.
- Scheduled tasks use `setInterval` with `unref()`, so a pending task never
  blocks shutdown; `registry.stop()` clears them on `SIGINT`/`SIGTERM`.
- CPU usage is sampled over 100 ms, since Node has no `psutil.cpu_percent()`.

## Endpoints

| Method | Path | Source |
| --- | --- | --- |
| GET | `/` | `templates/index.html` |
| GET | `/unsubscribe` | `templates/unsubscribe.html` |
| GET | `/admin` | `templates/admin.html` |
| GET | `/info` | plain text `Hello!.` |
| GET | `/get_computer_info` | ComputerManager |
| GET | `/get_cpu_temperature` | ComputerManager |
| GET | `/get_memory_usage` | ComputerManager |
| GET | `/get_system_resource_info` | ComputerManager |
| GET | `/get_anime` | AnilistManager |

## TypeScript

Everything under `src/` is TypeScript with `strict` enabled; there is no
JavaScript source left. `tsx` runs the sources in development, `npm run build`
emits `dist/*.js`, and the loader accepts both extensions so the same code boots
from either place.

`npm run typecheck` checks `src/` only; tests run through `tsx`, which strips
types without type-checking them.
