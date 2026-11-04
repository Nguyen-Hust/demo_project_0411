# Architecture

- **Pattern**: Clean Architecture (Onion) + DDD + CQRS theo ADD v1.1.0.
- **Top-level layout**:
  - `src/SmartKMS.Domain/` — rich domain, aggregates, domain events. KHÔNG tham chiếu gì ngoài BCL.
  - `src/SmartKMS.Application/` — use cases (Commands/Queries + Handlers), pipeline behaviors, DTOs, interfaces.
  - `src/SmartKMS.Infrastructure/` — EF Core persistence, Identity, services.
  - `src/SmartKMS.Web/` — Blazor Server UI + MudBlazor, composition root.
  - `tests/SmartKMS.ArchitectureTests/` — NetArchTest.Rules kiểm tra tự động ranh giới dependency.
- **Dependency rule**: Domain ← Application ← Infrastructure ← Web. Xem `docs/adr/0001-tech-stack-and-layering.md`.
- **Cross-cutting contracts**: `AD-1` (Result/Error + RFC 9457), `AD-2` (Identity cookie + JWT hybrid, resource-based policies), `AD-3` (FluentValidation), `AD-4` (Serilog + TraceId) — trong `docs/CONVENTIONS.md`.
- **Reusable modules**: xem `docs/CONVENTIONS.md` (`## Common Reusable Components`).
