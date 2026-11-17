/* ============================================================
   Home Server — mockup logic
   Login scratch: 12345
   Struttura: dashboard → servizio → sotto-sezioni (tab)
   ============================================================ */

const SCRATCH_PASSWORD = "12345";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ------------------------------------------------------------
   Dati simulati
   ------------------------------------------------------------ */

const state = {
  cpu: 24,
  ram: 41,
  disk: 27,
  temp: 48,
  rx: 1.8,
  tx: 0.4,
  uptimeSeconds: 12 * 86400 + 7 * 3600 + 42 * 60 + 13,
  history: Array.from({ length: 32 }, () => 20 + Math.random() * 18),
};

const shares = [
  { name: "Media", path: "/mnt/ssd/media", size: "42.1 GB", readonly: false },
  { name: "Backup", path: "/mnt/ssd/backup", size: "18.6 GB", readonly: false },
  { name: "Documenti", path: "/mnt/ssd/docs", size: "4.2 GB", readonly: true },
  { name: "Foto", path: "/mnt/ssd/photos", size: "9.8 GB", readonly: false },
];

const systemUnits = [
  { name: "flask", description: "API e automazioni", status: "running", autostart: true },
  { name: "nginx", description: "Reverse proxy", status: "running", autostart: true },
  { name: "docker", description: "Container", status: "running", autostart: true },
  { name: "samba", description: "Condivisione file", status: "running", autostart: true },
  { name: "plex", description: "Media server", status: "stopped", autostart: false },
  { name: "cron", description: "Attività pianificate", status: "running", autostart: true },
];

/* Libreria media finta: immagini da picsum.photos (seed stabile) */
const MEDIA_SEED = [
  ["Frieren", "Anime", 2023],
  ["Chainsaw Man", "Anime", 2022],
  ["Dolomiti", "Foto", 2024],
  ["Kyoto", "Foto", 2023],
  ["Interstellar", "Video", 2014],
  ["Jujutsu Kaisen", "Anime", 2020],
  ["Lisbona", "Foto", 2022],
  ["Blade Runner 2049", "Video", 2017],
  ["One Piece", "Anime", 1999],
  ["Islanda", "Foto", 2024],
  ["Dune", "Video", 2021],
  ["Vinland Saga", "Anime", 2019],
  ["New York", "Foto", 2021],
  ["Spirited Away", "Video", 2001],
  ["Mob Psycho 100", "Anime", 2016],
  ["Norvegia", "Foto", 2023],
  ["Your Name", "Anime", 2016],
  ["Oppenheimer", "Video", 2023],
  ["Portogallo", "Foto", 2022],
  ["Attack on Titan", "Anime", 2013],
  ["Sicilia", "Foto", 2024],
  ["The Batman", "Video", 2022],
  ["Steins;Gate", "Anime", 2011],
  ["Tokyo", "Foto", 2023],
];

const MEDIA_ITEMS = MEDIA_SEED.map(([title, type, year], index) => ({
  id: index + 1,
  title,
  type,
  year,
  size: `${(0.8 + (index % 9) * 0.42).toFixed(1)} GB`,
  seed: `home-media-${index + 1}`,
}));

const media = { query: "", filter: "all", page: 1, perPage: 8 };

/* ------------------------------------------------------------
   Utilità
   ------------------------------------------------------------ */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const jitter = (v, amount, min, max) => clamp(v + (Math.random() - 0.5) * amount, min, max);

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
  );

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${days}g ${hours}h ${minutes}m`;
}

function liveValue(key) {
  switch (key) {
    case "cpu": return `${Math.round(state.cpu)}%`;
    case "ram": return `${Math.round(state.ram)}%`;
    case "temp": return `${Math.round(state.temp)} °C`;
    case "uptime": return formatUptime(state.uptimeSeconds);
    case "rx": return `${state.rx.toFixed(1)} MB/s`;
    case "tx": return `${state.tx.toFixed(1)} MB/s`;
    case "shares": return String(shares.length);
    default: return "—";
  }
}

function barValue(key) {
  switch (key) {
    case "cpu": return state.cpu;
    case "ram": return state.ram;
    case "disk": return state.disk;
    case "temp": return (state.temp / 85) * 100;
    case "storage": return 82;
    default: return 0;
  }
}

/* ------------------------------------------------------------
   Sfondo notte: Vanta NET
   ------------------------------------------------------------ */

let vantaEffect = null;

function initNightBackground() {
  const el = $("#vanta-bg");
  if (!el || vantaEffect) return;

  if (window.VANTA && typeof window.VANTA.NET === "function") {
    vantaEffect = window.VANTA.NET({
      el,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: 0x4f8cff,
      backgroundColor: 0x050a17,
      points: 16,
      maxDistance: 26,
      spacing: 15,
      showDots: true,
    });
  } else {
    el.classList.add("is-fallback");
  }
}

function destroyNightBackground() {
  const el = $("#vanta-bg");
  if (vantaEffect) {
    vantaEffect.destroy();
    vantaEffect = null;
  }
  if (el) el.classList.remove("is-fallback");
}

/* ------------------------------------------------------------
   Schermate e login
   ------------------------------------------------------------ */

function showScreen(id) {
  $$(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
  document.body.style.overflow = id === "screen-login" ? "hidden" : "";

  if (id === "screen-login") {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(initNightBackground);
    });
  } else {
    destroyNightBackground();
  }
}

const loginForm = $("#login-form");
const passwordInput = $("#password");
const loginError = $("#login-error");
const loginCard = $("#login-card");
const loginSubmit = $("#login-submit");

$("#toggle-password").addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  $("#toggle-password").setAttribute(
    "aria-label",
    isPassword ? "Nascondi password" : "Mostra password"
  );
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginError.textContent = "";

  if (passwordInput.value.trim() !== SCRATCH_PASSWORD) {
    loginError.textContent = "Password errata. Riprova.";
    loginCard.classList.remove("is-shaking");
    void loginCard.offsetWidth;
    loginCard.classList.add("is-shaking");
    passwordInput.select();
    return;
  }

  loginSubmit.disabled = true;
  loginSubmit.querySelector("span").textContent = "Accesso…";

  window.setTimeout(() => {
    loginSubmit.disabled = false;
    loginSubmit.querySelector("span").textContent = "Entra";
    passwordInput.value = "";
    showScreen("screen-home");
    startDashboard();
    showView("dashboard");
  }, 450);
});

$("#logout").addEventListener("click", () => {
  stopDashboard();
  showScreen("screen-login");
  window.setTimeout(() => passwordInput.focus(), 250);
});

/* ------------------------------------------------------------
   Menu a scomparsa
   ------------------------------------------------------------ */

const drawer = $("#drawer");
const drawerBackdrop = $("#drawer-backdrop");
const menuToggle = $("#menu-toggle");

function openDrawer() {
  drawer.classList.add("is-open");
  drawerBackdrop.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  menuToggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
}

function closeDrawer() {
  drawer.classList.remove("is-open");
  drawerBackdrop.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  menuToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

menuToggle.addEventListener("click", () => {
  drawer.classList.contains("is-open") ? closeDrawer() : openDrawer();
});

$("#drawer-close").addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);
$("#drawer-logout").addEventListener("click", () => {
  closeDrawer();
  $("#logout").click();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) closeDrawer();
});

/* ------------------------------------------------------------
   Orologio e toast
   ------------------------------------------------------------ */

function updateClock() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(now);
  const time = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  $("#clock").textContent = `${date} · ${time}`;
}

updateClock();
window.setInterval(updateClock, 15_000);

let toastTimer = null;

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2_400);
}

/* ------------------------------------------------------------
   Tema chiaro/scuro (home)
   ------------------------------------------------------------ */

const THEME_KEY = "home-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    /* storage non disponibile: il tema vale solo per la sessione */
  }

  const toggle = $("#theme-toggle");
  if (toggle) {
    const dark = theme === "dark";
    toggle.setAttribute("aria-pressed", String(dark));
    toggle.setAttribute("aria-label", dark ? "Attiva tema chiaro" : "Attiva tema scuro");
  }
}

applyTheme(document.documentElement.dataset.theme || "light");

$("#theme-toggle")?.addEventListener("click", () => {
  applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

/* ------------------------------------------------------------
   Modale / dialog con stati
   ------------------------------------------------------------ */

const MODAL_ICONS = {
  success: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.3 4.3L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  error: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`,
};

