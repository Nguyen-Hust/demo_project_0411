/* AI Studio Board UI — single self-contained script (inlined into BOARD.html by board.mjs).
 *
 * Conventions
 * - One state object (S) → pure view functions → painted into 5 fixed regions.
 * - Event delegation on #board-app (no per-render listeners).
 * - ONE edit model everywhere: a field saves when it is committed (change / blur / Enter).
 *   Only the changed field is sent, so Four-Eyes gates never fire on untouched fields.
 * - paint() never runs while the user is typing in an unsaved field or dragging a card;
 *   it is deferred and flushed afterwards, so live (SSE) updates cannot eat input.
 */
(function () {
  "use strict";

  /* ───────────────────────── constants ───────────────────────── */
  const THEME_KEY = "ai_studio_board_theme";
  const PREFS_KEY = "ai_studio_board_prefs";
  const CLI = "node board/board.mjs";
  const DEFAULT_SPRINT = "SPRINT-01";
  const UNASSIGNED = "@unassigned";
  const TOAST_MS = { ok: 2800, err: 6000 };
  const SP_SPLIT_THRESHOLD = 8;
  const MEMBER_ID_RE = /^@?[a-z0-9][a-z0-9_-]*$/i;
  const SPRINT_ID_RE = /^[A-Z0-9][A-Z0-9_-]*$/;

  const API = {
    assign: "/api/ticket/assign",
    member: "/api/team/member",
    active: "/api/team/active-member",
    sync: "/api/sprint/sync",
    retro: "/api/sprint/retro-input",
    state: "/api/state",
    events: "/api/events",
  };

  const DEFAULT_COLUMNS = [
    "BACKLOG", "READY_FOR_DEV", "IN_PROGRESS", "PENDING_BA", "PENDING_TL",
    "READY_FOR_QA", "IN_DEV_FIX", "IN_RETEST", "DONE",
  ];

  const COLUMN_LABELS = {
    BACKLOG: "Backlog",
    READY_FOR_DEV: "Ready for Dev",
    IN_PROGRESS: "In Progress",
    PENDING_BA: "Pending BA",
    PENDING_TL: "Pending TL",
    READY_FOR_QA: "Ready for QA",
    IN_DEV_FIX: "In Dev Fix",
    IN_RETEST: "In Retest",
    DONE: "Done",
  };

  const COLUMN_TONE = {
    BACKLOG: "neutral",
    READY_FOR_DEV: "primary",
    IN_PROGRESS: "primary",
    PENDING_BA: "warn",
    PENDING_TL: "warn",
    READY_FOR_QA: "info",
    IN_DEV_FIX: "danger",
    IN_RETEST: "info",
    DONE: "ok",
  };

  /* status → next step. `alt` is the "send back" path. */
  const FLOW = {
    BACKLOG: { to: "READY_FOR_DEV", label: "Chuẩn bị Dev" },
    READY_FOR_DEV: { to: "IN_PROGRESS", label: "Bắt đầu Dev" },
    IN_PROGRESS: { to: "READY_FOR_QA", label: "Gửi QA" },
    PENDING_BA: { to: "IN_PROGRESS", label: "Mở khóa → Dev" },
    PENDING_TL: { to: "IN_PROGRESS", label: "Mở khóa → Dev" },
    READY_FOR_QA: { to: "DONE", label: "Pass → Done", alt: { to: "IN_DEV_FIX", label: "Báo lỗi" } },
    IN_DEV_FIX: { to: "IN_RETEST", label: "Đã sửa → Retest" },
    IN_RETEST: { to: "DONE", label: "Pass → Done", alt: { to: "IN_DEV_FIX", label: "Lỗi lại" } },
  };

  const ROLES = [
    { id: "ba", label: "BA" },
    { id: "dev", label: "DEV" },
    { id: "tester", label: "TESTER" },
    { id: "tl", label: "TL" },
  ];

  const SPRINT_TARGETS = ["DONE", "DEV_DONE", "TECH_PLANNED"];
  const MEMBER_STATUSES = ["Active", "Inactive"];

  const TYPE_META = {
    TICKET: { label: "Ticket", tone: "neutral" },
    BUG: { label: "Bug", tone: "danger" },
    QUESTION: { label: "Q&A", tone: "info" },
    BACKLOG: { label: "Backlog", tone: "neutral" },
  };

  const THEME_MODES = ["auto", "light", "dark"];
  const THEME_META = {
    auto: { icon: "monitor", label: "Tự động" },
    light: { icon: "sun", label: "Sáng" },
    dark: { icon: "moon", label: "Tối" },
  };

  const CONN_TEXT = { static: "Xem tĩnh", connecting: "Đang kết nối", live: "Live", offline: "Mất kết nối" };

  const TABS = [
    { id: "board", label: "Board" },
    { id: "sprint", label: "Sprint" },
    { id: "team", label: "Team" },
    { id: "retro", label: "Retro" },
  ];

  const DEFAULT_TEAM = [
    { member: "@tl-1", name: "Tech Lead", role: "tl", capacitySp: 8, specialties: "Architecture, ADR, Shared UI", status: "Active" },
    { member: "@ba-1", name: "Business Analyst", role: "ba", capacitySp: 10, specialties: "DDD, Spec, Slicing", status: "Active" },
    { member: "@dev-1", name: "Developer 1", role: "dev", capacitySp: 13, specialties: "Fullstack, TDD", status: "Active" },
    { member: "@qa-1", name: "QA Tester 1", role: "tester", capacitySp: 10, specialties: "Playwright E2E, Adversarial QA", status: "Active" },
  ];

  /* Texts are persisted verbatim into board/sprints/*.md — keep them stable. */
  const RETRO_CATEGORIES = {
    dev: [
      "Spec & Domain Friction (Spec thiếu case biên / thuật ngữ DDD lệch)",
      "Estimation Drift & Tech Bottlenecks (Lệch điểm DEV SP / nghẽn kiến trúc)",
      "Shortcuts & Reusable Components (Có // shortcut: hoặc cần tách Shared Component)",
      "Escaped Bug Root Cause (Bug lọt sang QA cần thêm Rule phòng ngừa)",
      "Workflow & Agent Friction (Subagent / công cụ gây tốn vòng lặp)",
    ],
    tester: [
      "First-Time Pass & Recurring Bugs (Ticket trượt QA vòng đầu / lỗi lặp lại)",
      "Uncovered AC & Edge-Case Gaps (Kịch bản biên BA chưa liệt kê trong Spec)",
      "Playwright Locator Health & Flakiness (Selector thiếu getByRole / data-testid)",
      "QA Crunch & Seed Data (Thiếu e2e/seed.spec.ts hoặc dồn việc cuối Sprint)",
      "QA Estimation Drift (Thực tế test tốn nhiều hơn QA SP dự kiến)",
    ],
  };

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    kanban: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="15" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sync: '<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.93 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2m-14.93 7.07 1.41-1.41m11.32-11.32 1.41-1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  };

  /* ───────────────────────── state ───────────────────────── */
  const EMPTY_STATE = {
    columns: DEFAULT_COLUMNS,
    items: [],
    roster: [],
    capacity: { sprintId: DEFAULT_SPRINT, members: [], rolloverQaTickets: [] },
    activeSprint: DEFAULT_SPRINT,
  };

  const freshMemberDraft = () => ({
    member: "", name: "", role: "dev", capacitySp: "10", specialties: "", status: "Active", err: {},
  });

  const S = {
    data: window.__BOARD_STATE__ || EMPTY_STATE,
    live: window.location.protocol.startsWith("http"),
    conn: "static", // static | connecting | live | offline
    tab: "board",
    role: "dev",
    member: "ALL",
    f: { q: "", sprint: "ALL", type: "ALL" },
    prefs: { view: "board", hideDone: false, collapseEmpty: true },
    expanded: new Set(),
    sel: null,
    dragKey: null,
    typing: false,
    deferred: false,
    focusAfter: null,
    queue: [],
    savedAt: null,
    theme: "auto",
    toastTimer: null,
    draft: {
      member: freshMemberDraft(),
      retro: { member: "", role: "", tags: [], proposal: "", err: {} },
    },
  };

  /* ───────────────────────── helpers ───────────────────────── */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byFk = (fk) => $$("[data-fk]").find((el) => el.dataset.fk === fk) || null;
  const uniq = (list) => Array.from(new Set(list));
  const cliQuote = (v) => JSON.stringify(String(v));

  function esc(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ico(name) {
    return `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  }

  const items = () => S.data.items || [];
  const columns = () => S.data.columns || DEFAULT_COLUMNS;
  const roster = () => S.data.roster || [];
  const activeSprint = () => S.data.activeSprint || DEFAULT_SPRINT;
  const isWork = (it) => it.type === "TICKET" || it.type === "BUG";
  const keyOf = (it) => `${it.type}|${it.slug}|${it.id}`;
  const findByKey = (key) => items().find((it) => keyOf(it) === key) || null;
  const findWork = (id) => items().find((it) => isWork(it) && it.id === id) || null;
  const statusLabel = (s) => COLUMN_LABELS[s] || s;
  /* titles arrive as "F-001-T01: Login…"; the id is already shown beside it */
  const titleOf = (it) => {
    const title = String(it.title || "");
    const prefix = `${it.id}:`;
    return (title.startsWith(prefix) ? title.slice(prefix.length).trim() : title) || it.id;
  };
  const isAssigned = (v) => Boolean(v) && v !== UNASSIGNED;
  const personLabel = (v) => (isAssigned(v) ? v : "Chưa gán");

  function sprintList() {
    const others = uniq(items().map((it) => it.sprint || "BACKLOG").filter((s) => s !== activeSprint())).sort();
    return [activeSprint(), ...others];
  }

  function peopleList(current) {
    return uniq([UNASSIGNED, ...roster().map((m) => m.member), current || UNASSIGNED]);
  }

  function opts(list, current) {
    return list
      .map((o) => {
        const [value, label] = Array.isArray(o) ? o : [o, o];
        return `<option value="${esc(value)}"${value === current ? " selected" : ""}>${esc(label)}</option>`;
      })
      .join("");
  }

  const personOpts = (current) =>
    opts(peopleList(current).map((m) => [m, personLabel(m)]), current || UNASSIGNED);

  const badge = (text, tone = "neutral") => `<span class="badge badge--${tone}">${esc(text)}</span>`;
  const typeBadge = (it) => {
    const meta = TYPE_META[it.type] || TYPE_META.TICKET;
    return badge(meta.label, meta.tone);
  };
  const statusBadge = (s) => badge(statusLabel(s), COLUMN_TONE[s] || "neutral");

  /* ───────────────────────── rules (client mirror of Four-Eyes gate) ───────────────────────── */
  function gate(item, to, role = S.role) {
    const r = String(role || "dev").toLowerCase();
    const target = String(to || "").toUpperCase();
    const current = String(item.status || "").toUpperCase();
    if ((target === "DONE" || target === "CLOSED") && r !== "tester") {
      return `Four-Eyes Gate: chỉ TESTER được chuyển sang ${statusLabel(target)} (đang là ${r.toUpperCase()}).`;
    }
    if (current === "PENDING_BA" && target !== current && r !== "ba") {
      return `Four-Eyes Gate: chỉ BA được mở khóa Pending BA (đang là ${r.toUpperCase()}).`;
    }
    if (current === "PENDING_TL" && target !== current && r !== "tl") {
      return `Four-Eyes Gate: chỉ TL được mở khóa Pending TL (đang là ${r.toUpperCase()}).`;
    }
    return "";
  }

  const nextAction = (it) => (isWork(it) ? FLOW[it.status] || null : null);

  /* ───────────────────────── persistence (view prefs only) ───────────────────────── */
  function loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (saved.view === "board" || saved.view === "list") S.prefs.view = saved.view;
      if (typeof saved.hideDone === "boolean") S.prefs.hideDone = saved.hideDone;
      if (typeof saved.collapseEmpty === "boolean") S.prefs.collapseEmpty = saved.collapseEmpty;
    } catch (_) {
      /* corrupted prefs → defaults */
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(S.prefs));
    } catch (_) {
      /* storage unavailable (private mode / file://) → prefs last for this page only */
    }
  }

  function applyTheme(mode) {
    S.theme = THEME_MODES.includes(mode) ? mode : "auto";
    const root = document.documentElement;
    if (S.theme === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", S.theme);
    try {
      localStorage.setItem(THEME_KEY, S.theme);
    } catch (_) {
      /* see savePrefs */
    }
  }

  /* ───────────────────────── toast / clipboard / saved-indicator ───────────────────────── */
  function toast(text, type = "ok") {
    clearTimeout(S.toastTimer);
    const host = $("#r-toast");
    if (!host) return;
    host.innerHTML = `<div class="toast toast--${type}"><span>${esc(text)}</span><button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="toast-close" aria-label="Đóng thông báo">${ico("close")}</button></div>`;
    S.toastTimer = setTimeout(() => {
      host.innerHTML = "";
    }, TOAST_MS[type] || TOAST_MS.ok);
  }

  async function copyText(text, okMsg) {
    try {
      await navigator.clipboard.writeText(text);
      toast(okMsg);
      return;
    } catch (_) {
      /* clipboard API blocked (e.g. file://) → legacy path */
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (_) {
      copied = false;
    }
    ta.remove();
    toast(copied ? okMsg : "Không copy được — hãy chọn và copy thủ công.", copied ? "ok" : "err");
  }

  const markSaved = () => {
    S.savedAt = new Date();
  };
  const savedLabel = () =>
    S.savedAt ? `Đã lưu ${S.savedAt.toLocaleTimeString("vi-VN", { hour12: false })}` : "";

  /* ───────────────────────── data layer ───────────────────────── */
  const FIELD_FLAG = {
    status: "status",
    sprint: "sprint",
    sprintTarget: "target",
    devAssignee: "dev-assignee",
    qaAssignee: "qa-assignee",
    devSp: "dev-sp",
    qaSp: "qa-sp",
  };

  function applyLocal(endpoint, payload) {
    if (endpoint === API.assign) {
      const it = findWork(payload.id);
      if (!it) return;
      for (const field of Object.keys(FIELD_FLAG)) {
        if (payload[field] !== undefined) it[field] = payload[field];
      }
      it.totalSp = (it.devSp || 0) + (it.qaSp || 0);
    } else if (endpoint === API.member) {
      const list = roster();
      const idx = list.findIndex((m) => m.member.toLowerCase() === payload.member.toLowerCase());
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push({ ...payload });
      S.data.roster = list;
    }
  }

  async function send(endpoint, payload, cli) {
    if (!S.live) {
      if (cli) S.queue.push(cli);
      applyLocal(endpoint, payload);
      markSaved();
      paint();
      return { ok: true, local: true };
    }
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        toast(data.error || `Server từ chối thao tác (${res.status}).`, "err");
        paint(); // revert any control the user already changed
        return { ok: false };
      }
      if (data.state) S.data = data.state;
      if (data.role) S.role = data.role;
      if (data.activeMember !== undefined) S.member = data.activeMember || "ALL";
      markSaved();
      paint();
      return data;
    } catch (err) {
      toast(`Mất kết nối server: ${err.message}`, "err");
      paint();
      return { ok: false };
    }
  }

  function patch(item, fields) {
    const flags = Object.entries(fields)
      .map(([k, v]) => `--${FIELD_FLAG[k]}=${cliQuote(v)}`)
      .join(" ");
    return send(
      API.assign,
      { id: item.id, ...fields },
      `${CLI} assign --id=${cliQuote(item.id)} ${flags} --role=${S.role}`
    );
  }

  async function move(item, to) {
    if (!item || item.status === to) return;
    const why = gate(item, to);
    if (why) {
      toast(why, "err");
      paint();
      return;
    }
    const res = await patch(item, { status: to });
    if (res.ok) toast(`${item.id} → ${statusLabel(to)}`);
  }

  async function fetchState() {
    try {
      const res = await fetch(API.state);
      if (!res.ok) return;
      const data = await res.json();
      if (data.state) S.data = data.state;
      if (data.role) S.role = data.role;
      if (data.activeMember) S.member = data.activeMember;
    } catch (_) {
      /* keep embedded state */
    }
  }

  function connectEvents() {
    if (typeof EventSource === "undefined") return;
    const es = new EventSource(API.events);
    es.addEventListener("state", (ev) => {
      try {
        S.data = JSON.parse(ev.data);
        paint();
      } catch (_) {
        /* ignore malformed payload */
      }
    });
    es.onopen = async () => {
      S.conn = "live";
      await fetchState(); // resync anything missed while disconnected
      paint();
    };
    es.onerror = () => {
      S.conn = "offline";
      paint();
    };
  }

  /* ───────────────────────── views: shared ───────────────────────── */
  function moveButtons(it) {
    const na = nextAction(it);
    if (!na) return "";
    const one = (a, cls) => {
      const why = gate(it, a.to);
      return `<button type="button" class="btn btn--sm ${why ? "btn--locked" : cls}" data-act="move" data-k="${esc(keyOf(it))}" data-to="${a.to}"${why ? ' aria-disabled="true"' : ""} title="${esc(why || `Chuyển sang ${statusLabel(a.to)}`)}">${ico(why ? "lock" : "arrow")}<span>${esc(a.label)}</span></button>`;
    };
    return one(na, "btn--primary") + (na.alt ? one(na.alt, "btn--danger-outline") : "");
  }

  function dorBadge(it) {
    const sp = it.totalSp || 0;
    if (sp >= SP_SPLIT_THRESHOLD) return badge(`Nên tách (≥ ${SP_SPLIT_THRESHOLD} SP)`, "danger");
    if (sp === 0) return badge("Chưa ước lượng", "warn");
    return badge("OK", "ok");
  }

  function emptyState(title, body, actions = "") {
    return `<div class="empty"><h3>${esc(title)}</h3><p>${body}</p><div class="row row--center">${actions}</div></div>`;
  }

  /* ───────────────────────── views: chrome ───────────────────────── */
  function viewTop() {
    const counts = {
      board: items().length,
      sprint: items().filter(isWork).length,
      team: roster().length,
    };
    const theme = THEME_META[S.theme];
    const memberOptions = opts(
      [["ALL", "Tất cả"], ...roster().map((m) => [m.member, `${m.member} (${m.role})`])],
      S.member
    );
    return `
      <div class="brand">
        <span class="brand__logo">${ico("kanban")}</span>
        <strong class="brand__name">AI Studio Board</strong>
        ${badge(activeSprint(), "primary")}
      </div>
      <nav class="tabs" aria-label="Điều hướng Board">
        ${TABS.map(
          (t) => `<button type="button" class="tab" data-act="tab" data-tab="${t.id}" data-fk="tab:${t.id}"${S.tab === t.id ? ' aria-current="page"' : ""}>${t.label}${counts[t.id] !== undefined ? `<span class="tab__count">${counts[t.id]}</span>` : ""}</button>`
        ).join("")}
      </nav>
      <div class="tools">
        <label class="inline-field" title="Lọc việc của một thành viên (/my-tasks)">
          <span>Việc của</span>
          <select class="select" data-filter="member" data-fk="top:member">${memberOptions}</select>
        </label>
        <label class="inline-field" title="Vai trò dùng để kiểm tra Four-Eyes Gate khi chuyển trạng thái">
          <span>Vai trò</span>
          <select class="select" data-filter="role" data-fk="top:role">${opts(ROLES.map((r) => [r.id, r.label]), S.role)}</select>
        </label>
        <span class="conn conn--${S.conn}"><span class="conn__dot" aria-hidden="true"></span>${CONN_TEXT[S.conn]}${S.savedAt ? ` · ${esc(savedLabel())}` : ""}</span>
        <button type="button" class="btn btn--icon" data-act="theme" data-fk="top:theme" aria-label="Giao diện: ${theme.label}. Nhấn để đổi" title="Giao diện: ${theme.label}">${ico(theme.icon)}</button>
      </div>`;
  }

  const viewLists = () =>
    `<datalist id="dl-sprints">${sprintList().map((s) => `<option value="${esc(s)}"></option>`).join("")}</datalist><datalist id="dl-members">${roster().map((m) => `<option value="${esc(m.member)}"></option>`).join("")}</datalist>`;

  function viewBanner() {
    if (S.live) return "";
    const queued = S.queue.length
      ? `<span>${S.queue.length} thay đổi chờ ghi vào file</span><button type="button" class="btn btn--sm btn--primary" data-act="copy-queue">${ico("copy")} Copy lệnh đồng bộ</button>`
      : "";
    return `<div class="banner">${ico("info")}<span>Chế độ xem tĩnh: thay đổi chỉ tồn tại trong trang này. Chạy <code>${CLI} --ui</code> để ghi trực tiếp.</span>${queued}</div>`;
  }

  /* ───────────────────────── views: board tab ───────────────────────── */
  function visibleItems() {
    const q = S.f.q.trim().toLowerCase();
    return items().filter((it) => {
      if (S.prefs.hideDone && (it.status === "DONE" || it.status === "CLOSED")) return false;
      if (S.member !== "ALL" && it.devAssignee !== S.member && it.qaAssignee !== S.member) return false;
      if (S.f.sprint !== "ALL" && (it.sprint || "BACKLOG") !== S.f.sprint) return false;
      if (S.f.type !== "ALL" && it.type !== S.f.type) return false;
      if (q) {
        const hay = `${it.id} ${it.title} ${it.slug} ${it.devAssignee || ""} ${it.qaAssignee || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  const hasFilter = () =>
    S.f.q.trim() !== "" || S.member !== "ALL" || S.f.sprint !== "ALL" || S.f.type !== "ALL" || S.prefs.hideDone;

  function countHtml() {
    return `Hiển thị <strong>${visibleItems().length}</strong> / ${items().length} mục`;
  }

  function viewMine() {
    if (S.member === "ALL") return "";
    const mine = items().filter((it) => it.devAssignee === S.member || it.qaAssignee === S.member);
    const escalations = mine.filter((it) => it.status === "PENDING_BA" || it.status === "PENDING_TL").length;
    const bugs = mine.filter((it) => it.type === "BUG" || it.status === "IN_DEV_FIX" || it.status === "IN_RETEST").length;
    const active = mine.filter((it) => ["IN_PROGRESS", "READY_FOR_DEV", "READY_FOR_QA"].includes(it.status)).length;
    const cap = ((S.data.capacity && S.data.capacity.members) || []).find(
      (m) => m.member.toLowerCase() === S.member.toLowerCase()
    );
    let cmd = `/my-tasks ${S.member}`;
    if (mine.some((it) => it.status === "IN_DEV_FIX")) cmd = "/diagnosing-bugs";
    else if (mine.some((it) => it.status === "READY_FOR_QA" && it.qaAssignee === S.member)) cmd = "/qa-verify";
    else if (mine.some((it) => it.status === "READY_FOR_DEV" && it.devAssignee === S.member)) cmd = "/implement";
    return `
      <section class="mine" aria-label="Việc của ${esc(S.member)}">
        <span class="mine__who">${ico("user")}<strong>${esc(S.member)}</strong></span>
        <span class="mine__stat">Tải sprint <strong>${cap ? `${cap.assignedSp}/${cap.capacitySp} SP` : "—"}</strong></span>
        <span class="mine__stat">Đang làm <strong>${active}</strong></span>
        <span class="mine__stat">Escalation <strong>${escalations}</strong></span>
        <span class="mine__stat">Bug <strong>${bugs}</strong></span>
        <span class="mine__stat">Tổng <strong>${mine.length}</strong></span>
        <span class="mine__cmd">Gợi ý <code>${esc(cmd)}</code><button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="copy" data-text="${esc(cmd)}" data-msg="Đã copy ${esc(cmd)}" aria-label="Copy lệnh ${esc(cmd)}">${ico("copy")}</button></span>
      </section>`;
  }

  function viewToolbar() {
    const sprintOpts = opts([["ALL", "Mọi sprint"], ...sprintList().map((s) => [s, s])], S.f.sprint);
    const typeOpts = opts(
      [["ALL", "Mọi loại"], ["TICKET", "Ticket"], ["BUG", "Bug"], ["QUESTION", "Q&A"], ["BACKLOG", "Backlog"]],
      S.f.type
    );
    const seg = (id, label, icon) =>
      `<button type="button" class="seg__btn" data-act="view" data-view="${id}" data-fk="tb:view-${id}" aria-pressed="${S.prefs.view === id}">${ico(icon)}<span>${label}</span></button>`;
    return `
      <div class="toolbar">
        <label class="search">
          ${ico("search")}
          <input type="search" class="input" data-filter="q" data-fk="tb:q" placeholder="Tìm mã, tiêu đề, @thành-viên…" aria-label="Tìm kiếm (phím tắt /)" value="${esc(S.f.q)}" autocomplete="off" />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <select class="select" data-filter="sprint" data-fk="tb:sprint" aria-label="Lọc theo sprint">${sprintOpts}</select>
        <select class="select" data-filter="type" data-fk="tb:type" aria-label="Lọc theo loại">${typeOpts}</select>
        <label class="check"><input type="checkbox" data-pref="hideDone" data-fk="tb:hideDone"${S.prefs.hideDone ? " checked" : ""} /> Ẩn Done</label>
        ${
          S.prefs.view === "board"
            ? `<label class="check" title="Cột không có thẻ thu thành thanh hẹp"><input type="checkbox" data-pref="collapseEmpty" data-fk="tb:collapse"${S.prefs.collapseEmpty ? " checked" : ""} /> Thu gọn cột trống</label>`
            : ""
        }
        <span class="toolbar__count" id="k-count">${countHtml()}</span>
        ${hasFilter() ? `<button type="button" class="btn btn--sm btn--ghost" data-act="reset-filters" data-fk="tb:reset">Xóa lọc</button>` : ""}
        <div class="seg" role="group" aria-label="Kiểu hiển thị">${seg("board", "Bảng", "kanban")}${seg("list", "Danh sách", "list")}</div>
      </div>`;
  }

  function viewCard(it) {
    const work = isWork(it);
    const k = esc(keyOf(it));
    const sp = it.totalSp || 0;
    const meta = work
      ? `<div class="card__meta">
           <span class="who${isAssigned(it.devAssignee) ? "" : " who--none"}" title="Dev"><b>DEV</b> ${esc(personLabel(it.devAssignee))}</span>
           <span class="who${isAssigned(it.qaAssignee) ? "" : " who--none"}" title="QA"><b>QA</b> ${esc(personLabel(it.qaAssignee))}</span>
           ${badge(`${it.sprint || "BACKLOG"} · ${it.sprintTarget || "DONE"}`)}
         </div>`
      : `<div class="card__meta"><span class="muted">${esc(it.file || "")}</span></div>`;
    const actions = moveButtons(it);
    return `
      <article class="card${work ? "" : " card--readonly"}" data-k="${k}"${work ? ' draggable="true"' : ""}>
        <div class="card__top">
          <button type="button" class="id-link" data-act="open" data-k="${k}" data-fk="open:${k}">${esc(it.id)}</button>
          <span class="spacer"></span>
          ${sp >= SP_SPLIT_THRESHOLD && work ? badge("Nên tách", "danger") : ""}
          ${work ? badge(`${sp} SP`) : typeBadge(it)}
        </div>
        <button type="button" class="card__title" data-act="open" data-k="${k}" title="${esc(titleOf(it))}">${esc(titleOf(it))}</button>
        ${meta}
        ${actions ? `<div class="card__actions">${actions}</div>` : ""}
      </article>`;
  }

  function viewColumn(col, list) {
    const its = list.filter((it) => it.status === col);
    const label = statusLabel(col);
    const tone = COLUMN_TONE[col] || "neutral";
    const collapsed = S.prefs.collapseEmpty && its.length === 0 && !S.expanded.has(col);
    if (collapsed) {
      return `<button type="button" class="kcol kcol--rail tone-${tone}" data-col="${col}" data-act="expand" data-fk="col:${col}" aria-label="${esc(label)}: trống. Mở rộng cột"><span class="kcol__rail-label">${esc(label)}</span><span class="count">0</span></button>`;
    }
    const collapseBtn = its.length === 0 && S.prefs.collapseEmpty
      ? `<button type="button" class="btn btn--ghost btn--icon btn--sm" data-act="collapse" data-col="${col}" data-fk="col:${col}" aria-label="Thu gọn cột ${esc(label)}">${ico("chevronLeft")}</button>`
      : "";
    return `
      <section class="kcol tone-${tone}" data-col="${col}" aria-label="${esc(label)}">
        <header class="kcol__head"><h2>${esc(label)}</h2><span class="count">${its.length}</span>${collapseBtn}</header>
        <div class="kcol__body">${its.length ? its.map(viewCard).join("") : `<p class="kcol__empty">Kéo thẻ vào đây</p>`}</div>
      </section>`;
  }

  function viewKanban(list) {
    const cols = columns().filter((c) => !(S.prefs.hideDone && c === "DONE"));
    return `<div class="kgrid">${cols.map((c) => viewColumn(c, list)).join("")}</div>`;
  }

  function viewList(list) {
    const rows = list
      .map((it) => {
        const k = esc(keyOf(it));
        const work = isWork(it);
        return `
        <tr>
          <td class="nowrap"><button type="button" class="id-link" data-act="open" data-k="${k}" data-fk="open:${k}">${esc(it.id)}</button> ${typeBadge(it)}</td>
          <td class="cell-title"><button type="button" class="link" data-act="open" data-k="${k}">${esc(titleOf(it))}</button></td>
          <td class="nowrap">${esc(it.sprint || "BACKLOG")}</td>
          <td class="nowrap">${work ? `${esc(personLabel(it.devAssignee))} / ${esc(personLabel(it.qaAssignee))}` : "—"}</td>
          <td class="nowrap">${work ? `<strong>${it.totalSp || 0} SP</strong> <span class="muted">(${it.devSp || 0}/${it.qaSp || 0})</span>` : "—"}</td>
          <td>${work ? `<select class="select select--sm" data-edit="status" data-id="${esc(it.id)}" data-fk="l:${k}:status" aria-label="Trạng thái của ${esc(it.id)}">${opts(columns().map((c) => [c, statusLabel(c)]), it.status)}</select>` : statusBadge(it.status)}</td>
          <td><div class="row">${moveButtons(it)}</div></td>
        </tr>`;
      })
      .join("");
    return `
      <div class="tablewrap">
        <table class="tbl">
          <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Sprint</th><th>DEV / QA</th><th>Điểm</th><th>Trạng thái</th><th>Bước tiếp</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  function viewBoardBody() {
    if (items().length === 0) {
      return emptyState(
        "Board chưa có ticket hoặc bug",
        `Khởi tạo đội ngũ ở tab <strong>Team</strong>, rồi chạy <code>/plan-feature</code> để BA tạo spec và cắt ticket vào <code>board/features/</code>.`,
        `<button type="button" class="btn btn--primary" data-act="tab" data-tab="team">Mở tab Team</button>
         <button type="button" class="btn" data-act="copy" data-text="/plan-feature " data-msg="Đã copy /plan-feature">${ico("copy")} Copy /plan-feature</button>`
      );
    }
    const list = visibleItems();
    if (list.length === 0) {
      return emptyState(
        "Không có mục nào khớp bộ lọc",
        `Đổi từ khóa hoặc xóa bộ lọc để xem lại toàn bộ ${items().length} mục.`,
        `<button type="button" class="btn btn--primary" data-act="reset-filters">Xóa tất cả bộ lọc</button>`
      );
    }
    return S.prefs.view === "list" ? viewList(list) : viewKanban(list);
  }

  const viewBoardTab = () =>
    `${viewMine()}${viewToolbar()}<div id="k-body" class="k-body">${viewBoardBody()}</div>`;

  /* ───────────────────────── views: sprint tab ───────────────────────── */
  function viewSprint() {
    const cap = S.data.capacity || {};
    const members = cap.members || [];
    const rollover = cap.rolloverQaTickets || [];
    const STATUS_TEXT = { OK: ["Ổn", "ok"], WARN: ["Gần đầy", "warn"], OVER_CAPACITY: ["Quá tải", "danger"] };
    const capHtml = members.length
      ? members
          .map((m) => {
            const real = m.capacitySp > 0 ? Math.round((m.assignedSp / m.capacitySp) * 100) : 0;
            const [text, tone] = STATUS_TEXT[m.status] || [m.status, "neutral"];
            return `
            <div class="cap">
              <div class="cap__head"><strong>${esc(m.member)}</strong><span class="muted">${esc(m.name || "")} · ${esc(m.role)}</span><span class="spacer"></span>${badge(`${text} · ${m.assignedSp}/${m.capacitySp} SP`, tone)}</div>
              <div class="bar" role="progressbar" aria-label="Tải của ${esc(m.member)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(real, 100)}" aria-valuetext="${real}%"><div class="bar__fill bar__fill--${tone}" style="width:${Math.min(real, 100)}%"></div></div>
            </div>`;
          })
          .join("")
      : `<p class="muted">Chưa có thành viên. Thêm ở tab <strong>Team</strong> trước.</p>`;

    const rows = items()
      .filter(isWork)
      .map((it) => {
        const k = esc(keyOf(it));
        const id = esc(it.id);
        const fk = (field) => `r:${id}:${field}`;
        return `
        <tr>
          <td class="nowrap"><button type="button" class="id-link" data-act="open" data-k="${k}" data-fk="open:${k}">${id}</button><div class="muted small">${esc(it.slug)}</div></td>
          <td class="cell-title">${esc(titleOf(it))}</td>
          <td><input class="input input--sm" list="dl-sprints" data-edit="sprint" data-id="${id}" data-fk="${fk("sprint")}" value="${esc(it.sprint || DEFAULT_SPRINT)}" aria-label="Sprint của ${id}" /></td>
          <td><select class="select select--sm" data-edit="devAssignee" data-id="${id}" data-fk="${fk("devAssignee")}" aria-label="Dev của ${id}">${personOpts(it.devAssignee)}</select></td>
          <td><select class="select select--sm" data-edit="qaAssignee" data-id="${id}" data-fk="${fk("qaAssignee")}" aria-label="QA của ${id}">${personOpts(it.qaAssignee)}</select></td>
          <td><select class="select select--sm" data-edit="sprintTarget" data-id="${id}" data-fk="${fk("sprintTarget")}" aria-label="Sprint target của ${id}">${opts(SPRINT_TARGETS, it.sprintTarget || "DONE")}</select></td>
          <td><input type="number" min="0" step="0.5" class="input input--sm input--num" data-edit="devSp" data-id="${id}" data-fk="${fk("devSp")}" value="${it.devSp || 0}" aria-label="DEV SP của ${id}" /></td>
          <td><input type="number" min="0" step="0.5" class="input input--sm input--num" data-edit="qaSp" data-id="${id}" data-fk="${fk("qaSp")}" value="${it.qaSp || 0}" aria-label="QA SP của ${id}" /></td>
          <td class="nowrap"><strong>${it.totalSp || 0} SP</strong> ${dorBadge(it)}</td>
        </tr>`;
      })
      .join("");

    return `
      <section class="panel">
        <header class="panel__head">
          <h2>Capacity · ${esc(activeSprint())}</h2>
          <button type="button" class="btn btn--primary" data-act="sync-sprint" data-fk="sp:sync">${ico("sync")} Đồng bộ vào board/sprints/${esc(activeSprint())}.md</button>
        </header>
        <div class="cap-grid">${capHtml}</div>
        ${rollover.length ? `<p class="note note--warn"><strong>QA rollover sang sprint sau (target DEV_DONE):</strong> ${esc(rollover.join(", "))}</p>` : ""}
      </section>
      <section class="panel">
        <header class="panel__head">
          <h2>Phân công &amp; ước lượng</h2>
          <span class="muted">Tự lưu khi chọn hoặc rời ô nhập</span>
        </header>
        <div class="tablewrap tablewrap--inline">
          <table class="tbl">
            <thead><tr><th>Ticket</th><th>Tiêu đề</th><th>Sprint</th><th>Dev</th><th>QA</th><th>Target</th><th>DEV SP</th><th>QA SP</th><th>Tổng / DoR</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="9" class="empty-cell">Chưa có ticket nào trong <code>board/features/*/tickets/</code>. Chạy <code>/plan-feature</code> trước.</td></tr>`}</tbody>
          </table>
        </div>
        <p class="note"><code>DONE</code> tính DEV + QA SP · <code>DEV_DONE</code> chỉ tính DEV SP, QA SP chuyển sang sprint sau · <code>TECH_PLANNED</code> tính 20% DEV SP.</p>
      </section>`;
  }

  /* ───────────────────────── views: team tab ───────────────────────── */
  const fieldErr = (form, field) => {
    const msg = S.draft[form].err[field];
    return msg ? `<p class="field__err" id="err-${form}-${field}">${esc(msg)}</p>` : "";
  };
  const invalidAttrs = (form, field) =>
    S.draft[form].err[field] ? ` aria-invalid="true" aria-describedby="err-${form}-${field}"` : "";

  function viewTeam() {
    const d = S.draft.member;
    const rows = roster()
      .map(
        (m) => `
        <tr>
          <td><strong>${esc(m.member)}</strong></td>
          <td>${esc(m.name)}</td>
          <td>${badge(m.role.toUpperCase(), "primary")}</td>
          <td><strong>${m.capacitySp} SP</strong></td>
          <td>${esc(m.specialties)}</td>
          <td>${badge(m.status, m.status === "Active" ? "ok" : "neutral")}</td>
          <td><button type="button" class="btn btn--sm" data-act="edit-member" data-member="${esc(m.member)}" aria-label="Sửa ${esc(m.member)}">Sửa</button></td>
        </tr>`
      )
      .join("");
    const input = (field, label, extra = "") =>
      `<label class="field"><span>${label}</span><input class="input" data-form="member" data-field="${field}" data-fk="m:${field}" value="${esc(d[field])}"${invalidAttrs("member", field)} ${extra} />${fieldErr("member", field)}</label>`;
    return `
      <section class="panel">
        <header class="panel__head">
          <h2>Thêm / cập nhật thành viên</h2>
          <button type="button" class="btn" data-act="seed-team" data-fk="m:seed">${ico("plus")} Thêm 4 role mẫu</button>
        </header>
        <form class="form-grid" data-submit="member" novalidate>
          ${input("member", "Mã thành viên", 'placeholder="@dev-1" autocomplete="off" required')}
          ${input("name", "Họ tên", 'placeholder="Minh" autocomplete="off"')}
          <label class="field"><span>Vai trò</span><select class="select" data-form="member" data-field="role" data-fk="m:role">${opts(ROLES.map((r) => [r.id, r.label]), d.role)}</select></label>
          ${input("capacitySp", "Capacity (SP / sprint)", 'type="number" min="1" max="100" step="0.5"')}
          ${input("specialties", "Chuyên môn", 'placeholder="Backend, Playwright…" autocomplete="off"')}
          <label class="field"><span>Trạng thái</span><select class="select" data-form="member" data-field="status" data-fk="m:status">${opts(uniq([...MEMBER_STATUSES, d.status]), d.status)}</select></label>
          <div class="field field--action"><button type="submit" class="btn btn--primary">Lưu vào TEAM.md</button></div>
        </form>
      </section>
      <section class="panel">
        <header class="panel__head"><h2>Thành viên hiện tại</h2></header>
        <div class="tablewrap tablewrap--inline">
          <table class="tbl">
            <thead><tr><th>Member</th><th>Tên</th><th>Role</th><th>Capacity</th><th>Chuyên môn</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>${rows || `<tr><td colspan="7" class="empty-cell">Chưa có thành viên. Nhấn <strong>Thêm 4 role mẫu</strong> để bắt đầu.</td></tr>`}</tbody>
          </table>
        </div>
      </section>`;
  }

  /* ───────────────────────── views: retro tab ───────────────────────── */
  const retroRole = () => S.draft.retro.role || (S.role === "tester" ? "tester" : "dev");
  const retroMember = () => S.draft.retro.member || (S.member !== "ALL" ? S.member : "");

  function viewRetro() {
    const d = S.draft.retro;
    const role = retroRole();
    const sprint = activeSprint();
    const checks = RETRO_CATEGORIES[role]
      .map(
        (c, i) =>
          `<label class="check check--block"><input type="checkbox" data-form="retro" data-field="tags" data-fk="rt:tag-${i}" value="${esc(c)}"${d.tags.includes(c) ? " checked" : ""} /> <span>${esc(c)}</span></label>`
      )
      .join("");
    return `
      <section class="panel panel--narrow">
        <header class="panel__head"><h2>Retro · ${esc(sprint)}</h2></header>
        <p class="note">Ghi điểm nghẽn và đề xuất cải tiến vào <code>board/sprints/${esc(sprint)}.md</code>.</p>
        <form class="stack" data-submit="retro" novalidate>
          <div class="form-grid form-grid--2">
            <label class="field"><span>Người báo cáo</span><input class="input" list="dl-members" data-form="retro" data-field="member" data-fk="rt:member" value="${esc(retroMember())}" placeholder="@dev-1" autocomplete="off"${invalidAttrs("retro", "member")} />${fieldErr("retro", "member")}</label>
            <label class="field"><span>Nhóm báo cáo</span><select class="select" data-form="retro" data-field="role" data-fk="rt:role" data-rerender>${opts([["dev", "4.1 DEV Retro"], ["tester", "4.2 TESTER Retro"]], role)}</select></label>
          </div>
          <fieldset class="fieldset"><legend>Điểm nghẽn gặp phải</legend>${checks}</fieldset>
          <label class="field"><span>Đề xuất cải tiến (1 dòng)</span><input class="input" data-form="retro" data-field="proposal" data-fk="rt:proposal" value="${esc(d.proposal)}" autocomplete="off"${invalidAttrs("retro", "proposal")} />${fieldErr("retro", "proposal")}</label>
          <div><button type="submit" class="btn btn--primary">Gửi vào ${esc(sprint)}.md</button></div>
        </form>
      </section>`;
  }

  /* ───────────────────────── views: drawer ───────────────────────── */
  function viewDrawer() {
    const it = S.sel && findByKey(S.sel);
    if (!it) return "";
    const work = isWork(it);
    const id = esc(it.id);
    const field = (label, html) => `<div class="field"><span>${label}</span>${html}</div>`;
    const na = moveButtons(it);
    const form = work
      ? `
        ${na ? `<div class="next"><span>Bước tiếp theo</span><div class="row">${na}</div></div>` : ""}
        <div class="form-grid form-grid--2">
          ${field("Trạng thái", `<select class="select" data-edit="status" data-id="${id}" data-fk="d:status" aria-label="Trạng thái">${opts(columns().map((c) => [c, statusLabel(c)]), it.status)}</select>`)}
          ${field("Sprint", `<input class="input" list="dl-sprints" data-edit="sprint" data-id="${id}" data-fk="d:sprint" value="${esc(it.sprint || DEFAULT_SPRINT)}" aria-label="Sprint" />`)}
          ${field("Dev", `<select class="select" data-edit="devAssignee" data-id="${id}" data-fk="d:devAssignee" aria-label="Dev">${personOpts(it.devAssignee)}</select>`)}
          ${field("QA", `<select class="select" data-edit="qaAssignee" data-id="${id}" data-fk="d:qaAssignee" aria-label="QA">${personOpts(it.qaAssignee)}</select>`)}
          ${field("Sprint target", `<select class="select" data-edit="sprintTarget" data-id="${id}" data-fk="d:sprintTarget" aria-label="Sprint target">${opts(SPRINT_TARGETS, it.sprintTarget || "DONE")}</select>`)}
          ${field(`DEV SP / QA SP · tổng ${it.totalSp || 0}`, `<div class="row"><input type="number" min="0" step="0.5" class="input input--num" data-edit="devSp" data-id="${id}" data-fk="d:devSp" value="${it.devSp || 0}" aria-label="DEV SP" /><span aria-hidden="true">/</span><input type="number" min="0" step="0.5" class="input input--num" data-edit="qaSp" data-id="${id}" data-fk="d:qaSp" value="${it.qaSp || 0}" aria-label="QA SP" /></div>`)}
        </div>`
      : `<p class="note">Mục này chỉ đọc trên Board — chỉnh sửa trong file Markdown.</p>`;
    return `
      <div class="scrim" data-act="scrim">
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dr-title">
          <header class="drawer__head">
            <div class="drawer__heading">
              <div class="row">${typeBadge(it)}<strong>${id}</strong>${statusBadge(it.status)}${work ? dorBadge(it) : ""}</div>
              <h2 id="dr-title">${esc(titleOf(it))}</h2>
            </div>
            <button type="button" class="btn btn--icon" data-act="close-drawer" data-fk="d:close" aria-label="Đóng chi tiết">${ico("close")}</button>
          </header>
          <div class="drawer__body">
            <div class="pathbar"><code>${esc(it.file || "")}</code><button type="button" class="btn btn--sm" data-act="copy" data-text="${esc(it.file || "")}" data-msg="Đã copy đường dẫn">${ico("copy")} Copy path</button></div>
            ${form}
            <section>
              <h3 class="eyebrow">Nội dung file</h3>
              <pre class="md">${esc(it.body || "Chưa có nội dung chi tiết.")}</pre>
            </section>
          </div>
          <footer class="drawer__foot"><span class="muted">${work ? "Thay đổi được lưu ngay khi chọn hoặc rời ô nhập." : ""}</span><span class="muted">${esc(savedLabel())}</span></footer>
        </aside>
      </div>`;
  }

  /* ───────────────────────── paint ───────────────────────── */
  const VIEWS = { board: viewBoardTab, sprint: viewSprint, team: viewTeam, retro: viewRetro };

  function snapshot() {
    const a = document.activeElement;
    let start = null;
    let end = null;
    try {
      if (a && typeof a.selectionStart === "number") {
        start = a.selectionStart;
        end = a.selectionEnd;
      }
    } catch (_) {
      /* number inputs expose no selection */
    }
    return {
      fk: a && a.dataset ? a.dataset.fk || null : null,
      start,
      end,
      win: window.scrollY,
      main: $("#r-main") ? $("#r-main").scrollTop : 0,
      grid: $(".kgrid") ? $(".kgrid").scrollLeft : 0,
      cols: $$(".kcol__body").map((el) => [el.closest(".kcol").dataset.col, el.scrollTop]),
      body: $("#k-body") ? $("#k-body").scrollTop : 0,
      drawer: $(".drawer__body") ? $(".drawer__body").scrollTop : 0,
    };
  }

  function restore(snap) {
    window.scrollTo(0, snap.win);
    if ($("#r-main")) $("#r-main").scrollTop = snap.main;
    if ($(".kgrid")) $(".kgrid").scrollLeft = snap.grid;
    if ($("#k-body")) $("#k-body").scrollTop = snap.body;
    for (const [col, top] of snap.cols) {
      const body = $(`.kcol[data-col="${col}"] .kcol__body`);
      if (body) body.scrollTop = top;
    }
    if ($(".drawer__body")) $(".drawer__body").scrollTop = snap.drawer;
    const fk = S.focusAfter || snap.fk;
    const sameFocus = fk === snap.fk;
    S.focusAfter = null;
    const target = fk && byFk(fk);
    if (target) {
      target.focus({ preventScroll: true });
      if (sameFocus && snap.start !== null && typeof target.setSelectionRange === "function") {
        try {
          target.setSelectionRange(snap.start, snap.end);
        } catch (_) {
          /* non-text input */
        }
      }
    }
  }

  function paint() {
    if (S.typing || S.dragKey) {
      S.deferred = true;
      return;
    }
    S.deferred = false;
    if (S.sel && !findByKey(S.sel)) S.sel = null;
    const snap = snapshot();
    const drawerOpen = Boolean(S.sel);
    $("#r-top").innerHTML = viewTop();
    $("#r-banner").innerHTML = viewBanner();
    $("#r-lists").innerHTML = viewLists();
    const main = $("#r-main");
    main.className = `main main--${S.tab}${S.tab === "board" ? ` main--${S.prefs.view}` : ""}`;
    main.innerHTML = VIEWS[S.tab]();
    $("#r-drawer").innerHTML = viewDrawer();
    for (const id of ["r-top", "r-banner", "r-main"]) $(`#${id}`).toggleAttribute("inert", drawerOpen);
    restore(snap);
  }

  /* only the board body + count (search typing must not rebuild the toolbar) */
  function paintBody() {
    const snap = snapshot();
    $("#k-body").innerHTML = viewBoardBody();
    $("#k-count").innerHTML = countHtml();
    restore(snap);
  }

  /* ───────────────────────── actions ───────────────────────── */
  function openDrawer(key) {
    S.sel = key;
    S.focusAfter = "d:close";
    paint();
  }

  function closeDrawer() {
    if (!S.sel) return;
    S.focusAfter = `open:${S.sel}`;
    S.sel = null;
    paint();
  }

  function setMember(member) {
    S.member = member;
    if (S.live) send(API.active, { member: member === "ALL" ? "" : member });
    else paint();
  }

  function resetFilters() {
    S.f = { q: "", sprint: "ALL", type: "ALL" };
    S.prefs.hideDone = false;
    savePrefs();
    if (S.member !== "ALL") setMember("ALL");
    else paint();
  }

  function saveMember(m) {
    return send(
      API.member,
      m,
      `${CLI} member ${cliQuote(m.member)} --name=${cliQuote(m.name)} --role=${m.role} --capacity=${m.capacitySp} --specialties=${cliQuote(m.specialties)} --status=${cliQuote(m.status)}`
    );
  }

  const ACT = {
    tab: (el) => {
      S.tab = el.dataset.tab;
      paint();
    },
    theme: () => {
      applyTheme(THEME_MODES[(THEME_MODES.indexOf(S.theme) + 1) % THEME_MODES.length]);
      paint();
    },
    view: (el) => {
      S.prefs.view = el.dataset.view;
      savePrefs();
      paint();
    },
    open: (el) => openDrawer(el.dataset.k),
    "close-drawer": () => closeDrawer(),
    scrim: (el, ev) => {
      if (ev.target === el) closeDrawer();
    },
    move: (el) => move(findByKey(el.dataset.k), el.dataset.to),
    expand: (el) => {
      S.expanded.add(el.dataset.col);
      S.focusAfter = `col:${el.dataset.col}`;
      paint();
    },
    collapse: (el) => {
      S.expanded.delete(el.dataset.col);
      paint();
    },
    "reset-filters": () => resetFilters(),
    copy: (el) => copyText(el.dataset.text, el.dataset.msg || "Đã copy"),
    "copy-queue": () => copyText(S.queue.join("\n"), "Đã copy lệnh đồng bộ (mỗi lệnh một dòng)"),
    "toast-close": () => {
      clearTimeout(S.toastTimer);
      $("#r-toast").innerHTML = "";
    },
    "sync-sprint": async () => {
      const id = activeSprint();
      const res = await send(API.sync, { sprintId: id }, `${CLI} sprint-sync --sprint=${cliQuote(id)}`);
      if (res.ok) toast(`Đã đồng bộ vào board/sprints/${id}.md`);
    },
    "edit-member": (el) => {
      const m = roster().find((r) => r.member === el.dataset.member);
      if (!m) return;
      S.draft.member = {
        member: m.member,
        name: m.name,
        role: m.role,
        capacitySp: String(m.capacitySp),
        specialties: m.specialties,
        status: m.status,
        err: {},
      };
      S.focusAfter = "m:name";
      paint();
    },
    "seed-team": async () => {
      const existing = new Set(roster().map((m) => m.member.toLowerCase()));
      const missing = DEFAULT_TEAM.filter((m) => !existing.has(m.member));
      if (!missing.length) {
        toast("Đã có đủ 4 role mẫu.");
        return;
      }
      for (const m of missing) {
        const res = await saveMember(m);
        if (!res.ok) return;
      }
      toast(`Đã thêm ${missing.length} thành viên mẫu vào board/TEAM.md`);
    },
  };

  /* ───────────────────────── edits & forms ───────────────────────── */
  async function onEdit(el) {
    const item = findWork(el.dataset.id);
    const field = el.dataset.edit;
    if (!item) {
      paint();
      return;
    }
    if (field === "status") {
      await move(item, el.value);
      return;
    }
    let value = el.value.trim();
    if (field === "devSp" || field === "qaSp") {
      const n = Number(value);
      if (value === "" || !Number.isFinite(n) || n < 0) {
        toast("Điểm SP phải là số ≥ 0.", "err");
        paint();
        return;
      }
      value = n;
    } else if (field === "sprint") {
      value = value.toUpperCase();
      if (value !== "BACKLOG" && !SPRINT_ID_RE.test(value)) {
        toast("Sprint chỉ gồm chữ, số, '-' hoặc '_' (vd SPRINT-02).", "err");
        paint();
        return;
      }
    }
    if (value === item[field]) {
      paint(); // value reverted to the saved one — flush anything deferred while typing
      return;
    }
    await patch(item, { [field]: value });
  }

  function onDraft(el) {
    const form = el.dataset.form;
    const field = el.dataset.field;
    const d = S.draft[form];
    if (el.type === "checkbox") {
      d[field] = el.checked ? uniq([...d[field], el.value]) : d[field].filter((v) => v !== el.value);
    } else {
      d[field] = el.value;
      if (form === "retro" && field === "role") d.tags = [];
    }
    delete d.err[field];
  }

  function invalid(form, err) {
    S.draft[form].err = err;
    S.focusAfter = `${form === "member" ? "m" : "rt"}:${Object.keys(err)[0]}`;
    paint();
  }

  const SUBMIT = {
    member: async () => {
      const d = S.draft.member;
      const err = {};
      const id = d.member.trim();
      const cap = Number(d.capacitySp);
      if (!MEMBER_ID_RE.test(id)) err.member = "Mã chỉ gồm chữ, số, '-' hoặc '_' (vd @dev-1).";
      if (d.capacitySp === "" || !Number.isFinite(cap) || cap < 1 || cap > 100) {
        err.capacitySp = "Capacity phải từ 1 đến 100 SP.";
      }
      if (Object.keys(err).length) {
        invalid("member", err);
        return;
      }
      const member = id.startsWith("@") ? id : `@${id}`;
      const res = await saveMember({
        member,
        name: d.name.trim() || member.slice(1),
        role: d.role,
        capacitySp: cap,
        specialties: d.specialties.trim() || "General",
        status: d.status,
      });
      if (res.ok) {
        S.draft.member = freshMemberDraft();
        paint();
        toast(`Đã lưu ${member} vào board/TEAM.md`);
      }
    },
    retro: async () => {
      const d = S.draft.retro;
      const err = {};
      const member = retroMember().trim();
      if (!MEMBER_ID_RE.test(member)) err.member = "Nhập mã thành viên hợp lệ (vd @dev-1).";
      if (!d.tags.length && !d.proposal.trim()) err.proposal = "Chọn ít nhất một điểm nghẽn hoặc nhập đề xuất.";
      if (Object.keys(err).length) {
        invalid("retro", err);
        return;
      }
      const sprintId = activeSprint();
      const role = retroRole();
      const proposal = d.proposal.trim();
      const res = await send(
        API.retro,
        { sprintId, member, role, bottleneckTags: d.tags, proposal },
        `${CLI} retro-input --sprint=${cliQuote(sprintId)} --member=${cliQuote(member)} --role=${role} --tags=${cliQuote(d.tags.join(","))} --proposal=${cliQuote(proposal)}`
      );
      if (res.ok) {
        d.tags = [];
        d.proposal = "";
        paint();
        toast(`Đã ghi retro của ${member} vào board/sprints/${sprintId}.md`);
      }
    },
  };

  /* ───────────────────────── events ───────────────────────── */
  function onChange(ev) {
    const el = ev.target;
    if (el.dataset.edit) {
      S.typing = false;
      onEdit(el);
    } else if (el.dataset.form) {
      onDraft(el);
      if (el.hasAttribute("data-rerender")) paint();
    } else if (el.dataset.pref) {
      S.prefs[el.dataset.pref] = el.checked;
      savePrefs();
      paint();
    } else if (el.dataset.filter === "member") {
      setMember(el.value);
    } else if (el.dataset.filter === "role") {
      S.role = el.value;
      send(API.active, { role: S.role }).then((res) => {
        if (res.ok) toast(`Đang thao tác với vai trò ${S.role.toUpperCase()}`);
      });
    } else if (el.dataset.filter === "sprint") {
      S.f.sprint = el.value;
      paint();
    } else if (el.dataset.filter === "type") {
      S.f.type = el.value;
      paint();
    }
  }

  function onInput(ev) {
    const el = ev.target;
    if (el.dataset.filter === "q") {
      S.f.q = el.value;
      paintBody();
    } else if (el.dataset.edit) {
      S.typing = true;
    } else if (el.dataset.form) {
      onDraft(el);
    }
  }

  function onFocusOut(ev) {
    if (!ev.target.dataset || !ev.target.dataset.edit) return;
    S.typing = false;
    const to = ev.relatedTarget;
    /* If focus moves to another control inside the app, a click/change is about to repaint anyway;
       repainting here would swap the node under the pointer and swallow that click. */
    if (S.deferred && !(to && $("#board-app").contains(to))) paint();
  }

  function dragClear() {
    $$(".kcol.is-drop-ok, .kcol.is-drop-blocked").forEach((c) => {
      c.classList.remove("is-drop-ok", "is-drop-blocked");
      c.removeAttribute("data-hint");
    });
  }

  function bindDrag(root) {
    root.addEventListener("dragstart", (ev) => {
      const card = ev.target.closest && ev.target.closest(".card[draggable=true]");
      if (!card) return;
      S.dragKey = card.dataset.k;
      ev.dataTransfer.setData("text/plain", S.dragKey);
      ev.dataTransfer.effectAllowed = "move";
      card.classList.add("is-dragging");
    });
    root.addEventListener("dragover", (ev) => {
      const col = ev.target.closest && ev.target.closest(".kcol");
      const item = S.dragKey && findByKey(S.dragKey);
      if (!col || !item) return;
      ev.preventDefault();
      const why = gate(item, col.dataset.col);
      ev.dataTransfer.dropEffect = why ? "none" : "move";
      dragClear();
      col.classList.add(why ? "is-drop-blocked" : "is-drop-ok");
      if (why) col.setAttribute("data-hint", why);
    });
    root.addEventListener("dragleave", (ev) => {
      const col = ev.target.closest && ev.target.closest(".kcol");
      if (col && !col.contains(ev.relatedTarget)) {
        col.classList.remove("is-drop-ok", "is-drop-blocked");
        col.removeAttribute("data-hint");
      }
    });
    root.addEventListener("drop", (ev) => {
      const col = ev.target.closest && ev.target.closest(".kcol");
      const item = S.dragKey && findByKey(S.dragKey);
      if (!col || !item) return;
      ev.preventDefault();
      dragClear();
      S.dragKey = null;
      move(item, col.dataset.col);
    });
    root.addEventListener("dragend", () => {
      dragClear();
      S.dragKey = null;
      if (S.deferred) paint();
    });
  }

  function onKeydown(ev) {
    if (ev.key === "Escape" && S.sel) {
      ev.preventDefault();
      closeDrawer();
      return;
    }
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (ev.key === "/" && S.tab === "board" && !S.sel && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
      const search = byFk("tb:q");
      if (search) {
        ev.preventDefault();
        search.focus();
      }
    }
  }

  function bind(root) {
    root.addEventListener("click", (ev) => {
      const el = ev.target.closest("[data-act]");
      if (el && root.contains(el)) ACT[el.dataset.act]?.(el, ev);
    });
    root.addEventListener("change", onChange);
    root.addEventListener("input", onInput);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("submit", (ev) => {
      ev.preventDefault();
      SUBMIT[ev.target.dataset.submit]?.();
    });
    bindDrag(root);
    document.addEventListener("keydown", onKeydown);
  }

  /* ───────────────────────── boot ───────────────────────── */
  async function boot() {
    const root = $("#board-app");
    if (!root) return;
    loadPrefs();
    try {
      applyTheme(localStorage.getItem(THEME_KEY) || "auto");
    } catch (_) {
      applyTheme("auto");
    }
    root.innerHTML = `
      <header class="topbar" id="r-top"></header>
      <div id="r-banner"></div>
      <div id="r-lists" hidden></div>
      <main class="main" id="r-main"></main>
      <div id="r-drawer"></div>
      <div class="toasts" id="r-toast" role="status" aria-live="polite"></div>`;
    bind(root);
    if (S.live) S.conn = "connecting"; // until the event stream confirms
    paint();
    if (S.live) {
      await fetchState();
      paint();
      connectEvents();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
