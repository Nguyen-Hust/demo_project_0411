#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = path.resolve(SCRIPT_DIR, "..");

export const BOARD_DIR_NAME = "board";

export const BOARD_COLUMNS = [
  "BACKLOG",
  "READY_FOR_DEV",
  "IN_PROGRESS",
  "PENDING_BA",
  "PENDING_TL",
  "READY_FOR_QA",
  "IN_DEV_FIX",
  "IN_RETEST",
  "DONE",
];

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) {
      meta[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return meta;
}

export function parseEstimate(text) {
  if (!text) return { totalSp: 0, devSp: 0, qaSp: 0, hasTwoStage: false };
  const raw = String(text);
  const twoStage = raw.match(
    /(\d+(?:\.\d+)?)\s*SP\s*\(\s*DEV:\s*(\d+(?:\.\d+)?)\s*SP\s*\|\s*QA:\s*(\d+(?:\.\d+)?)\s*SP\s*\)/i
  );
  if (twoStage) {
    return {
      totalSp: Number(twoStage[1]),
      devSp: Number(twoStage[2]),
      qaSp: Number(twoStage[3]),
      hasTwoStage: true,
    };
  }
  const devQaOnly = raw.match(/DEV:\s*(\d+(?:\.\d+)?)\s*SP\s*\|\s*QA:\s*(\d+(?:\.\d+)?)\s*SP/i);
  if (devQaOnly) {
    const devSp = Number(devQaOnly[1]);
    const qaSp = Number(devQaOnly[2]);
    return { totalSp: devSp + qaSp, devSp, qaSp, hasTwoStage: true };
  }
  const single = raw.match(/(\d+(?:\.\d+)?)\s*SP/i);
  if (single) {
    const totalSp = Number(single[1]);
    return { totalSp, devSp: totalSp, qaSp: 0, hasTwoStage: false };
  }
  return { totalSp: 0, devSp: 0, qaSp: 0, hasTwoStage: false };
}

function extractDualField(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^(?:\\*\\*${escaped}:\\*\\*|-\\s*${escaped}:|${escaped}:)\\s*(.+)$`, "im");
  const m = content.match(re);
  return m ? m[1].trim() : "";
}

export function parseTicketMetadata(content, fallbackFile = "") {
  const meta = parseFrontmatter(content);
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const rawTitle = meta.title || meta.name || (titleMatch ? titleMatch[1].trim() : fallbackFile);
  const idFromTitle = rawTitle.match(/^([A-Z]+-\d+(?:-[A-Z0-9]+)*|\d+)\s*:/i);
  const baseId = fallbackFile ? fallbackFile.replace(/\.md$/i, "") : "";
  const canonicalIdMatch = baseId.match(/^(F-\d+-T\d+|BUG-P-\d+-T\d+|F-\d+-BUG-D-\d+|BUG-D-\d+)/i);
  const id = canonicalIdMatch
    ? canonicalIdMatch[1].toUpperCase()
    : idFromTitle
      ? idFromTitle[1]
      : baseId || "TICKET";

  const statusRaw =
    extractDualField(content, "Status") ||
    meta.Status ||
    (content.match(/\bStatus:\s*([A-Z_]+)/i)?.[1] ?? "READY_FOR_DEV");
  const status = statusRaw.toUpperCase();
  const sprint = extractDualField(content, "Sprint") || meta.Sprint || "BACKLOG";
  const sprintTarget = (extractDualField(content, "Sprint Target") || meta.SprintTarget || "DONE").toUpperCase();
  const devAssignee = extractDualField(content, "Dev Assignee") || meta.DevAssignee || "@unassigned";
  const qaAssignee = extractDualField(content, "QA Assignee") || meta.QaAssignee || "@unassigned";
  const estimateRaw = extractDualField(content, "Estimate") || meta.Estimate || "0 SP (DEV: 0 SP | QA: 0 SP)";
  const estimate = parseEstimate(estimateRaw);

  return {
    id,
    title: rawTitle,
    status: BOARD_COLUMNS.includes(status) ? status : "READY_FOR_DEV",
    rawStatus: status,
    sprint,
    sprintTarget,
    devAssignee,
    qaAssignee,
    estimateRaw,
    ...estimate,
  };
}

function upsertDualField(content, label, newValue) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boldRe = new RegExp(`^(\\*\\*${escaped}:\\*\\*\\s*)(.+)$`, "im");
  if (boldRe.test(content)) {
    return content.replace(boldRe, `$1${newValue}`);
  }
  const bulletRe = new RegExp(`^(-\\s*${escaped}:\\s*)(.+)$`, "im");
  if (bulletRe.test(content)) {
    return content.replace(bulletRe, `$1${newValue}`);
  }
  if (/^\*\*Serves:\*\*/m.test(content)) {
    return content.replace(/^(\*\*Serves:\*\*[^\n]*\n)/m, `$1- ${label}: ${newValue}\n`);
  }
  const lines = content.split(/\r?\n/);
  lines.splice(1, 0, `**${label}:** ${newValue}`);
  return lines.join("\n");
}

export function mutateTicketFields(ticketPath, fields = {}, { role = "dev" } = {}) {
  if (!fs.existsSync(ticketPath)) {
    return { ok: false, statusCode: 404, error: `Ticket file not found: ${ticketPath}` };
  }
  let content = fs.readFileSync(ticketPath, "utf8");
  const current = parseTicketMetadata(content, path.basename(ticketPath));
  const normRole = String(role || "dev").toLowerCase();

  if (fields.status !== undefined) {
    const nextStatus = String(fields.status).trim().toUpperCase();
    if ((nextStatus === "DONE" || nextStatus === "CLOSED") && normRole !== "tester") {
      return {
        ok: false,
        statusCode: 403,
        error: `Four-Eyes Gate: role '${normRole}' cannot set Status to ${nextStatus} (only 'tester' allowed).`,
      };
    }
    if (current.rawStatus === "PENDING_BA" && nextStatus !== "PENDING_BA" && normRole !== "ba") {
      return {
        ok: false,
        statusCode: 403,
        error: `Four-Eyes Gate: role '${normRole}' cannot unlock PENDING_BA (only 'ba' allowed).`,
      };
    }
    if (current.rawStatus === "PENDING_TL" && nextStatus !== "PENDING_TL" && normRole !== "tl") {
      return {
        ok: false,
        statusCode: 403,
        error: `Four-Eyes Gate: role '${normRole}' cannot unlock PENDING_TL (only 'tl' allowed).`,
      };
    }
    content = upsertDualField(content, "Status", nextStatus);
  }
  if (fields.sprint !== undefined) {
    content = upsertDualField(content, "Sprint", String(fields.sprint).trim());
  }
  if (fields.sprintTarget !== undefined) {
    content = upsertDualField(content, "Sprint Target", String(fields.sprintTarget).trim().toUpperCase());
  }
  if (fields.devAssignee !== undefined) {
    content = upsertDualField(content, "Dev Assignee", String(fields.devAssignee).trim());
  }
  if (fields.qaAssignee !== undefined) {
    content = upsertDualField(content, "QA Assignee", String(fields.qaAssignee).trim());
  }
  if (fields.estimate !== undefined) {
    content = upsertDualField(content, "Estimate", String(fields.estimate).trim());
  } else if (fields.devSp !== undefined || fields.qaSp !== undefined) {
    const devSp = fields.devSp !== undefined ? Number(fields.devSp) : current.devSp;
    const qaSp = fields.qaSp !== undefined ? Number(fields.qaSp) : current.qaSp;
    const totalSp = devSp + qaSp;
    content = upsertDualField(content, "Estimate", `${totalSp} SP (DEV: ${devSp} SP | QA: ${qaSp} SP)`);
  }

  fs.writeFileSync(ticketPath, content, "utf8");
  return { ok: true, statusCode: 200, ticketPath };
}

export function nextId(projectRoot = process.cwd(), kind = "FEATURE", { featureId = "F-001" } = {}) {
  const upperKind = String(kind).toUpperCase();
  const boardDir = path.join(projectRoot, BOARD_DIR_NAME);

  if (upperKind === "SPRINT") {
    const sprintsDir = path.join(boardDir, "sprints");
    let max = 0;
    if (fs.existsSync(sprintsDir)) {
      for (const f of fs.readdirSync(sprintsDir)) {
        const m = f.match(/^SPRINT-(\d+)/i);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    return `SPRINT-${String(max + 1).padStart(2, "0")}`;
  }

  if (upperKind === "FEATURE") {
    const featuresDir = path.join(boardDir, "features");
    let max = 0;
    if (fs.existsSync(featuresDir)) {
      for (const f of fs.readdirSync(featuresDir)) {
        const m = f.match(/^F-(\d+)/i);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    return `F-${String(max + 1).padStart(3, "0")}`;
  }

  if (upperKind === "BUG_P") {
    const bugfixDir = path.join(boardDir, "bugfix");
    let max = 0;
    if (fs.existsSync(bugfixDir)) {
      for (const f of fs.readdirSync(bugfixDir)) {
        const m = f.match(/^BUG-P-(\d+)/i);
        if (m) max = Math.max(max, Number(m[1]));
      }
    }
    return `BUG-P-${String(max + 1).padStart(3, "0")}`;
  }

  const normFeature = String(featureId || "F-001").toUpperCase();
  const featureDirs = [];
  const featuresRoot = path.join(boardDir, "features");
  if (fs.existsSync(featuresRoot)) {
    for (const d of fs.readdirSync(featuresRoot)) {
      if (d.toUpperCase().startsWith(normFeature)) {
        featureDirs.push(path.join(featuresRoot, d));
      }
    }
  }

  if (upperKind === "TICKET") {
    let max = 0;
    for (const fDir of featureDirs) {
      const tDir = path.join(fDir, "tickets");
      if (fs.existsSync(tDir)) {
        for (const f of fs.readdirSync(tDir)) {
          const m = f.match(new RegExp(`^${normFeature}-T(\\d+)`, "i")) || f.match(/^T?(\d+)/i);
          if (m) max = Math.max(max, Number(m[1]));
        }
      }
    }
    return `${normFeature}-T${String(max + 1).padStart(2, "0")}`;
  }

  if (upperKind === "Q_BA" || upperKind === "Q_TL") {
    const tag = upperKind === "Q_BA" ? "Q-BA" : "Q-TL";
    const fileName = upperKind === "Q_BA" ? "questionnaire-ba.md" : "questionnaire-tl.md";
    let max = 0;
    for (const fDir of featureDirs) {
      const qFile = path.join(fDir, fileName);
      if (fs.existsSync(qFile)) {
        const text = fs.readFileSync(qFile, "utf8");
        const re = new RegExp(`${normFeature}-${tag}-(\\d+)`, "gi");
        for (const m of text.matchAll(re)) {
          max = Math.max(max, Number(m[1]));
        }
      }
    }
    return `${normFeature}-${tag}-${String(max + 1).padStart(2, "0")}`;
  }

  if (upperKind === "BUG_D") {
    let max = 0;
    for (const fDir of featureDirs) {
      const bDir = path.join(fDir, "bugs");
      if (fs.existsSync(bDir)) {
        for (const f of fs.readdirSync(bDir)) {
          const m = f.match(new RegExp(`${normFeature}-BUG-D-(\\d+)`, "i")) || f.match(/BUG-D-(\d+)/i);
          if (m) max = Math.max(max, Number(m[1]));
        }
      }
    }
    return `${normFeature}-BUG-D-${String(max + 1).padStart(2, "0")}`;
  }

  return `${normFeature}-01`;
}

export function parseTeamRoster(projectRoot = process.cwd()) {
  const teamPath = path.join(projectRoot, BOARD_DIR_NAME, "TEAM.md");
  if (!fs.existsSync(teamPath)) return [];
  const text = fs.readFileSync(teamPath, "utf8");
  const members = [];
  let inActive = false;

  for (const line of text.split(/\r?\n/)) {
    if (/^##\s+1\.\s+Active Members/i.test(line)) {
      inActive = true;
      continue;
    }
    if (/^##\s+/.test(line) && inActive) {
      break;
    }
    if (!inActive || !line.trim().startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 4) continue;
    if (/^:?---/.test(cells[0]) || /^Member$/i.test(cells[0])) continue;
    const [member, name, role, capRaw, specialties = "", status = "Active"] = cells;
    if (!member) continue;
    members.push({
      member: member.startsWith("@") ? member : `@${member}`,
      name,
      role: role.toLowerCase(),
      capacitySp: Number(String(capRaw).replace(/[^0-9.]/g, "")) || 0,
      specialties,
      status,
    });
  }
  return members;
}

export function upsertTeamMember(projectRoot = process.cwd(), memberObj = {}) {
  const boardDir = path.join(projectRoot, BOARD_DIR_NAME);
  fs.mkdirSync(boardDir, { recursive: true });
  const teamPath = path.join(boardDir, "TEAM.md");
  const existing = parseTeamRoster(projectRoot);
  const normId = String(memberObj.member || "@member").startsWith("@")
    ? String(memberObj.member)
    : `@${memberObj.member}`;

  const entry = {
    member: normId,
    name: memberObj.name || normId.slice(1),
    role: String(memberObj.role || "dev").toLowerCase(),
    capacitySp: Number(memberObj.capacitySp ?? 10),
    specialties: memberObj.specialties || "General",
    status: memberObj.status || "Active",
  };

  const idx = existing.findIndex((m) => m.member.toLowerCase() === normId.toLowerCase());
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...entry };
  } else {
    existing.push(entry);
  }

  let velocitySection = [
    "## 2. Velocity History",
    "",
    "| Sprint | Committed SP | Completed SP | Escaped Bugs | Notes |",
    "| :--- | :--- | :--- | :--- | :--- |",
  ].join("\n");

  if (fs.existsSync(teamPath)) {
    const raw = fs.readFileSync(teamPath, "utf8");
    const vIdx = raw.indexOf("## 2. Velocity History");
    if (vIdx >= 0) velocitySection = raw.slice(vIdx).trimEnd();
  }

  const rows = existing.map(
    (m) => `| ${m.member} | ${m.name} | ${m.role} | ${m.capacitySp} | ${m.specialties} | ${m.status} |`
  );

  const out = [
    "# Team Roster & Capacity",
    "",
    "## 1. Active Members",
    "",
    "| Member | Name | Role | Default Sprint Capacity (SP) | Specialties | Status |",
    "| :--- | :--- | :--- | :--- | :--- | :--- |",
    ...rows,
    "",
    velocitySection,
    "",
  ].join("\n");

  fs.writeFileSync(teamPath, out, "utf8");
  return { ok: true, filePath: teamPath, members: existing };
}

function collectAllFeatureContainers(projectRoot) {
  const containers = [];
  const boardDir = path.join(projectRoot, BOARD_DIR_NAME);

  for (const sub of ["features", "bugfix"]) {
    const rootSub = path.join(boardDir, sub);
    if (fs.existsSync(rootSub)) {
      for (const slug of fs.readdirSync(rootSub)) {
        const abs = path.join(rootSub, slug);
        if (fs.statSync(abs).isDirectory()) {
          containers.push({ slug, relPrefix: `${BOARD_DIR_NAME}/${sub}/${slug}`, absDir: abs });
        }
      }
    }
  }

  if (fs.existsSync(boardDir)) {
    const reserved = new Set(["features", "bugfix", "sprints", "assets", "scripts"]);
    for (const slug of fs.readdirSync(boardDir)) {
      if (reserved.has(slug)) continue;
      const abs = path.join(boardDir, slug);
      if (fs.statSync(abs).isDirectory()) {
        containers.push({ slug, relPrefix: `${BOARD_DIR_NAME}/${slug}`, absDir: abs });
      }
    }
  }

  return containers;
}

export function computeSprintCapacity(projectRoot = process.cwd(), sprintId = "SPRINT-01") {
  const roster = parseTeamRoster(projectRoot);
  const memberMap = new Map();
  for (const m of roster) {
    memberMap.set(m.member.toLowerCase(), { ...m, assignedSp: 0 });
  }

  const rolloverQaTickets = [];
  const containers = collectAllFeatureContainers(projectRoot);

  for (const c of containers) {
    const ticketsDir = path.join(c.absDir, "tickets");
    if (!fs.existsSync(ticketsDir)) continue;
    for (const file of fs.readdirSync(ticketsDir)) {
      if (!file.endsWith(".md")) continue;
      const content = fs.readFileSync(path.join(ticketsDir, file), "utf8");
      const meta = parseTicketMetadata(content, file);
      if (meta.sprint.toUpperCase() !== String(sprintId).toUpperCase()) continue;

      const devKey = meta.devAssignee.toLowerCase();
      const qaKey = meta.qaAssignee.toLowerCase();

      const ensureMember = (key, handle, defaultRole) => {
        if (!key || key === "@unassigned") return null;
        if (!memberMap.has(key)) {
          memberMap.set(key, {
            member: handle,
            name: handle.replace(/^@/, ""),
            role: defaultRole,
            capacitySp: 10,
            specialties: "",
            status: "Active",
            assignedSp: 0,
          });
        }
        return memberMap.get(key);
      };

      if (meta.sprintTarget === "DONE") {
        const devM = ensureMember(devKey, meta.devAssignee, "dev");
        if (devM) devM.assignedSp += meta.devSp;
        const qaM = ensureMember(qaKey, meta.qaAssignee, "tester");
        if (qaM) qaM.assignedSp += meta.qaSp;
      } else if (meta.sprintTarget === "DEV_DONE") {
        const devM = ensureMember(devKey, meta.devAssignee, "dev");
        if (devM) devM.assignedSp += meta.devSp;
        if (meta.qaSp > 0) rolloverQaTickets.push(meta.id);
      } else if (meta.sprintTarget === "TECH_PLANNED") {
        const devM = ensureMember(devKey, meta.devAssignee, "dev");
        if (devM) devM.assignedSp += Math.ceil(meta.devSp * 0.2);
      }
    }
  }

  const members = [...memberMap.values()].map((m) => {
    const status =
      m.capacitySp > 0 && m.assignedSp > m.capacitySp
        ? "OVER_CAPACITY"
        : m.capacitySp > 0 && m.assignedSp >= m.capacitySp * 0.85
          ? "WARN"
          : "OK";
    return { ...m, status };
  });

  return {
    sprintId,
    members,
    rolloverQaTickets: rolloverQaTickets.sort(),
  };
}

export function buildBoardHtml(state, projectRoot = process.cwd()) {
  const safeJson = JSON.stringify(state).replace(/</g, "\\u003c");

  let cssContent = "";
  let jsContent = "";

  const localCss = path.join(projectRoot, BOARD_DIR_NAME, "assets", "board-ui.css");
  const fallbackCss = path.join(SOURCE_ROOT, BOARD_DIR_NAME, "assets", "board-ui.css");
  const localJs = path.join(projectRoot, BOARD_DIR_NAME, "assets", "board-ui.js");
  const fallbackJs = path.join(SOURCE_ROOT, BOARD_DIR_NAME, "assets", "board-ui.js");

  if (fs.existsSync(localCss)) {
    cssContent = fs.readFileSync(localCss, "utf8");
  } else if (fs.existsSync(fallbackCss)) {
    cssContent = fs.readFileSync(fallbackCss, "utf8");
  }

  if (fs.existsSync(localJs)) {
    jsContent = fs.readFileSync(localJs, "utf8");
  } else if (fs.existsSync(fallbackJs)) {
    jsContent = fs.readFileSync(fallbackJs, "utf8");
  }

  const existingHtmlPath = path.join(projectRoot, BOARD_DIR_NAME, "BOARD.html");
  if ((!cssContent || !jsContent) && fs.existsSync(existingHtmlPath)) {
    try {
      const existingHtml = fs.readFileSync(existingHtmlPath, "utf8");
      if (!cssContent) {
        const mCss = existingHtml.match(/<style id="board-ui-css">([\s\S]*?)<\/style>/i);
        if (mCss) cssContent = mCss[1].trim();
      }
      if (!jsContent) {
        const mJs = existingHtml.match(/<script id="board-ui-js">([\s\S]*?)<\/script>/i);
        if (mJs) jsContent = mJs[1].trim();
      }
    } catch {}
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Studio V3 — Team Scrum & DDD Board</title>
  <style id="board-ui-css">
${cssContent}
  </style>
</head>
<body>
  <div id="board-app"></div>
  <script>window.__BOARD_STATE__ = ${safeJson};</script>
  <script id="board-ui-js">
${jsContent}
  </script>
</body>
</html>
`;
}

export function collectBoardState(projectRoot = process.cwd()) {
  const items = [];
  const containers = collectAllFeatureContainers(projectRoot);

  for (const c of containers) {
    const { slug, relPrefix, absDir } = c;
    const ticketsDir = path.join(absDir, "tickets");
    if (fs.existsSync(ticketsDir)) {
      for (const file of fs.readdirSync(ticketsDir)) {
        if (!file.endsWith(".md")) continue;
        const fullPath = path.join(ticketsDir, file);
        const content = fs.readFileSync(fullPath, "utf8");
        const meta = parseTicketMetadata(content, file);
        const sprintGoalMet =
          meta.status === "DONE" ||
          (meta.sprintTarget === "DEV_DONE" &&
            (meta.status === "READY_FOR_QA" || meta.status === "IN_RETEST" || meta.status === "DONE"));
        items.push({
          id: meta.id,
          rawFileId: file.replace(/\.md$/, ""),
          type: "TICKET",
          slug,
          status: meta.status,
          title: meta.title,
          sprint: meta.sprint,
          sprintTarget: meta.sprintTarget,
          sprintGoalMet,
          devAssignee: meta.devAssignee,
          qaAssignee: meta.qaAssignee,
          totalSp: meta.totalSp,
          devSp: meta.devSp,
          qaSp: meta.qaSp,
          body: content,          file: `${relPrefix}/tickets/${file}`,
          absPath: fullPath,
        });
      }
    }

    const bugsDir = path.join(absDir, "bugs");
    if (fs.existsSync(bugsDir)) {
      for (const file of fs.readdirSync(bugsDir)) {
        if (!file.endsWith(".md")) continue;
        const fullPath = path.join(bugsDir, file);
        const content = fs.readFileSync(fullPath, "utf8");
        const meta = parseTicketMetadata(content, file);
        const status = BOARD_COLUMNS.includes(meta.rawStatus) ? meta.rawStatus : "IN_DEV_FIX";
        items.push({
          id: file.replace(/\.md$/, ""),
          type: "BUG",
          slug,
          status,
          title: meta.title,
          sprint: meta.sprint,
          sprintTarget: meta.sprintTarget,
          devAssignee: meta.devAssignee,
          qaAssignee: meta.qaAssignee,
          totalSp: meta.totalSp,
          devSp: meta.devSp,
          qaSp: meta.qaSp,
          body: content,          file: `${relPrefix}/bugs/${file}`,
          absPath: fullPath,
        });
      }
    }

    for (const [qFile, qStatus, qRegex] of [
      ["questionnaire-ba.md", "PENDING_BA", /###?\s+((?:F-\d+-)?Q-BA-\d+[^:\n]*)(?::\s*([^\n]+))?/gi],
      ["questionnaire-tl.md", "PENDING_TL", /###?\s+((?:F-\d+-)?Q-TL-\d+[^:\n]*)(?::\s*([^\n]+))?/gi],
    ]) {
      const qPath = path.join(absDir, qFile);
      if (fs.existsSync(qPath)) {
        const qContent = fs.readFileSync(qPath, "utf8");
        const matches = qContent.match(qRegex);
        if (matches) {
          for (const qm of matches) {
            const clean = qm.replace(/^###?\s+/, "");
            const parts = clean.split(/:\s*/);
            const qId = parts[0].trim();
            const qTitle = parts[1] ? parts[1].trim() : qId;
            items.push({
              id: qId,
              type: "QUESTION",
              slug,
              status: qStatus,
              title: qTitle,
              body: qContent,              file: `${relPrefix}/${qFile}`,
              absPath: qPath,
            });
          }
        }
      }
    }
  }

  const backlogPath = fs.existsSync(path.join(projectRoot, BOARD_DIR_NAME, "BACKLOG.md"))
    ? path.join(projectRoot, BOARD_DIR_NAME, "BACKLOG.md")
    : path.join(projectRoot, ".ai-studio", "memory", "BACKLOG.md");

  if (fs.existsSync(backlogPath)) {
    const backlogContent = fs.readFileSync(backlogPath, "utf8");
    const lines = backlogContent.split(/\r?\n/);
    let inSection = false;
    for (const line of lines) {
      if (/^##\s+Backlog/i.test(line)) {
        inSection = true;
        continue;
      } else if (/^##\s+/.test(line) && inSection) {
        inSection = false;
      }
      if (inSection) {
        const itemMatch = line.match(/^[-*]\s+(?:\[\s*\]\s*)?(\[[A-Z_]+\]|[A-Z0-9_-]+:?)\s*(.+)$/i);
        if (itemMatch) {
          const rawTag = itemMatch[1].replace(/[[\]:]/g, "").trim();
          const title = itemMatch[2].trim();
          items.push({
            id: rawTag || "BACKLOG-ITEM",
            type: "BACKLOG",
            slug: "global",
            status: "BACKLOG",
            title,
            file: `${BOARD_DIR_NAME}/BACKLOG.md`,
          });
        }
      }
    }
  }

  items.sort((a, b) => {
    const idxA = BOARD_COLUMNS.indexOf(a.status);
    const idxB = BOARD_COLUMNS.indexOf(b.status);
    if (idxA !== idxB) return idxA - idxB;
    return a.id.localeCompare(b.id);
  });

  const roster = parseTeamRoster(projectRoot);
  const activeSprint =
    items.find((it) => it.sprint && it.sprint !== "BACKLOG")?.sprint || "SPRINT-01";
  const capacity = computeSprintCapacity(projectRoot, activeSprint);

  return {
    updatedAt: new Date().toISOString(),
    columns: BOARD_COLUMNS,
    activeSprint,
    roster,
    capacity,
    items: items.map(({ absPath, ...rest }) => rest),
    _itemsWithPaths: items,
  };
}

export function updateBoard(projectRoot = process.cwd(), { hideDone = false } = {}) {
  const state = collectBoardState(projectRoot);
  const items = state.items;
  const visibleItems = hideDone
    ? items.filter((it) => it.status !== "DONE" && it.status !== "CLOSED")
    : items;

  const boardDir = path.join(projectRoot, BOARD_DIR_NAME);
  fs.mkdirSync(boardDir, { recursive: true });
  const boardPath = path.join(boardDir, "BOARD.md");
  const htmlPath = path.join(boardDir, "BOARD.html");

  const lines = [
    "# Team Kanban Board",
    `*Last Updated: ${state.updatedAt}*`,
    ...(hideDone ? ["*(DONE items hidden via `--hide-done`)*"] : []),
    "",
    "| Column | Item | Type | Slug | Sprint | Target | Assignee (DEV / QA) | Estimate | Title | File |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
  ];

  if (visibleItems.length === 0) {
    lines.push("| *(empty)* | - | - | - | - | - | - | - | No active tickets or bugs | - |");
  } else {
    for (const item of visibleItems) {
      const sprint = item.sprint || "-";
      const target = item.sprintTarget || "-";
      const assignees =
        item.devAssignee || item.qaAssignee
          ? `${item.devAssignee || "@unassigned"} / ${item.qaAssignee || "@unassigned"}`
          : "-";
      const est = item.totalSp !== undefined ? `${item.totalSp} SP (${item.devSp}/${item.qaSp})` : "-";
      const colLabel =
        item.sprintTarget === "DEV_DONE" && item.status === "READY_FOR_QA"
          ? `**${item.status}** *(DEV_DONE ✓)*`
          : `**${item.status}**`;
      lines.push(
        `| ${colLabel} | ${item.id} | ${item.type} | ${item.slug} | ${sprint} | ${target} | ${assignees} | ${est} | ${item.title.replace(/\|/g, "\\|")} | [${item.file}](${item.file}) |`
      );
    }
  }

  lines.push("");
  fs.writeFileSync(boardPath, lines.join("\n"), "utf8");
  const { _itemsWithPaths, ...publicState } = state;
  fs.writeFileSync(htmlPath, buildBoardHtml(publicState, projectRoot), "utf8");
  return { ok: true, boardPath, htmlPath, count: visibleItems.length, state: publicState };
}

function findTicketFileById(projectRoot, ticketId) {
  const norm = String(ticketId || "").trim().toUpperCase();
  const state = collectBoardState(projectRoot);
  for (const item of state._itemsWithPaths) {
    if (
      item.id.toUpperCase() === norm ||
      (item.rawFileId && item.rawFileId.toUpperCase() === norm) ||
      (item.rawFileId && item.rawFileId.toUpperCase().startsWith(norm))
    ) {
      return item.absPath;
    }
  }
  return null;
}

export function appendSprintRetroInput(
  projectRoot = process.cwd(),
  sprintId = "SPRINT-01",
  { member = "@member", role = "dev", bottleneckTags = [], proposal = "" } = {}
) {
  const sprintsDir = path.join(projectRoot, BOARD_DIR_NAME, "sprints");
  fs.mkdirSync(sprintsDir, { recursive: true });
  const sprintPath = path.join(sprintsDir, `${sprintId}.md`);
  const normRole = String(role || "dev").toLowerCase();
  const header =
    normRole === "tester"
      ? "### 4.2 TESTER Sprint Retro Reports (5 Categories)"
      : "### 4.1 DEV Sprint Retro Reports (5 Categories)";

  if (!fs.existsSync(sprintPath)) {
    fs.writeFileSync(
      sprintPath,
      [
        `# ${sprintId} — Sprint Plan & Retro Ledger`,
        "",
        "## 1. Sprint Metadata & Goal",
        `- Sprint ID: ${sprintId}`,
        "",
        "## 2. Member Capacity & Workload Allocation",
        "",
        "## 3. Committed Sprint Backlog",
        "",
        "## 4. Continuous Team Synthesis Log & Role Retro Reports",
        "",
        "### 4.1 DEV Sprint Retro Reports (5 Categories)",
        "",
        "### 4.2 TESTER Sprint Retro Reports (5 Categories)",
        "",
        "## 5. Rollover & Closeout Summary",
        "",
      ].join("\n"),
      "utf8"
    );
  }

  let content = fs.readFileSync(sprintPath, "utf8");
  const tagsStr = Array.isArray(bottleneckTags) && bottleneckTags.length > 0 ? bottleneckTags.join("; ") : "None";
  const entryLines = [
    `- **${member}** (\`role: ${normRole}\`, ${new Date().toISOString().slice(0, 10)}):`,
    `  - Bottleneck Tags: ${tagsStr}`,
    `  - Improvement Proposal: ${proposal || "N/A"}`,
  ].join("\n");

  if (content.includes(header)) {
    content = content.replace(header, `${header}\n${entryLines}`);
  } else {
    content = `${content.trimEnd()}\n\n## 4. Continuous Team Synthesis Log & Role Retro Reports\n\n${header}\n${entryLines}\n`;
  }

  fs.writeFileSync(sprintPath, content, "utf8");
  return { ok: true, sprintPath };
}

export function syncSprintMarkdown(projectRoot = process.cwd(), sprintId = "SPRINT-01") {
  const sprintsDir = path.join(projectRoot, BOARD_DIR_NAME, "sprints");
  fs.mkdirSync(sprintsDir, { recursive: true });
  const sprintPath = path.join(sprintsDir, `${sprintId}.md`);
  const state = collectBoardState(projectRoot);
  const cap = computeSprintCapacity(projectRoot, sprintId);
  const sprintTickets = (state.items || []).filter(
    (it) => it.type === "TICKET" && String(it.sprint || "").toUpperCase() === String(sprintId).toUpperCase()
  );

  let retroSection = [
    "## 4. Continuous Team Synthesis Log & Role Retro Reports",
    "",
    "### 4.1 DEV Sprint Retro Reports (5 Categories)",
    "",
    "### 4.2 TESTER Sprint Retro Reports (5 Categories)",
    "",
    "## 5. Rollover & Closeout Summary",
  ].join("\n");

  if (fs.existsSync(sprintPath)) {
    const existing = fs.readFileSync(sprintPath, "utf8");
    const idx = existing.indexOf("## 4. Continuous Team Synthesis Log & Role Retro Reports");
    if (idx >= 0) {
      retroSection = existing.slice(idx).trimEnd();
    }
  }

  const capRows = cap.members.map((m) => {
    const pct = m.capacitySp > 0 ? `${Math.round((m.assignedSp / m.capacitySp) * 100)}% (${m.status})` : m.status;
    return `| ${m.member} | \`${m.role}\` | ${m.capacitySp} | ${m.assignedSp} | ${pct} |`;
  });

  const ticketRows = sprintTickets.map(
    (t) =>
      `| \`${t.id}\` | \`${t.slug}\` | ${t.title.replace(/\|/g, "\\|")} | ${t.devAssignee} | ${t.qaAssignee} | ${t.devSp} | ${t.qaSp} | ${t.totalSp} | \`${t.sprintTarget}\` | \`${t.status}\` |`
  );

  const out = [
    `# ${sprintId} — Sprint Plan & Retro Ledger`,
    "",
    "## 1. Sprint Metadata & Goal",
    `- **Sprint ID:** \`${sprintId}\``,
    `- **Status:** \`ACTIVE\``,
    "",
    "## 2. Member Capacity & Workload Allocation",
    "| Member | Role | Sprint Capacity (SP) | Total Assigned SP | Utilization |",
    "| :--- | :--- | :--- | :--- | :--- |",
    ...(capRows.length > 0 ? capRows : ["| *(chưa có thành viên)* | - | 0 | 0 | - |"]),
    "",
    "## 3. Committed Sprint Backlog",
    "| Ticket ID | Feature Slug | Title | Dev Assignee | QA Assignee | DEV SP | QA SP | Total SP | Sprint Target | Status |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    ...(ticketRows.length > 0 ? ticketRows : ["| *(chưa có ticket)* | - | - | - | - | 0 | 0 | 0 | - | - |"]),
    "",
    retroSection,
    "",
  ].join("\n");

  fs.writeFileSync(sprintPath, out, "utf8");
  return { ok: true, sprintPath };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function detectEffectiveRole(projectRoot, explicitRole) {
  if (explicitRole) return String(explicitRole).trim().toLowerCase();
  const localRole = path.join(projectRoot, BOARD_DIR_NAME, ".role");
  if (fs.existsSync(localRole)) return fs.readFileSync(localRole, "utf8").trim().toLowerCase();
  const altRole = path.join(projectRoot, ".ai-studio", ".role");
  if (fs.existsSync(altRole)) return fs.readFileSync(altRole, "utf8").trim().toLowerCase();
  return "dev";
}

export function scaffoldBoardProject(projectRoot = process.cwd()) {
  const boardDir = path.join(projectRoot, BOARD_DIR_NAME);
  const featuresDir = path.join(boardDir, "features");
  const sprintsDir = path.join(boardDir, "sprints");
  const bugfixDir = path.join(boardDir, "bugfix");
  const assetsDir = path.join(boardDir, "assets");
  fs.mkdirSync(featuresDir, { recursive: true });
  fs.mkdirSync(sprintsDir, { recursive: true });
  fs.mkdirSync(bugfixDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  const currentScript = fileURLToPath(import.meta.url);
  const targetScript = path.join(boardDir, "board.mjs");
  if (path.resolve(currentScript) !== path.resolve(targetScript)) {
    fs.copyFileSync(currentScript, targetScript);
  }

  const sourceAssetsDir = path.join(SOURCE_ROOT, BOARD_DIR_NAME, "assets");
  for (const f of ["board-ui.css", "board-ui.js"]) {
    const srcF = path.join(sourceAssetsDir, f);
    const dstF = path.join(assetsDir, f);
    if (fs.existsSync(srcF) && path.resolve(srcF) !== path.resolve(dstF)) {
      fs.copyFileSync(srcF, dstF);
    }
  }

  const teamPath = path.join(boardDir, "TEAM.md");
  if (!fs.existsSync(teamPath)) {
    upsertTeamMember(projectRoot, {
      member: "@tl-1",
      name: "Tech Lead",
      role: "tl",
      capacitySp: 10,
      specialties: "Architecture",
      status: "Active",
    });
  }

  const updateRes = updateBoard(projectRoot);

  const batPath = path.join(projectRoot, "board.bat");
  const batContent = `@echo off\r\nwhere node >nul 2>nul\r\nif %ERRORLEVEL% EQU 0 (\r\n  node "%~dp0board\\board.mjs" --ui\r\n) else (\r\n  start "" "%~dp0board\\BOARD.html"\r\n)\r\n`;
  fs.writeFileSync(batPath, batContent, "utf8");

  const shPath = path.join(projectRoot, "board.sh");
  const shContent = `#!/usr/bin/env sh\nDIR="$(cd "$(dirname "$0")" && pwd)"\nif command -v node >/dev/null 2>&1; then\n  node "$DIR/board/board.mjs" --ui\nelse\n  open "$DIR/board/BOARD.html" 2>/dev/null || xdg-open "$DIR/board/BOARD.html" 2>/dev/null\nfi\n`;
  fs.writeFileSync(shPath, shContent, { encoding: "utf8", mode: 0o755 });

  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts.board) pkg.scripts.board = "node board/board.mjs";
      if (!pkg.scripts["board:ui"]) pkg.scripts["board:ui"] = "node board/board.mjs --ui";
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
    } catch {}
  }

  return {
    ok: true,
    boardDir,
    scriptPath: targetScript,
    htmlPath: updateRes.htmlPath,
    batPath,
    shPath,
  };
}

export async function startBoardUiServer(
  projectRoot = process.cwd(),
  { port = 0, role = "", member = "", openBrowser = false } = {}
) {
  let effectiveRole = detectEffectiveRole(projectRoot, role);
  let activeMember = member || "";
  if (!activeMember) {
    const savedMemberPath = path.join(projectRoot, BOARD_DIR_NAME, ".active-member");
    if (fs.existsSync(savedMemberPath)) {
      activeMember = fs.readFileSync(savedMemberPath, "utf8").trim();
    }
  }
  updateBoard(projectRoot);

  const sseClients = new Set();
  const broadcastState = () => {
    const res = updateBoard(projectRoot);
    const payload = `event: state\ndata: ${JSON.stringify(res.state)}\n\n`;
    for (const client of sseClients) {
      client.write(payload);
    }
    return res.state;
  };

  const sendJson = (res, statusCode, data) => {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
  };

  const server = http.createServer(async (req, res) => {
    try {
      const urlObj = new URL(req.url || "/", "http://127.0.0.1");
      const pathname = urlObj.pathname;

      if (req.method === "GET" && (pathname === "/" || pathname === "/BOARD.html")) {
        const boardRes = updateBoard(projectRoot);
        const html = fs.readFileSync(boardRes.htmlPath, "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && pathname.startsWith("/assets/")) {
        const assetName = path.basename(pathname);
        const localAsset = path.join(projectRoot, BOARD_DIR_NAME, "assets", assetName);
        const fallbackAsset = path.join(SOURCE_ROOT, BOARD_DIR_NAME, "assets", assetName);
        const targetAsset = fs.existsSync(localAsset) ? localAsset : fallbackAsset;
        if (!fs.existsSync(targetAsset)) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const ctype = assetName.endsWith(".css")
          ? "text/css; charset=utf-8"
          : "application/javascript; charset=utf-8";
        res.writeHead(200, { "Content-Type": ctype });
        res.end(fs.readFileSync(targetAsset));
        return;
      }

      if (req.method === "GET" && pathname === "/api/state") {
        const state = collectBoardState(projectRoot);
        const { _itemsWithPaths, ...publicState } = state;
        sendJson(res, 200, { ok: true, role: effectiveRole, activeMember, state: publicState });
        return;
      }

      if (req.method === "GET" && pathname === "/api/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        });
        res.write(": connected\n\n");
        sseClients.add(res);
        req.on("close", () => sseClients.delete(res));
        return;
      }

      if (req.method === "POST" && pathname === "/api/ticket/assign") {
        const body = await readJsonBody(req);
        const ticketPath = findTicketFileById(projectRoot, body.id);
        if (!ticketPath) {
          sendJson(res, 404, { ok: false, error: `Ticket not found: ${body.id}` });
          return;
        }
        const mut = mutateTicketFields(
          ticketPath,
          {
            devAssignee: body.devAssignee,
            qaAssignee: body.qaAssignee,
            sprint: body.sprint,
            sprintTarget: body.sprintTarget, status: body.status, devSp: body.devSp, qaSp: body.qaSp, estimate: body.estimate,
          },
          { role: effectiveRole }
        );
        if (!mut.ok) {
          sendJson(res, mut.statusCode || 400, mut);
          return;
        }
        const newState = broadcastState();
        sendJson(res, 200, { ok: true, state: newState });
        return;
      }

      if (req.method === "POST" && pathname === "/api/ticket/estimate") {
        const body = await readJsonBody(req);
        const ticketPath = findTicketFileById(projectRoot, body.id);
        if (!ticketPath) {
          sendJson(res, 404, { ok: false, error: `Ticket not found: ${body.id}` });
          return;
        }
        const mut = mutateTicketFields(
          ticketPath,
          { devSp: body.devSp, qaSp: body.qaSp, estimate: body.estimate },
          { role: effectiveRole }
        );
        const newState = broadcastState();
        sendJson(res, mut.statusCode || 200, { ok: mut.ok, state: newState });
        return;
      }

      if (req.method === "POST" && pathname === "/api/ticket/status") {
        const body = await readJsonBody(req);
        const ticketPath = findTicketFileById(projectRoot, body.id);
        if (!ticketPath) {
          sendJson(res, 404, { ok: false, error: `Ticket not found: ${body.id}` });
          return;
        }
        const mut = mutateTicketFields(ticketPath, { status: body.status }, { role: effectiveRole });
        if (!mut.ok) {
          sendJson(res, mut.statusCode || 403, mut);
          return;
        }
        const newState = broadcastState();
        sendJson(res, 200, { ok: true, state: newState });
        return;
      }

      if (req.method === "POST" && pathname === "/api/team/member") {
        const body = await readJsonBody(req);
        upsertTeamMember(projectRoot, body);
        const newState = broadcastState();
        sendJson(res, 200, { ok: true, state: newState });
        return;
      }

      if (req.method === "POST" && pathname === "/api/team/active-member") {
        const body = await readJsonBody(req);
        if (body.member !== undefined) {
          activeMember = String(body.member || "").trim();
          if (activeMember) {
            const boardDir = path.join(projectRoot, BOARD_DIR_NAME);
            fs.mkdirSync(boardDir, { recursive: true });
            fs.writeFileSync(path.join(boardDir, ".active-member"), `${activeMember}\n`, "utf8");
          }
        }
        if (body.role && typeof body.role === "string") {
          effectiveRole = String(body.role).trim().toLowerCase();
        }
        const newState = broadcastState();
        sendJson(res, 200, { ok: true, role: effectiveRole, activeMember, state: newState });
        return;
      }

      if (req.method === "POST" && pathname === "/api/sprint/sync") {
        const body = await readJsonBody(req);
        const sRes = syncSprintMarkdown(projectRoot, body.sprintId || "SPRINT-01");
        const newState = broadcastState();
        sendJson(res, 200, { ok: true, sprintPath: sRes.sprintPath, state: newState });
        return;
      }

      if (req.method === "POST" && pathname === "/api/sprint/retro-input") {
        const body = await readJsonBody(req);
        const rRes = appendSprintRetroInput(projectRoot, body.sprintId || "SPRINT-01", {
          member: body.member || activeMember || "@member",
          role: body.role || effectiveRole,
          bottleneckTags: body.bottleneckTags || [],
          proposal: body.proposal || "",
        });
        const newState = broadcastState();
        sendJson(res, 200, { ok: true, sprintPath: rRes.sprintPath, state: newState });
        return;
      }

      sendJson(res, 404, { ok: false, error: "Not found" });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message });
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const addr = server.address();
  const actualPort = typeof addr === "object" && addr ? addr.port : port;
  const url = `http://127.0.0.1:${actualPort}`;

  if (openBrowser) {
    const startCmd =
      process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
          ? `open "${url}"`
          : `xdg-open "${url}"`;
    import("node:child_process")
      .then(({ exec }) => {
        exec(startCmd, () => {});
      })
      .catch(() => {});
  }

  return {
    server,
    port: actualPort,
    url,
    close: () =>
      new Promise((resolve) => {
        for (const client of sseClients) client.end();
        sseClients.clear();
        server.close(() => resolve());
      }),
  };
}

export function runBoardCli(argv = process.argv.slice(2), { defaultRoot = process.cwd() } = {}) {
  const args = [...argv];
  const flags = {};
  const positionals = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        flags[a.slice(2)] = args[++i];
      } else {
        flags[a.slice(2)] = true;
      }
    } else {
      positionals.push(a);
    }
  }

  const subcommands = new Set(["init", "retro-input", "sprint-sync", "status", "assign", "estimate", "member"]);
  const subcommand = positionals[0] && subcommands.has(positionals[0]) ? positionals[0] : "";
  const root = flags.root
    ? path.resolve(String(flags.root))
    : !subcommand && positionals[0] && !positionals[0].startsWith("@")
      ? path.resolve(positionals[0])
      : defaultRoot;

  if (subcommand === "init") {
    const sRes = scaffoldBoardProject(root);
    return { ...sRes, items: [] };
  }

  if (subcommand === "sprint-sync") {
    const sRes = syncSprintMarkdown(root, String(flags.sprint || "SPRINT-01"));
    const bRes = updateBoard(root);
    return { ...bRes, sprintPath: sRes.sprintPath };
  }

  if (subcommand === "retro-input") {
    const rRes = appendSprintRetroInput(
      root,
      String(flags.sprint || "SPRINT-01"),
      {
        member: String(flags.member || "@member"),
        role: String(flags.role || "dev"),
        bottleneckTags: flags.tags ? String(flags.tags).split(",") : [],
        proposal: String(flags.proposal || ""),
      }
    );
    const bRes = updateBoard(root);
    return { ...bRes, sprintPath: rRes.sprintPath };
  }

  if (subcommand === "status" || subcommand === "assign" || subcommand === "estimate") {
    const ticketId = String(flags.id || positionals[1] || "");
    const ticketPath = findTicketFileById(root, ticketId);
    if (!ticketPath) {
      return { ok: false, error: `Ticket not found: ${ticketId}` };
    }
    const mRes = mutateTicketFields(
      ticketPath,
      {
        status: flags.status ? String(flags.status) : undefined,
        devAssignee: flags["dev-assignee"] ? String(flags["dev-assignee"]) : undefined,
        qaAssignee: flags["qa-assignee"] ? String(flags["qa-assignee"]) : undefined,
        sprint: flags.sprint ? String(flags.sprint) : undefined,
        sprintTarget: flags.target ? String(flags.target) : undefined,
        devSp: flags["dev-sp"] !== undefined ? Number(flags["dev-sp"]) : undefined,
        qaSp: flags["qa-sp"] !== undefined ? Number(flags["qa-sp"]) : undefined,
      },
      { role: detectEffectiveRole(root, flags.role) }
    );
    if (!mRes.ok) return mRes;
    return updateBoard(root);
  }

  if (subcommand === "member") {
    upsertTeamMember(root, {
      member: String(flags.member || positionals[1] || "@member"),
      name: String(flags.name || ""),
      role: String(flags.role || "dev"),
      capacitySp: flags.capacity !== undefined ? Number(flags.capacity) : 10,
      specialties: String(flags.specialties || "-"),
      status: String(flags.status || "Active"),
    });
    return updateBoard(root);
  }

  const hideDone = Boolean(flags["hide-done"]);
  const res = updateBoard(root, { hideDone });
  let filtered = res.state?.items || [];
  if (hideDone) {
    filtered = filtered.filter((it) => it.status !== "DONE" && it.status !== "CLOSED");
  }
  if (flags.member && typeof flags.member === "string") {
    const m = flags.member.startsWith("@") ? flags.member : `@${flags.member}`;
    filtered = filtered.filter((it) => it.devAssignee === m || it.qaAssignee === m);
  }
  if (flags.sprint && typeof flags.sprint === "string") {
    const sp = flags.sprint.toUpperCase();
    filtered = filtered.filter((it) => String(it.sprint || "").toUpperCase() === sp);
  }
  return { ...res, items: filtered };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.includes("--ui") || args.includes("--serve")) {
    const portArg = args.find((a) => a.startsWith("--port="));
    const roleArg = args.find((a) => a.startsWith("--role="));
    const port = portArg ? Number(portArg.slice(7)) : 4321;
    const role = roleArg ? roleArg.slice(7) : "";
    const openBrowser = !args.includes("--no-open");
    startBoardUiServer(process.cwd(), { port, role, openBrowser }).then((srv) => {
      console.log(`AI Studio V3 Board UI server listening at ${srv.url}`);
    });
  } else {
    const res = runBoardCli(args);
    if (!res.ok) {
      console.error(res.error || "Board command failed");
      process.exitCode = 1;
    } else {
      console.log(`Updated board at ${res.boardPath} and ${res.htmlPath} (${res.items.length} items)`);
    }
  }
}