const modal = $("#modal");
const modalCard = $(".modal-card", modal);
const modalIcon = $("#modal-icon");
const modalTitle = $("#modal-title");
const modalText = $("#modal-text");
const modalActions = $("#modal-actions");

let modalTimer = null;
let lastFocused = null;

function setModalState({ state = "loading", title = "", text = "", actions = [] }) {
  modalIcon.className = `modal-icon ${state}`;
  modalIcon.innerHTML = MODAL_ICONS[state] || "";
  modalTitle.textContent = title;
  modalText.textContent = text;

  modalActions.innerHTML = actions
    .map(
      (action) =>
        `<button class="${action.variant || "btn-plain"}" data-modal-action="${action.id}">${action.label}</button>`
    )
    .join("");

  $$("[data-modal-action]", modalActions).forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = actions.find((a) => a.id === btn.dataset.modalAction);
      action?.onClick?.();
    });
  });
}

function openModal() {
  lastFocused = document.activeElement;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => modalCard.focus(), 40);
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  window.clearTimeout(modalTimer);
  modalTimer = null;
  lastFocused?.focus?.();
}

/**
 * Mostra un dialog in stato "caricamento" e dopo `delay` ms
 * passa a successo o errore.
 */
function runActionModal({
  title,
  loadingText,
  successTitle = "Operazione completata",
  successText = "",
  errorTitle = "Operazione non riuscita",
  errorText = "",
  outcome = "success",
  delay = 1_400,
  onDone,
}) {
  closeModal();
  setModalState({ state: "loading", title, text: loadingText });
  openModal();

  modalTimer = window.setTimeout(() => {
    const ok = outcome === "success";

    setModalState({
      state: ok ? "success" : "error",
      title: ok ? successTitle : errorTitle,
      text: ok ? successText : errorText,
      actions: [{ id: "close", label: "Chiudi", variant: "btn-secondary", onClick: closeModal }],
    });

    onDone?.(ok);
  }, delay);
}

$("#modal-close").addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
});

/* ============================================================
   Frammenti condivisi
   ============================================================ */

function metricCard({ label, icon, live, bar, sub, value, valueId }) {
  const content = live
    ? `<span class="metric-value" data-live="${live}">—</span>`
    : `<span class="metric-value"${valueId ? ` id="${valueId}"` : ""} style="font-size:16px">${value ?? "—"}</span>`;

  return `
    <article class="card metric">
      <div class="metric-head">
        <span class="metric-icon">${icon}</span>
        <span class="metric-label">${label}</span>
        ${content}
      </div>
      ${bar ? `<div class="bar"><span data-bar="${bar}"></span></div>` : ""}
      <p class="metric-sub">${sub}</p>
    </article>`;
}

function cpuChartCard() {
  return `
    <article class="card chart-card">
      <div class="card-head">
        <div>
          <h3>Carico CPU</h3>
          <p class="muted small">ultimi 2 minuti</p>
        </div>
        <span class="legend"><span class="legend-dot"></span> cpu %</span>
      </div>
      <svg id="cpu-chart" viewBox="0 0 620 180" preserveAspectRatio="none" role="img" aria-label="Grafico carico CPU">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2f7df6" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#2f7df6" stop-opacity="0" />
          </linearGradient>
        </defs>
        <path id="chart-area" fill="url(#chart-fill)" d=""></path>
        <polyline id="chart-line" fill="none" stroke="#2f7df6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points=""></polyline>
      </svg>
    </article>`;
}

function logCard(title = "Ultimi log", path = "/var/log") {
  return `
    <article class="card">
      <div class="card-head"><h3>${title}</h3><span class="tag">${path}</span></div>
      <pre class="logbox">[08:12:04] backup.service: snapshot completed (2.1 GB)
[08:12:05] backup.service: retention applied, 7 copies kept
[07:45:01] flask.service: reloaded by systemd
[03:00:00] cleanup.timer: removed 1.2 GB of logs
[02:00:00] apt-daily.service: 12 packages upgraded</pre>
    </article>`;
}

/* ============================================================
   Servizio: Raspberry Pi
   ============================================================ */

