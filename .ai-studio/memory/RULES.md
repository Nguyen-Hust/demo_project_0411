# RULES
<!-- Project rule store (mirror). Writer: retro/diagnosing-bugs reconciliation. -->
## Metrics
- Active: 0/50
- Probation: 4/15
- Stale: 0
- Promotions this sweep: 0
- Hit rate: 0%
## Rules
### R-architecture-001 — MediatR 12 gộp DI vào package core
- Trigger: `AddMediatR`/`MediatR.Extensions.Microsoft.DependencyInjection` restore lỗi khi pin 12.4.1
- Mechanism: MediatR 12 bỏ package DI riêng; từ 13+ license thương mại
- Rule: Pin MediatR 12.4.1, dùng `AddMediatR` từ package core; cấm v13+
- Evidence: src/SmartKMS.Application/DependencyInjection.cs; docs/tech/mediatr-12-cqrs.md
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
### R-data-002 — Npgsql 10.0.3 yêu cầu EF Core ≥ 10.0.4
- Trigger: NU1605/NU1102 khi EF Core 10.0.0 + Npgsql 10.0.3
- Mechanism: transitive dep Npgsql → EF 10.0.4 kéo Logging.Abstractions 10.0.4
- Rule: Dùng EF Core + Logging.Abstractions 10.0.4 khi đi Npgsql 10.0.3
- Evidence: src/SmartKMS.Infrastructure/SmartKMS.Infrastructure.csproj; src/SmartKMS.Application/SmartKMS.Application.csproj
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
### R-ui-003 — MudBlazor v9 đổi API so v8
- Trigger: compile lỗi `Color.TextSecondary` / `Variant.Responsive` / Typography int
- Mechanism: v9 dùng `Color.Default`, `DrawerVariant`, Typography string, `MudBlazor.Services`
- Rule: Tra `docs/tech/mudblazor-9.md` trước khi viết Razor/theme
- Evidence: src/SmartKMS.Web/Components/_Imports.razor; src/SmartKMS.Web/Theme/KindergartenTheme.cs
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
### R-test-004 — NetArchTest 1.3.2 `FailingTypeNames` null khi pass
- Trigger: architecture test NRE ở nhánh success
- Mechanism: v1.3.2 bỏ `GetOffendingTypes`; `FailingTypeNames` = null khi pass
- Rule: Dùng `FailingTypeNames` + null-guard
- Evidence: tests/SmartKMS.ArchitectureTests/CleanArchitectureRulesTests.cs
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
