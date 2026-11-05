# Review Report — Spec Axis

| Scope | Axis | Base Commit | Diff Target |
|---|---|---|---|
| ticket 01 (F-001 Class CRUD) | spec | b37e1d1 (ticket-base, per `verification/01.md`) | working tree @ 8d52795 (commits 843059b, 5a31607, ce2f356, 8d52795) |

Spec sources: `board/features/mvp-core/tickets/01-class-crud.md` (AC-1..AC-5 + Regression, Technical Plan, Unit Test Matrix), `board/features/mvp-core/spec.md` (REQ-1..REQ-5, Review Focus, Testing Decisions). The `skills/_lib/checklists/spec-fidelity.md` file named in my role contract is **not present in this workspace**; SPEC- IDs below are mapped to the ticket's own ACs and the spec's REQ/Review-Focus clauses.

## Re-verification of the prior blocker (SPEC-1)

| Check | Verdict | Evidence |
|---|---|---|
| Root cause fixed in code | PASS | `git show 8d52795 -- src/SmartKMS.Web/Components/App.razor` adds exactly two lines: `App.razor:9` `<link rel="stylesheet" href="_content/MudBlazor/MudBlazor.min.css" />` and `App.razor:20` `<script src="_content/MudBlazor/MudBlazor.min.js"></script>`. `Program.cs:32` already calls `AddMudServices()`; `SmartKMS.Web.csproj:7` pins MudBlazor 9.12.0, so the `_content/MudBlazor/` asset path is the correct one for the package. |
| Dialog now closes on submit | PASS (code) | `ClassFormDialog.razor:57-62` — `Submit()` is a synchronous `MudDialog.Close(DialogResult.Ok(...))` with no `MudForm.Validate()` gate. The prior failure mode (submit blocked behind a never-completing validate/select interaction) is structurally gone. `ClassesPage.razor:93-105` awaits `dialog.Result`, sends `CreateClassCommand`, then `LoadAsync()`. |
| E2E happy path green | PASS (recorded) | `verification/01.md:27-30` records `mvp-core.spec.ts` PASS (9.5s), `seed.spec.ts` 2/2 PASS, total `3 passed (12.1s)`, with the supervisor's `ok 1/2/3` lines. The supervisor's exit code 1 is attributed to `docker compose down` writing to stderr (`scripts/run-e2e-server.ps1:54`), not to a test failure — consistent with the script's `$ErrorActionPreference = "Stop"` + `NativeCommandError` behaviour. |
| E2E spec still asserts the ACs | PASS | `e2e/mvp-core.spec.ts:36` asserts the dialog is hidden before asserting the row; `:39-41` row + `0/30` + `Hoạt động`; `:44-47` filter; `:50-53` detail vacant 30 + empty teacher/child states; `:57-61` rename; `:64-70` close + status filter. |

**SPEC-1 is CLEARED.** The blocker was "E2E happy path failing / no re-run evidence"; the root cause is fixed in committed code and a green run is recorded. I cannot execute Playwright from this seat, so the PASS is accepted as the owner's receipt in `verification/01.md`, not as my own execution — that is the same evidence standard the prior review used to raise the blocker.

## Contract-by-contract verification (unchanged items re-checked against HEAD)

| Contract | Verdict | Evidence |
|---|---|---|
| Unique (name, age_group, academic_year) — handler check | PASS | `CreateClassHandler.cs:15-24`; `UpdateClassHandler.cs:17-27` excludes self via `c.Id != request.Id`. |
| Unique — DB unique index | PASS | `ClassConfiguration.cs:32-34`; migration `20261104234143_InitialCreate.cs:214-218`. |
| `MaxStudents = 30` constant on aggregate | PASS | `Class.cs:12`; `ClassMapper.cs:22,34-35`. |
| `AgeGroup` enum 3 values Mam/Choi/La | PASS | `AgeGroup.cs:7-12`. |
| Soft-close idempotent | PASS | `Class.cs:42`; no hard delete in the diff. |
| `Room` nullable | PASS (representation caveat, SPEC-2) | `Class.cs:28`, `ClassConfiguration.cs:21`; `CreateClassValidatorTests.cs:61-66`. |
| Update changes name+room only | PASS | `UpdateClassCommand.cs:6-9`; `Class.cs:35-39`. |
| Status filter 3-way | PASS | `ClassesPage.razor:23-26` (`ClassStatus?` + `Clearable`); `ListClassesHandler.cs:21-22`. |
| Empty teacher/child lists + `VacantSlots = 30` | PASS | `ClassMapper.cs:31-35`; `ClassDetailPage.razor:28,34-47`. |
| Academic year regex `^\d{4}-\d{4}$` | PASS | `CreateClassValidator.cs:15`. |
| AC-1 create → list shows 0/30 | PASS (unit + E2E) | `CreateClassTests.cs:31-45`; `mvp-core.spec.ts:39-41`. |
| AC-2 filter by age group + year | PASS (unit) / partial E2E (SPEC-4) | `ClassQueryTests.cs:48-70`; `mvp-core.spec.ts:44-47` (positive only). |
| AC-3 detail teachers + children + vacant slots | PASS (unit + E2E) | `ClassQueryTests.cs:94-107`; `mvp-core.spec.ts:50-53`. |
| AC-4 rename/room reflected in list | PASS (unit + E2E) | `UpdateClassTests.cs:29-40`; `mvp-core.spec.ts:57-61`. |
| AC-5 close → Closed, still visible under "Đã đóng" | PASS (unit + E2E) | `CloseClassTests.cs:32-42`; `mvp-core.spec.ts:64-70`. |
| Regression: Home unchanged | PASS | `Home.razor` not in the diff; `NavMenu.razor:3` adds one link; `seed.spec.ts` 2/2 PASS (`verification/01.md:28`). |
| Review Focus "lớp đóng vẫn nhận học sinh/giáo viên mới → chặn" | DEFERRED (correctly) | No assignment/enrollment code exists; ticket `01-class-crud.md:47,151` places the guard in tickets 03/05. |
| Scope creep | NONE | Diff touches only the ticket's Component Breakdown paths plus board-reorg noise. `Home.razor`, `appsettings.json`, Sprint-0 scaffold untouched. |