function raspberryMetrics() {
  return `
    <div class="metrics">
      ${metricCard({ label: "CPU", icon: "◐", live: "cpu", bar: "cpu", sub: "4 core · ARM Cortex-A72" })}
      ${metricCard({ label: "Memoria", icon: "▤", live: "ram", bar: "ram", sub: "8 GB LPDDR4" })}
      ${metricCard({ label: "Disco", icon: "◧", live: "diskText", bar: "disk", sub: "SSD 118 GB" })}
      ${metricCard({ label: "Temperatura", icon: "❋", live: "temp", bar: "temp", sub: "soglia ventola 60 °C" })}
    </div>`;
}

function raspberryOverview() {
  return `
    ${raspberryMetrics()}

    <div class="grid-2" style="margin-top: 18px">
      ${cpuChartCard()}

      <article class="card">
        <div class="card-head"><h3>Controlli</h3><span class="tag">system</span></div>

        <div class="field">
          <span>Soglia ventola</span>
          <div class="range-row">
            <input type="range" id="fan-threshold" min="40" max="80" step="1" value="60" />
            <output id="fan-threshold-out">60 °C</output>
          </div>
          <p class="muted small">la ventola parte sopra questa temperatura</p>
        </div>

        <div class="field" style="margin-top: 18px">
          <span>Opzioni</span>
          <label class="toggle">
            <input type="checkbox" id="eco-mode" checked />
            <span class="track"></span>
            Risparmio energetico notturno
          </label>
          <label class="toggle" style="margin-top: 8px">
            <input type="checkbox" id="led-off" />
            <span class="track"></span>
            Spegni LED di stato
          </label>
        </div>

        <div class="card-actions">
          <button class="btn-danger" id="reboot-pi">Riavvia</button>
          <button class="btn-plain" id="shutdown-pi">Spegni</button>
        </div>
      </article>
    </div>

    <article class="card" style="margin-top: 18px">
      <div class="card-head"><h3>Processi principali</h3><span class="muted small">top 4 per RAM</span></div>
      <table class="table">
        <thead><tr><th>Processo</th><th>PID</th><th>CPU</th><th>RAM</th></tr></thead>
        <tbody>
          <tr><td>python3 flaskMain.py</td><td class="mono">1842</td><td>3.1%</td><td>142 MB</td></tr>
          <tr><td>dockerd</td><td class="mono">912</td><td>1.4%</td><td>210 MB</td></tr>
          <tr><td>nginx</td><td class="mono">733</td><td>0.3%</td><td>18 MB</td></tr>
          <tr><td>smbd</td><td class="mono">1105</td><td>0.2%</td><td>46 MB</td></tr>
        </tbody>
      </table>
    </article>`;
}

