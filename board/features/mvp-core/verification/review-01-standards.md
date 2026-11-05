# Review Report — Standards Axis

| Scope | Axis | Base Commit | Diff Target |
|---|---|---|---|
| ticket 01 (F-001 Class CRUD) | standards | b37e1d1 (ticket-base, per `verification/01.md`) | working tree @ 8d52795 (commits 843059b, 5a31607, ce2f356, 8d52795) |

Re-confirmation pass after the SPEC-1 fix. Reviewed paths: Domain `Modules/Classes/*`, Application `Modules/Classes/**`, `ClassConfiguration.cs`, `ApplicationDbContext.cs`, `Migrations/*InitialCreate*`, Web `Pages/Classes/*`, `App.razor`, `NavMenu.razor`, `_Imports.razor`, unit tests, `e2e/*`, `scripts/run-e2e-server.ps1`, `docker-compose.yml`.

Checklist sources: `docs/CONVENTIONS.md` (AD-1..AD-4, naming, EF/PG rules, reusable components), `docs/adr/0001-tech-stack-and-layering.md` (§2 layering, §3 import boundaries). The `skills/_lib/checklists/*.md` files named in my role contract are **not present in this workspace**; STD-/MAINT-/PERF-/SEC-/CONC- IDs below are mapped to the equivalent CONVENTIONS/ADR clauses.

## Delta since the prior Standards review (3e91d0d → 8d52795)

| Commit | Change | Standards impact |
|---|---|---|
| ce2f356 | `ClassFormDialog.razor` — removed `MudForm @ref/@bind-Errors/@onsubmit`, `_form`, `_errors`, `SubmitAsync`; `Submit()` closes directly. `e2e/mvp-core.spec.ts` +2 lines. | **Resolves prior STD-04 and STD-06.** The discarded `_form.Validate()` call is gone (`ClassFormDialog.razor:57-62`) and the `default!`-suppressed `MudForm` reference no longer exists (`:6` is a bare `<MudForm>`). No new unused members introduced. |
| 8d52795 | `App.razor` +2 asset lines; `e2e/mvp-core.spec.ts` −2 lines; ticket status + verification text. | `App.razor:9,20` are the canonical MudBlazor 9 asset paths for the pinned 9.12.0 package (`SmartKMS.Web.csproj:7`); `Program.cs:32` already registers `AddMudServices()`. No convention violated. |

## Findings

