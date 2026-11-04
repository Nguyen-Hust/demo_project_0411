# Technical Plan — <F-NNN-feature-slug>

## 1. Architectural Guidance (TL)
<!-- FOUR-EYES TL ANCHOR: Only Role 'tl' can modify Section 1 -->
- **Bounded Context & DDD Alignment:** `<Aggregate Roots, Entities, Value Objects, Domain Events from GLOSSARY.md>`
- **Module Boundaries & Layering:** `<Allowed import directions, shared components from docs/CONVENTIONS.md>`
- **Cross-Cutting Decisions (`AD-n`):**
  - **AD-1 (`<topic>`):**
    - Binds: `<tickets/modules>`
    - Prevents: `<anti-pattern>`
    - Rule: `<concrete implementation rule>`
- **Security, Performance & Data Invariants:** `<Trust boundaries, query/index rules, idempotency>`

## 2. Ticket Technical Breakdown & Refined DEV SP (DEV)
| Ticket ID | Public Seam & Signature | Files Boundary (`Create` / `Modify`) | Preliminary DEV SP | Refined DEV SP | Delta Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `F-001-T01` | `<function/component signature>` | `src/...`, `tests/...` | 3 | 3 | `Aligned with existing shared hook` |