function raspberryUnits() {
  const rows = systemUnits
    .map(
      (unit, index) => `
      <tr>
        <td class="mono">${unit.name}</td>
        <td>${unit.description}</td>
        <td><span class="tag ${unit.status === "running" ? "ok" : "warn"}">${unit.status}</span></td>
        <td>
          <label class="toggle">
            <input type="checkbox" data-unit-autostart="${index}" ${unit.autostart ? "checked" : ""} />
            <span class="track"></span>
          </label>
        </td>
        <td><button class="btn-mini" data-unit-restart="${index}">Riavvia</button></td>
      </tr>`
    )
    .join("");

  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>Servizi di sistema</h3>
          <p class="muted small">systemd · ${systemUnits.filter(u => u.status === "running").length} attivi</p>
        </div>
        <span class="tag">systemctl</span>
      </div>
      <table class="table">
        <thead><tr><th>Unita</th><th>Descrizione</th><th>Stato</th><th>Avvio auto</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </article>`;
}

function raspberryServicesTab() {
  return `
    ${raspberryUnits()}
    <div style="margin-top: 18px">${logCard("Log di sistema", "/var/log/syslog")}</div>`;
}

function renderRaspberryTab(tab) {
  if (tab === "overall") return raspberryOverview();
  if (tab === "services") return raspberryServicesTab();
  return `${raspberryOverview()}<div style="margin-top: 18px">${raspberryServicesTab()}</div>`;
}

function mountRaspberryTab() {
  const threshold = $("#fan-threshold");
  if (threshold) {
    const out = $("#fan-threshold-out");
    threshold.addEventListener("input", () => {
      out.textContent = `${threshold.value} °C`;
    });
  }

  $("#eco-mode")?.addEventListener("change", (e) =>
    showToast(`Risparmio energetico ${e.target.checked ? "attivato" : "disattivato"}`)
  );
  $("#led-off")?.addEventListener("change", (e) =>
    showToast(`LED di stato ${e.target.checked ? "spenti" : "accesi"}`)
  );

  $("#reboot-pi")?.addEventListener("click", () => {
    runActionModal({
      title: "Riavvio del Raspberry",
      loadingText: "Invio del comando a systemd…",
      successTitle: "Riavvio avviato",
      successText: "Il Raspberry tornerà online tra circa 30 secondi.",
      errorTitle: "Riavvio non riuscito",
      errorText: "Il servizio non ha risposto. Controlla la connessione e riprova.",
      outcome: "success",
      onDone: (ok) => ok && showToast("Riavvio avviato ✓"),
    });
  });

  $("#shutdown-pi")?.addEventListener("click", () => {
    runActionModal({
      title: "Spegnimento del Raspberry",
      loadingText: "Verifica dei processi attivi…",
      successTitle: "Spegnimento avviato",
      successText: "Il dispositivo si spegnerà tra pochi secondi.",
      errorTitle: "Spegnimento non riuscito",
      errorText: "Operazione rifiutata: ci sono backup in corso.",
      outcome: "error",
    });
  });

  const unitsBody = $("#tab-content");
  if (unitsBody) {
    unitsBody.onchange = (event) => {
      const input = event.target.closest("[data-unit-autostart]");
      if (!input) return;
      const unit = systemUnits[Number(input.dataset.unitAutostart)];
      unit.autostart = input.checked;
      showToast(`${unit.name}: avvio automatico ${input.checked ? "attivato" : "disattivato"}`);
    };

    unitsBody.onclick = (event) => {
      const btn = event.target.closest("[data-unit-restart]");
      if (!btn) return;
      const unit = systemUnits[Number(btn.dataset.unitRestart)];
      showToast(`${unit.name}: riavvio simulato ✓`);
    };
  }
}

/* ============================================================
   Servizio: AniList
   ============================================================ */

function anilistStats() {
  return `
    <div class="metrics">
      ${metricCard({ label: "Ultima sync", icon: "⏱", value: "12 min fa", valueId: "anilist-last", sub: "prossima automatica tra 48 min" })}
      ${metricCard({ label: "Anime in lista", icon: "◈", value: "248", sub: "12 in visione · 236 completati" })}
      ${metricCard({ label: "Errori 24h", icon: "✓", value: "0", sub: "token valido" })}
    </div>`;
}

function anilistSettings() {
  return `
    <article class="card">
      <div class="card-head"><h3>Impostazioni</h3><span class="tag">account</span></div>
      <form id="anilist-form">
        <div class="form-grid">
          <label class="field">
            <span>Username AniList</span>
            <input type="text" value="TechAle" autocomplete="username" />
          </label>
          <label class="field">
            <span>Access token</span>
            <input type="password" value="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.demo" />
            <p class="muted hint-line">salvato in server/.env, mai nel repository</p>
          </label>
        </div>

        <div class="field" style="margin-top: 18px">
          <span>Intervallo di sincronizzazione</span>
          <div class="range-row">
            <input type="range" id="sync-interval" min="15" max="240" step="15" value="60" />
            <output id="sync-interval-out">60 min</output>
          </div>
        </div>

        <div class="field" style="margin-top: 16px">
          <label class="toggle">
            <input type="checkbox" id="anilist-notify" checked />
            <span class="track"></span>
            Notifica nuovi episodi
          </label>
        </div>

        <div class="card-actions">
          <button type="submit" class="btn-secondary">Salva</button>
          <button type="button" class="btn-plain" id="anilist-sync">Sincronizza ora</button>
        </div>
      </form>
    </article>`;
}

function anilistActivity() {
  return `
    <article class="card">
      <div class="card-head"><h3>Attività recente</h3><span class="muted small">oggi</span></div>
      <ul class="timeline">
        <li><span class="time">08:42</span> 3 episodi aggiornati <span class="tag ok">ok</span></li>
        <li><span class="time">07:42</span> Sync completata in 1.8s <span class="tag ok">ok</span></li>
        <li><span class="time">06:42</span> Nessuna modifica <span class="tag">skip</span></li>
        <li><span class="time">05:42</span> Token rinnovato <span class="tag ok">ok</span></li>
      </ul>
    </article>`;
}

function renderAnilistTab(tab) {
  if (tab === "sync") {
    return `${anilistStats()}<div style="margin-top: 18px">${anilistActivity()}</div>`;
  }
  if (tab === "settings") return anilistSettings();
  return `
    ${anilistStats()}
    <div class="grid-2" style="margin-top: 18px">
      ${anilistSettings()}
      ${anilistActivity()}
    </div>`;
}

function mountAnilistTab() {
  const interval = $("#sync-interval");
  if (interval) {
    const out = $("#sync-interval-out");
    interval.addEventListener("input", () => {
      out.textContent = `${interval.value} min`;
    });
  }

  $("#anilist-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Impostazioni AniList salvate ✓");
  });

  $("#anilist-notify")?.addEventListener("change", (e) =>
    showToast(`Notifiche ${e.target.checked ? "attivate" : "disattivate"}`)
  );

  const syncBtn = $("#anilist-sync");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      syncBtn.disabled = true;
      syncBtn.textContent = "Sincronizzazione…";
      const timer = window.setTimeout(() => {
        syncBtn.disabled = false;
        syncBtn.textContent = "Sincronizza ora";
        const last = $("#anilist-last");
        if (last) last.textContent = "adesso";
        showToast("AniList sincronizzato · 248 anime ✓");
      }, 1_300);
      viewTimers.push(timer);
    });
  }
}

/* ============================================================
   Servizio: File Server
   ============================================================ */

function filesStorage() {
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>Spazio disco</h3>
          <p class="muted small">SSD 118 GB · 82% utilizzato</p>
        </div>
        <span class="status warn"><i></i>quasi pieno</span>
      </div>
      <div class="bar"><span data-bar="storage"></span></div>
      <p class="muted small" style="margin-top: 10px">96.7 GB usati · 21.3 GB liberi</p>
    </article>`;
}

function filesVolumes() {
  return `
    <article class="card">
      <div class="card-head"><h3>Volumi</h3><span class="muted small">2 mount</span></div>
      <table class="table">
        <thead><tr><th>Mount</th><th>Dispositivo</th><th>Usato</th><th>Stato</th></tr></thead>
        <tbody>
          <tr><td class="mono">/mnt/ssd</td><td class="mono">/dev/sda1</td><td>96.7 / 118 GB</td><td><span class="tag warn">82%</span></td></tr>
          <tr><td class="mono">/mnt/usb</td><td class="mono">/dev/sdb1</td><td>310 / 931 GB</td><td><span class="tag ok">33%</span></td></tr>
        </tbody>
      </table>
    </article>`;
}

function filesForm() {
  return `
    <article class="card">
      <div class="card-head"><h3>Nuova condivisione</h3><span class="tag">samba</span></div>
      <form id="share-form">
        <div class="form-grid">
          <label class="field">
            <span>Nome</span>
            <input type="text" name="share-name" placeholder="es. Musica" required />
          </label>
          <label class="field">
            <span>Percorso</span>
            <input type="text" name="share-path" placeholder="/mnt/ssd/musica" required />
          </label>
          <div class="field">
            <span>Permessi</span>
            <label class="toggle" style="padding-top: 8px">
              <input type="checkbox" name="share-readonly" />
              <span class="track"></span>
              Sola lettura
            </label>
          </div>
        </div>
        <div class="card-actions">
          <button type="submit" class="btn-secondary">Aggiungi condivisione</button>
        </div>
      </form>
    </article>`;
}

function filesTable() {
  return `
    <article class="card">
      <div class="card-head"><h3>Condivisioni</h3><span class="muted small" id="shares-count">${shares.length} attive</span></div>
      <table class="table">
        <thead><tr><th>Nome</th><th>Percorso</th><th>Dimensione</th><th>Sola lettura</th><th></th></tr></thead>
        <tbody id="shares-body">${sharesTable()}</tbody>
      </table>
    </article>`;
}

function renderFilesTab(tab) {
  if (tab === "storage") return `${filesStorage()}<div style="margin-top: 18px">${filesVolumes()}</div>`;
  if (tab === "shares") return `${filesForm()}<div style="margin-top: 18px">${filesTable()}</div>`;
  return `
    ${filesStorage()}
    <div style="margin-top: 18px">${filesForm()}</div>
    <div style="margin-top: 18px">${filesTable()}</div>`;
}