## Findings

| # | Checklist-ID | Severity | file:line | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | SPEC-2 (AC-1 "phòng" / REQ-1; AC-3 detail "Phòng: —") | Minor | `src/SmartKMS.Domain/Modules/Classes/Class.cs:31-32,35-38` | `Create`/`Rename` coerce `room ?? string.Empty`, so a class saved without a room stores `''`, not `NULL`. The DB column is nullable (`ClassConfiguration.cs:21`) and the detail page renders `_detail.Room ?? "—"` (`ClassDetailPage.razor:25`) — which will never fire. | Pass `room` through unchanged so `NULL` is the single "no room" representation, or make `Room` non-nullable end-to-end and drop the `?? "—"`. |
| 2 | SPEC-3 (AC-1 "Fails when: thiếu trường bắt buộc") | Minor | `src/SmartKMS.Web/Components/Pages/Classes/ClassFormDialog.razor:57-62` | The dialog closes unconditionally on submit; the failure path still exists (`ValidationBehavior` → `Result.Failure` → snackbar at `ClassesPage.razor:99-103`), so AC-1 "Fails when" is satisfied end-to-end, but the user loses their input on every validation error. | Keep the dialog open on failure (return the `Result` to the dialog, or re-open it with the entered values). |
| 3 | SPEC-4 (AC-2 "Fails when: kết quả lọc không khớp khối/năm học đã chọn"; ticket E2E outline `01-class-crud.md:107`) | Minor | `e2e/mvp-core.spec.ts:43-47` | The E2E filter step asserts only the positive case (row still visible after filtering Lá + 2025-2026). The ticket's own outline requires the negative assertion — "lọc khối 'Mầm' → hàng biến mất". A filter wired to nothing would still pass this step. Unit coverage (`ClassQueryTests.cs:48-70`) does prove the handler filters, so this is a test-strength gap, not a behaviour gap. | Add the Mầm-filter absence assertion (`await expect(page.getByText('Lớp Lá A')).toBeHidden()`). |
| 4 | SPEC-5 (AC-5 "Fails when: lớp đóng vẫn nhận giáo viên/học sinh mới") | Minor (deferred) | `src/SmartKMS.Domain/Modules/Classes/Class.cs:9-43` | The aggregate exposes no `IsClosed`/`EnsureOpen` seam for tickets 03/05 to guard on. Deferral is legitimate per the ticket, but the domain offers no predicate to reuse. | Optional: add `public bool IsClosed => Status == ClassStatus.Closed;` now. Not required for this ticket's ACs. |
| 5 | SPEC-6 (ticket plan `01-class-crud.md:64` "Mapping/ClassMapper.cs — Riok.Mapperly") | Minor (deviation, documented in code) | `src/SmartKMS.Application/Modules/Classes/Mapping/ClassMapper.cs:6-11` | The plan says Mapperly; the implementation is a hand-written static mapper with a comment explaining why. Reasonable, but the deviation is not recorded in the ticket or `verification/01.md`, so plan and code disagree. | Record the deviation in the ticket's Technical Plan (one line). |

## Notes

- Hollow-wiring check: every command/query in the ticket's "Produces" list (`01-class-crud.md:18`) is reachable from the UI — `CreateClassCommand` (`ClassesPage.razor:97`), `UpdateClassCommand` (`:123`), `CloseClassCommand` (`:146`), `ListClassesQuery` (`:85`), `GetClassDetailQuery` (`:110`, `ClassDetailPage.razor:62`). No `STATIC`/`DISCONNECTED`/`HOLLOW_PROP` wiring found.
- `ClassFormDialog` serves both create and edit (the plan named separate `CreateClassDialog`/`EditClassDialog`); the `Data` parameter distinguishes the modes (`ClassFormDialog.razor:38-57`). Simplification, not a contract break.
- Boundary edge cases covered by unit tests: duplicate across group/year, duplicate excluding self, not-found on update/close/detail, empty list, invalid year formats, room >50, room null.

Worst: None
Axis result: CLEAR
