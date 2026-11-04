# Domain docs

Single-context layout: một `GLOSSARY.md` + `docs/adr/` ở root repo.

## Before exploring, read these (theo thứ tự)

1. `GLOSSARY.md` — ubiquitous language & DDD terms
2. `docs/adr/0001-tech-stack-and-layering.md` — stack + import-boundary rules
3. `docs/CONVENTIONS.md` — cross-cutting contracts (AD-1..4), naming, common components
4. `docs/design-system/MASTER.md` — design tokens (GĐ1)
5. `docs/tech/INDEX.md` — package versions + API gotchas
6. `docs/agents/codebase/{STACK,ARCHITECTURE,TESTING}.md` — bản đồ codebase
7. `.ai-studio/memory/{PROJECT_STATE,BACKLOG,RULES,INCIDENTS}.md` — state/backlog/rules/incidents
8. `docs/quality-gates.md` — gate overrides

## Layout

- Domain docs: `GLOSSARY.md` (root), ADRs ở `docs/adr/`.
- Knowledge stores: `docs/knowledge/{RULES,INCIDENTS}.md` (mirror `/retro` từ `.ai-studio/memory/`).