function mountFilesTab() {
  const refresh = () => {
    const body = $("#shares-body");
    if (body) body.innerHTML = sharesTable();
    const count = $("#shares-count");
    if (count) count.textContent = `${shares.length} attive`;
  };

  $("#share-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements["share-name"].value.trim();
    const path = form.elements["share-path"].value.trim();
    const readonly = form.elements["share-readonly"].checked;
    if (!name || !path) return;

    shares.push({ name, path, size: "0 B", readonly });
    refresh();
    form.reset();
    showToast(`Condivisione "${name}" aggiunta ✓`);
  });

  $("#shares-body")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-share-delete]");
    if (!btn) return;
    const index = Number(btn.dataset.shareDelete);
    const removed = shares[index];
    shares.splice(index, 1);
    refresh();
    showToast(`Condivisione "${removed.name}" rimossa`);
  });

  $("#shares-body")?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-share-readonly]");
    if (!input) return;
    shares[Number(input.dataset.shareReadonly)].readonly = input.checked;
    showToast(`Sola lettura ${input.checked ? "attivata" : "disattivata"}`);
  });
}

/* ============================================================
   Servizio: Backup
   ============================================================ */

function backupStats() {
  return `
    <div class="metrics">
      ${metricCard({ label: "Ultimo backup", icon: "✓", value: "oggi 03:00", valueId: "backup-last", sub: "completato in 4m 12s" })}
      ${metricCard({ label: "Prossimo", icon: "⏱", value: "domani 03:00", sub: "pianificazione giornaliera" })}
      ${metricCard({ label: "Dimensione", icon: "⛁", value: "2.1 GB", sub: "7 copie conservate" })}
    </div>`;
}

function backupForm() {
  return `
    <article class="card">
      <div class="card-head"><h3>Pianificazione</h3><span class="tag">automatico</span></div>
      <form id="backup-form">
        <div class="form-grid">
          <label class="field">
            <span>Ora di esecuzione</span>
            <input type="time" name="backup-time" value="03:00" />
          </label>
          <label class="field">
            <span>Destinazione</span>
            <select name="backup-destination">
              <option>USB esterna · /mnt/usb</option>
              <option>SSD interno · /mnt/ssd/backup</option>
              <option>NAS · 192.168.1.10</option>
            </select>
          </label>
          <label class="field">
            <span>Conservazione</span>
            <div class="range-row">
              <input type="range" id="retention" name="retention" min="1" max="30" step="1" value="7" />
              <output id="retention-out">7 gg</output>
            </div>
          </label>
        </div>

        <div class="field" style="margin-top: 16px">
          <label class="toggle">
            <input type="checkbox" id="backup-notify" checked />
            <span class="track"></span>
            Notifica al termine
          </label>
        </div>

        <div class="card-actions">
          <button type="submit" class="btn-secondary">Salva pianificazione</button>
          <button type="button" class="btn-plain" id="backup-run">Esegui backup ora</button>
        </div>
      </form>

      <div class="progress-wrap" id="backup-progress-wrap" hidden>
        <div class="progress"><span id="backup-progress"></span></div>
        <p class="muted small" id="backup-progress-label">Preparazione…</p>
      </div>
    </article>`;
}

function backupHistory() {
  return `
    <article class="card">
      <div class="card-head"><h3>Storico</h3><span class="muted small">ultimi 4</span></div>
      <table class="table">
        <thead><tr><th>Data</th><th>Durata</th><th>Dimensione</th><th>Esito</th></tr></thead>
        <tbody>
          <tr><td>oggi 03:00</td><td>4m 12s</td><td>2.1 GB</td><td><span class="tag ok">ok</span></td></tr>
          <tr><td>ieri 03:00</td><td>4m 05s</td><td>2.1 GB</td><td><span class="tag ok">ok</span></td></tr>
          <tr><td>15 nov 03:00</td><td>3m 58s</td><td>2.0 GB</td><td><span class="tag ok">ok</span></td></tr>
          <tr><td>14 nov 03:00</td><td>4m 20s</td><td>2.1 GB</td><td><span class="tag ok">ok</span></td></tr>
        </tbody>
      </table>
    </article>`;
}

function renderBackupTab(tab) {
  if (tab === "schedule") return `${backupStats()}<div style="margin-top: 18px">${backupForm()}</div>`;
  if (tab === "history") return backupHistory();
  return `
    ${backupStats()}
    <div style="margin-top: 18px">${backupForm()}</div>
    <div style="margin-top: 18px">${backupHistory()}</div>`;
}

function mountBackupTab() {
  const retention = $("#retention");
  if (retention) {
    const out = $("#retention-out");
    retention.addEventListener("input", () => {
      out.textContent = `${retention.value} gg`;
    });
  }

  $("#backup-notify")?.addEventListener("change", (e) =>
    showToast(`Notifiche ${e.target.checked ? "attivate" : "disattivate"}`)
  );

  $("#backup-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("Pianificazione backup salvata ✓");
  });

  const runBtn = $("#backup-run");
  if (!runBtn) return;

  const wrap = $("#backup-progress-wrap");
  const bar = $("#backup-progress");
  const label = $("#backup-progress-label");

  runBtn.addEventListener("click", () => {
    if (runBtn.disabled) return;

    runBtn.disabled = true;
    wrap.hidden = false;
    bar.style.width = "0%";
    label.textContent = "Copia in corso…";

    let progress = 0;
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + 4 + Math.random() * 6);
      bar.style.width = `${progress}%`;

      if (progress >= 100) {
        window.clearInterval(timer);
        label.textContent = "Backup completato";
        runBtn.disabled = false;
        const last = $("#backup-last");
        if (last) last.textContent = "adesso";
        showToast("Backup completato · 2.1 GB ✓");
      }
    }, 180);

    viewTimers.push(timer);
  });
}

/* ============================================================
   Servizio: Media (galleria, ricerca, filtri, paginazione)
   ============================================================ */

function mediaFiltered() {
  const query = media.query.trim().toLowerCase();

  return MEDIA_ITEMS.filter((item) => {
    const matchesFilter = media.filter === "all" || item.type === media.filter;
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      String(item.year).includes(query);
    return matchesFilter && matchesQuery;
  });
}