| # | Checklist-ID | Severity | file:line | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | STD-01 (CONVENTIONS §PostgreSQL & EF Core: snake_case for tables/columns/indexes/keys) | Major | `src/SmartKMS.Infrastructure/Persistence/Migrations/20261104234143_InitialCreate.cs:215-218` | Unique index is `uq_classes_name_agegroup_year` over `name, age_group, academic_year` — the name embeds `agegroup` (no underscore) while the column is `age_group`. The ticket plan (`01-class-crud.md:67`) specifies the same string, so the plan itself deviates from the convention. Not a functional defect; it is a permanent schema identifier later migrations will copy. | Rename to `uq_classes_name_age_group_academic_year` in `ClassConfiguration.cs:34`, regenerate `InitialCreate` (first migration, only ever applied to the ephemeral E2E DB), update the ticket plan text. |
| 2 | STD-02 (CONVENTIONS §C# Idioms: NRT on, nullability warning = error) | Minor | `src/SmartKMS.Domain/Modules/Classes/Class.cs:16,31-32,35-38` | `Room` is `string?` (`:28`) but the private ctor takes non-nullable `string room` and `Create`/`Rename` coerce `room ?? string.Empty`. The nullable contract is silently converted to `""` while the DB column is nullable (`ClassConfiguration.cs:21`) and the UI treats `null` as "—" (`ClassDetailPage.razor:25`). Two representations of "no room" coexist. | Keep `Room` non-nullable end-to-end, or pass `room` through unchanged so `NULL` is the single representation. |
| 3 | STD-03 (CONVENTIONS §Common Reusable Components: `DataTable<TItem>` for every table screen) | Minor | `src/SmartKMS.Web/Components/Pages/Classes/ClassesPage.razor:29-68` | The list screen uses `MudDataGrid` directly instead of the mandated `DataTable<TItem>` wrapper (`Components/Common/DataTable.razor:1-33`), which already supplies `Items/Loading/Columns/ToolBar/EmptyMessage` and `data-testid="data-table"`. The ticket's Interfaces section (`01-class-crud.md:17`) lists `DataTable<TItem>` as consumed. | Use `<DataTable TItem="ClassSummaryDto" Items="_classes" Loading="_loading" EmptyMessage="Chưa có lớp học nào">` with the columns in `<Columns>`, or record in the ticket why the wrapper cannot express this grid. |
| 4 | STD-05 (CONVENTIONS §C# Idioms: unused members) | Minor | `src/SmartKMS.Web/Components/Pages/Classes/ClassFormResult.cs:1` | `using SmartKMS.Application.Modules.Classes.Dtos;` is unused — the record only references `AgeGroup` (Domain). Introduced by this change. | Delete the unused using. |
| 5 | STD-07 (CONVENTIONS §Naming: `Async` suffix for async methods) | Minor (informational) | `src/SmartKMS.Web/Components/Pages/Classes/ClassesPage.razor:156` | `OpenDetail(Guid id)` is synchronous navigation, so the name is acceptable; recorded only because siblings are `OpenCreateAsync`/`OpenEditAsync`/`CloseAsync`. | — (no change demanded) |

### Prior findings now closed

- **STD-04** (discarded `_form.Validate()` result) — closed by ce2f356; `ClassFormDialog.razor:57-62` no longer calls `Validate()`.
- **STD-06** (`private MudForm _form = default!;` dereferenced) — closed by ce2f356; the field and its dereference are gone.

### Verified OK (re-checked at HEAD)

| ID | Clause | Evidence |
|---|---|---|
| STD-08 | ADR §3 import boundaries | Handlers depend only on `IApplicationDbContext` (`CreateClassHandler.cs:9`, `UpdateClassHandler.cs:9`, `CloseClassHandler.cs:9`, `ListClassesHandler.cs:11`, `GetClassDetailHandler.cs:11`); `Class.cs` imports only `SmartKMS.Domain.Common`. `CleanArchitectureRulesTests` (3 rules) covers these. |
| STD-09 | AD-1 Result pattern, no domain throws | `Class.cs:31-42` pure state transitions; handlers return `Result`/`Result<T>` with `Error.Validation`/`Error.NotFound`. |
| STD-10 | AD-3 FluentValidation, no DataAnnotations on entity | `CreateClassValidator.cs:10-17`, `UpdateClassValidator.cs:9-13`; `Class` carries no attributes. |
| STD-11 | No MudBlazor primitive wrappers | `Pages/Classes/*.razor` use primitives directly. (Finding #3 is the inverse — a mandated wrapper skipped.) |
| STD-12 | PG naming: table `classes`, PK `pk_classes`, snake_case columns, enum→string | `ClassConfiguration.cs:15-34`; `UseSnakeCaseNamingConvention()` active. |
| STD-13 | ADR §1 pinned versions | `dotnet-ef` 10.0.4 (`.config/dotnet-tools.json`); `EFCore.Design` 10.0.4 `PrivateAssets=all` in Infrastructure + Web; `EFCore.InMemory` 10.0.4 in Application.UnitTests only; MudBlazor 9.12.0 unchanged. |

## Notes outside the diff (not scored)

- `src/SmartKMS.Web/Components/_Imports.razor:8` duplicates `@using Microsoft.AspNetCore.Components.Web` (line 6) → CS0105. Pre-existing, queued as S-01 (`verification/01.md:10`); the ticket forbids touching it (`01-class-crud.md:90`).
- `scripts/run-e2e-server.ps1:19` hardcodes the dev password `smartkms_dev` as well as `docker-compose.yml:7`, while G1 (`01-class-crud.md:43`) says the password lives only in the compose file. Dev-only credential, no production exposure; the stated contract is not met. Informational.
- `scripts/run-e2e-server.ps1:37` starts the web server with `--no-build`; the supervisor never builds, so a stale `bin/` would silently serve old code. Not a defect in this change (the pipeline builds first), but worth a comment.

Worst: None
Axis result: CLEAR
