# Questionnaire Escalation — <F-NNN-feature-slug>

## Escalation Rules
- **BA Escalation (`/ask-ba` -> `/resolve-ba`):** Locks only the affected ticket(s) to `**Status:** PENDING_BA`. Unrelated tickets remain `READY_FOR_DEV` / `IN_PROGRESS`.
- **Tech Lead Escalation (`/ask-tl` -> `/resolve-tl`):** Locks only the affected ticket(s) to `**Status:** PENDING_TL`. Only `--role=tl` can unlock back to `READY_FOR_DEV`.

---

### F-001-Q-BA-01: <Short Business / AC Question Title>
- **Target Role:** `BA`
- **Affected Tickets:** `F-001-T01`
- **Status:** `OPEN | RESOLVED`
- **Context & Conflict:** `<Exact file:line vs spec REQ-n or Gherkin AC>`
- **Impact:** `<What breaks or is blocked if guessed>`
- **Options (A/B):**
  - **Option A (Recommended):** `<description + trade-off>`
  - **Option B:** `<description + trade-off>`
- **Resolution:** `<Filled by BA via /resolve-ba>`

---

### F-001-Q-TL-01: <Short Architectural / Interface Question Title>
- **Target Role:** `TL`
- **Affected Tickets:** `F-001-T02`
- **Status:** `OPEN | RESOLVED`
- **Context & Conflict:** `<Exact file:line vs tech-plan.md AD-n or module boundary>`
- **Impact:** `<Blast radius across modules or performance/security trade-off>`
- **Options (A/B):**
  - **Option A (Recommended):** `<description + trade-off>`
  - **Option B:** `<description + trade-off>`
- **Resolution:** `<Filled by TL via /resolve-tl>`