function mediaStats() {
  const photos = MEDIA_ITEMS.filter((i) => i.type === "Foto").length;
  const videos = MEDIA_ITEMS.filter((i) => i.type === "Video").length;
  const anime = MEDIA_ITEMS.filter((i) => i.type === "Anime").length;

  return `
    <div class="metrics">
      ${metricCard({ label: "Elementi", icon: "▦", value: String(MEDIA_ITEMS.length), sub: "libreria locale" })}
      ${metricCard({ label: "Foto", icon: "◫", value: String(photos), sub: "JPEG e HEIC" })}
      ${metricCard({ label: "Video", icon: "▷", value: String(videos), sub: "MKV e MP4" })}
      ${metricCard({ label: "Anime", icon: "◈", value: String(anime), sub: "serie e film" })}
    </div>`;
}

function mediaToolbar() {
  const filters = [
    ["all", "Tutti"],
    ["Foto", "Foto"],
    ["Video", "Video"],
    ["Anime", "Anime"],
  ];

  return `
    <div class="media-toolbar">
      <div class="media-search">
        <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/>
          <path d="M16 16l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <input type="text" id="media-search" placeholder="Cerca per titolo, tipo o anno…" value="${esc(media.query)}" />
      </div>
      <div class="chips">
        ${filters
          .map(
            ([value, label]) => `
          <button class="chip ${media.filter === value ? "is-active" : ""}"
                  data-media-filter="${value}">${label}</button>`
          )
          .join("")}
      </div>
    </div>`;
}

function mediaGridHtml() {
  const list = mediaFiltered();
  const pages = Math.max(1, Math.ceil(list.length / media.perPage));
  if (media.page > pages) media.page = pages;

  const start = (media.page - 1) * media.perPage;
  const items = list.slice(start, start + media.perPage);

  if (!items.length) {
    return `
      <div class="media-empty">
        <strong>Nessun risultato</strong>
        Nessun elemento corrisponde alla ricerca.
        <div style="margin-top: 14px">
          <button class="btn-plain" data-media-reset>Reimposta filtri</button>
        </div>
      </div>`;
  }

  return items
    .map(
      (item) => `
      <article class="card media-card">
        <div class="media-thumb-wrap">
          <img class="media-thumb"
               src="https://picsum.photos/seed/${item.seed}/480/300"
               alt="${esc(item.title)}" loading="lazy" />
        </div>
        <div class="media-body">
          <h4>${esc(item.title)}</h4>
          <div class="media-meta">
            <span class="tag">${item.type}</span>
            <span>${item.year} · ${item.size}</span>
          </div>
        </div>
      </article>`
    )
    .join("");
}

function mediaPagerHtml() {
  const list = mediaFiltered();
  const pages = Math.max(1, Math.ceil(list.length / media.perPage));
  const start = list.length ? (media.page - 1) * media.perPage + 1 : 0;
  const end = Math.min(list.length, media.page * media.perPage);

  const buttons = [];
  buttons.push(
    `<button class="page-btn" data-media-page="${media.page - 1}" ${media.page === 1 ? "disabled" : ""}>‹</button>`
  );
  for (let page = 1; page <= pages; page += 1) {
    buttons.push(
      `<button class="page-btn ${page === media.page ? "is-active" : ""}" data-media-page="${page}">${page}</button>`
    );
  }
  buttons.push(
    `<button class="page-btn" data-media-page="${media.page + 1}" ${media.page === pages ? "disabled" : ""}>›</button>`
  );

  return `<span>${start}–${end} di ${list.length}</span><div class="pager">${buttons.join("")}</div>`;
}

