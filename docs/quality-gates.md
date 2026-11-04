# Quality Gates

Project-local overrides for the default quality gates.

Defaults live in the quality-gates skill (`references/THRESHOLDS.md`). This
file only disables or adds gates for this project, one approved row at a time.
The baseline gates (`build, type, lint, test, security, diff`) plus every
trigger-derived gate apply by default; a row here is the record of a human
approval.

## Overrides

<!-- One row per override. Every field is required:
     - Gate: one of the 17 GATE_IDS, lowercase and exact
     - Action: disable | add
     - Reason, Approver, Date (YYYY-MM-DD): all three required
     A row missing any field is rejected by the classifier and never applied.
     Rows inside fenced code blocks are examples only and are never applied. -->

| Gate | Action | Reason | Approver | Date |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

```
Example (fenced — never applied):

| perf | disable | CLI-only project: no user-facing UI surface to measure | @owner | 2026-01-15 |
```
