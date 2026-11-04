# SmartKMS — Kindergarten Management System

Quản lý trường mầm non. .NET 10 (C# 14) + Blazor Interactive Server + MudBlazor 9.12.0 + PostgreSQL 17 / EF Core 10.

## Bắt buộc đọc trước khi code (theo thứ tự)

1. `docs/adr/0001-tech-stack-and-layering.md` — stack + ranh giới dependency (Domain ← Application ← Infrastructure ← Web).
2. `docs/CONVENTIONS.md` — cross-cutting contracts AD-1..AD-4, naming, components dùng lại.
3. `GLOSSARY.md` — ubiquitous language / DDD terms.
4. `docs/design-system/MASTER.md` — design tokens (GĐ1), quy tắc đồng bộ 4 nơi.
5. `docs/tech/INDEX.md` — package versions + API gotchas (đã đụng khi build thật).
6. `docs/agents/codebase/{STACK,ARCHITECTURE,TESTING}.md` — bản đồ codebase.

## Layout (monorepo)

- `src/SmartKMS.Domain/` — rich domain (không phụ thuộc gì ngoài BCL).
- `src/SmartKMS.Application/` — CQRS Commands/Queries + Handlers, pipeline behaviors, DTO, Result<T>.
- `src/SmartKMS.Infrastructure/` — EF Core Persistence, Identity, Services.
- `src/SmartKMS.Web/` — Blazor Server + MudBlazor, composition root, Theme.
- `tests/` — Domain/Application UnitTests + ArchitectureTests (NetArchTest).

## Commands

```bash
dotnet build SmartKMS.sln                                    # build, 0 warning 0 error
dotnet test tests/SmartKMS.Domain.UnitTests/SmartKMS.Domain.UnitTests.csproj --filter "FullyQualifiedName~BaseEntityTests"
dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~ResultTests"
dotnet test tests/SmartKMS.ArchitectureTests/SmartKMS.ArchitectureTests.csproj --filter "FullyQualifiedName~CleanArchitectureRulesTests"
dotnet format SmartKMS.sln --verify-no-changes               # CI style gate
dotnet run --project src/SmartKMS.Web                        # http://localhost:5160
cd e2e && npm i && npx playwright test                       # e2e smoke test
```

## Conventions ngắn

- MediatR pin **12.4.1** (MIT cuối, cấm v13+); EF Core + Logging.Abstractions **10.0.4** (đi Npgsql 10.0.3).
- Domain KHÔNG dùng DataAnnotations, KHÔNG throw cho lỗi nghiệp vụ (dùng `Result<T>` / `Error`).
- Validation qua FluentValidation (pipeline behavior), không trên entity.
- MudBlazor v9: `Color.Default` (không `TextSecondary`), `DrawerVariant`, `MudBlazor.Services.AddMudServices`.
- Cấm wrapper MudBlazor primitives; app-level components trong `Components/Common/`.
- Commit chỉ file mình sửa (`git add <path>`), không `git add .` / `-A` / `-u`.