function mediaGalleryCard() {
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>Libreria</h3>
          <p class="muted small" id="media-count">${mediaFiltered().length} elementi</p>
        </div>
        <span class="tag">/mnt/ssd/media</span>
      </div>

      ${mediaToolbar()}

      <div class="gallery" id="media-results">${mediaGridHtml()}</div>
      <div class="pagination" id="media-pagination">${mediaPagerHtml()}</div>
    </article>`;
}

function mediaSettingsCard() {
  return `
    <article class="card">
      <div class="card-head"><h3>Impostazioni libreria</h3><span class="tag">media</span></div>
      <div class="form-grid">
        <label class="field">
          <span>Percorso</span>
          <input type="text" value="/mnt/ssd/media" />
        </label>
        <label class="field">
          <span>Scansione automatica</span>
          <select>
            <option>Ogni ora</option>
            <option>Ogni 6 ore</option>
            <option>Manuale</option>
          </select>
        </label>
        <div class="field">
          <span>Opzioni</span>
          <label class="toggle" style="padding-top: 8px">
            <input type="checkbox" id="media-thumbs" checked />
            <span class="track"></span>
            Genera miniature
          </label>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn-secondary" id="media-scan">Avvia scansione</button>
        <button type="button" class="btn-plain" id="media-save">Salva</button>
      </div>
    </article>`;
}

function renderMediaTab(tab) {
  if (tab === "gallery") return mediaGalleryCard();
  if (tab === "settings") return mediaSettingsCard();
  return `
    ${mediaStats()}
    <div style="margin-top: 18px">${mediaGalleryCard()}</div>
    <div style="margin-top: 18px">${mediaSettingsCard()}</div>`;
}

function refreshMedia() {
  const results = $("#media-results");
  if (results) results.innerHTML = mediaGridHtml();

  const pagination = $("#media-pagination");
  if (pagination) pagination.innerHTML = mediaPagerHtml();

  const count = $("#media-count");
  if (count) count.textContent = `${mediaFiltered().length} elementi`;

  $$("[data-media-filter]").forEach((chip) =>
    chip.classList.toggle("is-active", chip.dataset.mediaFilter === media.filter)
  );
}

function mountMediaTab() {
  const content = $("#tab-content");
  if (!content) return;

  content.oninput = (event) => {
    if (event.target.id !== "media-search") return;
    media.query = event.target.value;
    media.page = 1;
    refreshMedia();
  };

  content.onchange = (event) => {
    if (event.target.id === "media-thumbs") {
      showToast(`Miniature ${event.target.checked ? "attivate" : "disattivate"}`);
    }
  };

  content.onclick = (event) => {
    const chip = event.target.closest("[data-media-filter]");
    if (chip) {
      media.filter = chip.dataset.mediaFilter;
      media.page = 1;
      refreshMedia();
      return;
    }

    const pageBtn = event.target.closest("[data-media-page]");
    if (pageBtn && !pageBtn.disabled) {
      const pages = Math.max(1, Math.ceil(mediaFiltered().length / media.perPage));
      media.page = Math.min(Math.max(1, Number(pageBtn.dataset.mediaPage)), pages);
      refreshMedia();
      return;
    }

    if (event.target.closest("[data-media-reset]")) {
      media.query = "";
      media.filter = "all";
      media.page = 1;
      const input = $("#media-search");
      if (input) input.value = "";
      refreshMedia();
      return;
    }

    if (event.target.closest("#media-scan")) {
      runActionModal({
        title: "Scansione libreria",
        loadingText: "Analisi di /mnt/ssd/media…",
        successTitle: "Scansione completata",
        successText: "24 elementi trovati, 3 nuovi. Miniature aggiornate.",
        errorTitle: "Scansione non riuscita",
        errorText: "La cartella non è accessibile.",
        outcome: "success",
        onDone: (ok) => ok && showToast("Libreria aggiornata ✓"),
      });
      return;
    }

    if (event.target.closest("#media-save")) {
      showToast("Impostazioni libreria salvate ✓");
    }
  };
}

/* ============================================================
   Definizione dei servizi
   ============================================================ */

const SERVICES = [
  {
    id: "raspberry",
    name: "Raspberry Pi",
    icon: "◐",
    subtitle: "Sistema · raspberrypi",
    status: "ok",
    statusLabel: "online",
    summary: [
      { label: "CPU", live: "cpu" },
      { label: "RAM", live: "ram" },
      { label: "Temp", live: "temp" },
      { label: "Uptime", live: "uptime" },
    ],
    tabs: [
      { id: "all", label: "All" },
      { id: "overall", label: "Overall" },
      { id: "services", label: "Services" },
    ],
    renderTab: renderRaspberryTab,
    mountTab: mountRaspberryTab,
  },
  {
    id: "anilist",
    name: "AniList",
    icon: "◈",
    subtitle: "Bot · sincronizzazione lista",
    status: "ok",
    statusLabel: "online",
    summary: [
      { label: "Ultima sync", value: "12 min fa" },
      { label: "Anime in lista", value: "248" },
      { label: "Errori 24h", value: "0" },
      { label: "Coda", value: "0" },
    ],
    tabs: [
      { id: "all", label: "All" },
      { id: "sync", label: "Sincronizzazione" },
      { id: "settings", label: "Impostazioni" },
    ],
    renderTab: renderAnilistTab,
    mountTab: mountAnilistTab,
  },
  {
    id: "files",
    name: "File Server",
    icon: "▤",
    subtitle: "Samba · condivisioni",
    status: "warn",
    statusLabel: "attenzione",
    summary: [
      { label: "Condivisioni", live: "shares" },
      { label: "Spazio usato", value: "82%" },
      { label: "Libero", value: "21 GB" },
      { label: "Utenti", value: "3" },
    ],
    tabs: [
      { id: "all", label: "All" },
      { id: "storage", label: "Archiviazione" },
      { id: "shares", label: "Condivisioni" },
    ],
    renderTab: renderFilesTab,
    mountTab: mountFilesTab,
  },
  {
    id: "media",
    name: "Media",
    icon: "▦",
    subtitle: "Libreria locale · foto e video",
    status: "ok",
    statusLabel: "online",
    summary: [
      { label: "Elementi", value: String(MEDIA_ITEMS.length) },
      { label: "Spazio usato", value: "1.4 GB" },
      { label: "Ultima scansione", value: "2h fa" },
      { label: "Miniature", value: "ok" },
    ],
    tabs: [
      { id: "all", label: "All" },
      { id: "gallery", label: "Galleria" },
      { id: "settings", label: "Impostazioni" },
    ],
    renderTab: renderMediaTab,
    mountTab: mountMediaTab,
  },
  {
    id: "backup",
    name: "Backup",
    icon: "⛁",
    subtitle: "Pianificazione · retention",
    status: "ok",
    statusLabel: "online",
    summary: [
      { label: "Ultimo", value: "oggi 03:00" },
      { label: "Prossimo", value: "domani 03:00" },
      { label: "Retention", value: "7 giorni" },
      { label: "Dimensione", value: "2.1 GB" },
    ],
    tabs: [
      { id: "all", label: "All" },
      { id: "schedule", label: "Pianificazione" },
      { id: "history", label: "Storico" },
    ],
    renderTab: renderBackupTab,
    mountTab: mountBackupTab,
  },
];

const serviceById = (id) => SERVICES.find((s) => s.id === id);

/* ------------------------------------------------------------
   Navigazione principale
   ------------------------------------------------------------ */

const NAV_ITEMS = [{ id: "dashboard", label: "Dashboard" }].concat(
  SERVICES.map((s) => ({ id: s.id, label: s.name }))
);

function navMarkup() {
  return NAV_ITEMS.map(
    (item) => `<button class="nav-btn" data-view="${item.id}">${item.label}</button>`
  ).join("");
}

function renderNav() {
  $("#nav-main").innerHTML = navMarkup();
  $("#nav-drawer").innerHTML = navMarkup();

  ["#nav-main", "#nav-drawer"].forEach((sel) => {
    $(sel).addEventListener("click", (event) => {
      const btn = event.target.closest("[data-view]");
      if (btn) showView(btn.dataset.view);
    });
  });
}

let currentView = "dashboard";
let currentTab = "all";
let viewTimers = [];

function clearViewTimers() {
  viewTimers.forEach((id) => window.clearInterval(id));
  viewTimers = [];
}

/* ------------------------------------------------------------
   Dashboard
   ------------------------------------------------------------ */

function summaryValue(item) {
  return item.live ? liveValue(item.live) : item.value;
}

function serviceCard(service) {
  const stats = service.summary
    .map((item) => {
      const attr = item.live ? ` data-live="${item.live}"` : "";
      return `<div><span>${item.label}</span><strong${attr}>${summaryValue(item)}</strong></div>`;
    })
    .join("");

  return `
    <article class="card service-card" data-open="${service.id}" tabindex="0" role="button"
             aria-label="Apri ${service.name}">
      <div class="service-top">
        <span class="service-icon">${service.icon}</span>
        <div>
          <h3>${service.name}</h3>
          <p class="muted small">${service.subtitle}</p>
        </div>
        <span class="status ${service.status}"><i></i>${service.statusLabel}</span>
      </div>
      <div class="service-stats">${stats}</div>
      <div class="service-foot">
        <span class="muted small">dettagli e controlli</span>
        <span class="btn-mini">Apri →</span>
      </div>
    </article>`;
}

function renderDashboard() {
  return `
    <div class="service-grid">
      ${SERVICES.map(serviceCard).join("")}
    </div>

    <article class="card" style="margin-top: 18px">
      <div class="card-head">
        <div>
          <h3>Riepilogo host</h3>
          <p class="muted small">stato generale del Raspberry Pi</p>
        </div>
        <span class="status ok"><i></i>tutto ok</span>
      </div>
      <dl class="kv">
        <div><dt>Hostname</dt><dd>raspberrypi</dd></div>
        <div><dt>Indirizzo IP</dt><dd>192.168.1.42</dd></div>
        <div><dt>Sistema</dt><dd>Raspberry Pi OS 64-bit</dd></div>
        <div><dt>Kernel</dt><dd>6.6.31-v8+</dd></div>
        <div><dt>Latenza</dt><dd>8 ms</dd></div>
        <div><dt>Dispositivi</dt><dd>3 attivi</dd></div>
      </dl>
    </article>`;
}

function mountDashboard() {
  const root = $("#view-root");

  root.onclick = (event) => {
    const card = event.target.closest("[data-open]");
    if (card) showView(card.dataset.open);
  };

  root.onkeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-open]");
    if (card) {
      event.preventDefault();
      showView(card.dataset.open);
    }
  };
}

/* ------------------------------------------------------------
   Testata servizio e tab
   ------------------------------------------------------------ */

function detailHead(service) {
  return `
    <div class="detail-head">
      <button class="back-btn" data-back>← Dashboard</button>
      <div class="detail-title">
        <span class="service-icon">${service.icon}</span>
        <h3>${service.name}</h3>
        <span class="status ${service.status}"><i></i>${service.statusLabel}</span>
      </div>
    </div>`;
}

function tabsMarkup(service, activeTab) {
  return `
    <div class="tabs" role="tablist" aria-label="Sezioni di ${service.name}">
      ${service.tabs
        .map(
          (tab) => `
        <button class="tab-btn ${tab.id === activeTab ? "is-active" : ""}"
                role="tab" data-tab="${tab.id}"
                aria-selected="${tab.id === activeTab}">
          ${tab.label}
        </button>`
        )
        .join("")}
    </div>`;
}

function selectTab(tabId, { scroll = true } = {}) {
  const service = serviceById(currentView);
  if (!service) return;

  if (!service.tabs.some((t) => t.id === tabId)) tabId = "all";
  currentTab = tabId;
  clearViewTimers();

  $$(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });

  const content = $("#tab-content");
  if (!content) return;

  content.onclick = null;
  content.onchange = null;
  content.innerHTML = service.renderTab(tabId);
  service.mountTab(tabId);

  renderLive();
  renderChart();

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function showView(id, tab = "all") {
  if (id !== "dashboard" && !serviceById(id)) id = "dashboard";

  currentView = id;
  currentTab = "all";
  clearViewTimers();

  const service = serviceById(id);
  $("#view-title").textContent = service ? service.name : "Dashboard";
  $("#view-sub").textContent = service ? service.subtitle : "Stato dei servizi";

  $$(".nav-btn").forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.view === id)
  );

  const root = $("#view-root");
  root.onclick = null;
  root.onkeydown = null;

  if (!service) {
    root.innerHTML = renderDashboard();
    mountDashboard();
  } else {
    root.innerHTML = `${detailHead(service)}${tabsMarkup(service, tab)}<div id="tab-content"></div>`;

    root.querySelector("[data-back]").addEventListener("click", () => showView("dashboard"));
    $$(".tab-btn", root).forEach((btn) =>
      btn.addEventListener("click", () => selectTab(btn.dataset.tab))
    );

    selectTab(tab, { scroll: false });
  }

  closeDrawer();
  renderLive();
  renderChart();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ------------------------------------------------------------
   Aggiornamenti live
   ------------------------------------------------------------ */

function renderLive() {
  $$("[data-live]").forEach((node) => {
    node.textContent = liveValue(node.dataset.live);
  });

  $$("[data-bar]").forEach((node) => {
    node.style.width = `${barValue(node.dataset.bar)}%`;
  });

  const uptime = $("#uptime");
  if (uptime) uptime.textContent = formatUptime(state.uptimeSeconds);

  const diskMetric = $('[data-live="diskText"]');
  if (diskMetric) diskMetric.textContent = `${Math.round(state.disk)}%`;
}

function renderChart() {
  const line = $("#chart-line");
  const area = $("#chart-area");
  if (!line || !area) return;

  const width = 620;
  const height = 180;
  const pad = 6;
  const step = (width - pad * 2) / (state.history.length - 1);

  const points = state.history.map((value, index) => {
    const x = pad + index * step;
    const y = height - pad - (value / 100) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  line.setAttribute("points", points.join(" "));
  area.setAttribute(
    "d",
    `M ${pad},${height - pad} L ${points.join(" L ")} L ${width - pad},${height - pad} Z`
  );
}

function tick() {
  state.cpu = jitter(state.cpu, 22, 6, 78);
  state.ram = jitter(state.ram, 3, 32, 61);
  state.temp = jitter(state.temp, 1.6, 42, 63);
  state.rx = Math.max(0.1, jitter(state.rx, 2.4, 0.1, 9));
  state.tx = Math.max(0.05, jitter(state.tx, 0.9, 0.05, 4));
  state.uptimeSeconds += 2;

  state.history.push(state.cpu);
  if (state.history.length > 32) state.history.shift();

  renderLive();
  renderChart();
}

/* ------------------------------------------------------------
   Ciclo di vita
   ------------------------------------------------------------ */

let liveTimer = null;

function startDashboard() {
  if (liveTimer) return;
  liveTimer = window.setInterval(tick, 2_000);
}

function stopDashboard() {
  if (liveTimer) {
    window.clearInterval(liveTimer);
    liveTimer = null;
  }
  clearViewTimers();
}

/* ------------------------------------------------------------
   Avvio
   ------------------------------------------------------------ */

renderNav();
initNightBackground();
passwordInput.focus();
