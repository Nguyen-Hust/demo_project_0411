# SPRINT-<NN>: <Sprint Theme / Name>

## 1. Sprint Metadata & Goal
- **Sprint ID:** `SPRINT-<NN>`
- **Duration:** `<YYYY-MM-DD>` -> `<YYYY-MM-DD>` (2 weeks)
- **Sprint Goal:** `<One-sentence business outcome the team commits to achieve>`
- **Status:** `PLANNED | ACTIVE | CLOSED`

## 2. Member Capacity & Workload Allocation
| Member | Role | Sprint Capacity (SP) | Assigned DEV SP | Assigned QA SP | Total Assigned SP | Utilization |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `@dev-1` | `dev` | 13 | 0 | 0 | 0 | 0% |
| `@qa-1` | `tester` | 10 | 0 | 0 | 0 | 0% |

## 3. Committed Sprint Backlog
| Ticket ID | Feature ID | Title | Dev Assignee | QA Assignee | DEV SP | QA SP | Total SP | Sprint Target | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `F-001-T01` | `F-001` | `<Slice Title>` | `@dev-1` | `@qa-1` | 3 | 2 | 5 | `DONE` | `READY_FOR_DEV` |

## 4. Continuous Team Synthesis Log & Role Retro Reports
<!-- Appended automatically during Sprint or via POST /api/sprint/retro-input and harvested by /retro -->

### 4.1 DEV Sprint Retro Reports (5 Categories)
- **`SPEC_AMBIGUITY`:** `<What was unclear or conflicting in spec.md / tickets>`
- **`ARCH_FRICTION`:** `<Where module boundaries, shared components, or tech-plan.md slowed implementation>`
- **`ESTIMATION_DRIFT`:** `<Tickets where actual DEV effort diverged from Refined DEV SP and why>`
- **`TOOLING_FRICTION`:** `<Build, test runner, or harness friction>`
- **`TECH_DEBT_SHORTCUT`:** `<Intentional // shortcut: annotations or deferred refactorings>`
- **Improvement Proposal:** `<Concrete rule, template, or architectural action item>`

### 4.2 TESTER Sprint Retro Reports (5 Categories)
- **`AC_TESTABILITY_GAP`:** `<Acceptance criteria that lacked measurable outcomes or clear failure modes>`
- **`ENV_SEED_FLAKINESS`:** `<Playwright seed.spec.ts, fixture, or test environment instability>`
- **`QA_HANDOFF_QUALITY`:** `<Missing verification.md evidence or incomplete Happy Path checks before READY_FOR_QA>`
- **`ESCAPED_EDGE_CASE`:** `<Patterns of bugs found during Adversarial QA (F-<NNN>-B<NN>)>`
- **`QA_SP_DRIFT`:** `<Tickets where actual QA verification diverged from Refined QA SP>`
- **Improvement Proposal:** `<Concrete prevention rule, Test Studio suite enhancement, or DoR gate update>`

## 5. Rollover & Closeout Summary
- **Completed (`DONE`):** `<list of ticket IDs>`
- **Partial Milestone Met (`DEV_DONE` / `TECH_PLANNED`):** `<list of ticket IDs rolled over to next sprint>`
- **Unfinished Rollover:** `<list of ticket IDs moved to SPRINT-(NN+1) or BACKLOG>`
- **Retro Transformation Verdict:** `<Links to promoted RULES.md / GLOBAL-RULES.md / BACKLOG.md entries>`
