# RULES
<!-- Project rule store. `retro` is the only writer of rule text; `diagnosing-bugs` may only bump Hits/Last used on a rule it applies (and `retro` reconciles `--apply-hits` at sweep time). -->
## Metrics
- Active: 0/50
- Probation: 4/15
- Stale: 0
- Promotions this sweep: 0
- Hit rate: 0%
## Rules
### R-architecture-001 — MediatR 12 gộp DI vào package core
- Trigger: `AddMediatR`/`MediatR.Extensions.Microsoft.DependencyInjection` restore lỗi khi pin 12.4.1
- Mechanism: MediatR 12 bỏ package DI riêng (nuget chỉ đến 11.1.0); từ 13+ license thương mại
- Rule: Pin MediatR 12.4.1 (MIT cuối), đăng ký `services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...))` từ package core; cấm nâng v13+
- Evidence: src/SmartKMS.Application/DependencyInjection.cs; docs/tech/mediatr-12-cqrs.md
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
### R-data-002 — Npgsql 10.0.3 yêu cầu EF Core ≥ 10.0.4
- Trigger: NU1605/NU1102 khi dùng EF Core 10.0.0 với Npgsql 10.0.3
- Mechanism: transitive dependency Npgsql → EF Core 10.0.4 kéo Logging.Abstractions 10.0.4
- Rule: Dùng `Microsoft.EntityFrameworkCore` + `Microsoft.Extensions.Logging.Abstractions` 10.0.4 (không phải 10.0.0) khi đi Npgsql 10.0.3
- Evidence: src/SmartKMS.Infrastructure/SmartKMS.Infrastructure.csproj; src/SmartKMS.Application/SmartKMS.Application.csproj
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
### R-ui-003 — MudBlazor v9 đổi API so v8 (template ADD)
- Trigger: MudBlazor compile lỗi `Color.TextSecondary` / `Variant.Responsive` / Typography int
- Mechanism: v9 xoá Color phụ (`Color.Default`), đổi sang `DrawerVariant` enum, Typography `FontWeight`/`LineHeight` là string, `AddMudServices` ở namespace `MudBlazor.Services`
- Rule: Khi migrate template v8/ADD sang v9, tra `docs/tech/mudblazor-9.md` trước khi viết Razor/theme
- Evidence: src/SmartKMS.Web/Components/_Imports.razor; src/SmartKMS.Web/Theme/KindergartenTheme.cs
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
### R-test-004 — NetArchTest.Rules 1.3.2 `FailingTypeNames` trả null khi pass
- Trigger: architecture test crash NullReferenceException ở nhánh assert success
- Mechanism: API v1.3.2 không còn `GetOffendingTypes()`; `FailingTypeNames` = null khi IsSuccessful
- Rule: Dùng `TestResult.FailingTypeNames` + null-guard trước `string.Join` (không có `GetOffendingTypes`)
- Evidence: tests/SmartKMS.ArchitectureTests/CleanArchitectureRulesTests.cs
- Scope: project
- Hits: 1
- Last used: 2026-11-04
- Status: probation
