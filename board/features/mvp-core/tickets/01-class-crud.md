# 01: Quản lý lớp học (CRUD + đóng lớp)

**Serves:** REQ-1, REQ-2, REQ-3, REQ-4, REQ-5 (spec mvp-core)
- Estimate: 2 SP (DEV: 2 SP | QA: 0 SP)
- Feature ID: F-001
- Sprint: BACKLOG
- Sprint Target: DONE
- Dev Assignee: @tl-1
- QA Assignee: @unassigned
- Estimate (optional): 8 SP (DEV: 5 SP | QA: 3 SP)

**What to build:** Màn hình danh sách lớp học cho phép tạo, xem danh sách (lọc theo khối/năm học), xem chi tiết (danh sách giáo viên + học sinh + chỗ trống), cập nhật tên/phòng, và đóng lớp (soft-close).

**Blocked by:** None

**Interfaces:**
- Consumes: `Result<T>`/`Error` (AD-1); `IApplicationDbContext`; `PageHeader`, `DataTable<TItem>`, `EmptyState`, `ConfirmDialog`, MudBlazor primitives (Reuse từ spec `## Existing Reusable Components`).
- Produces: `Class` aggregate + `CreateClassCommand/Query`, `ListClassesQuery`, `GetClassDetailQuery`, `UpdateClassCommand`, `CloseClassCommand`; giá trị `AgeGroup` (Mầm/Chồi/Lá) tái sử dụng từ GLOSSARY.

**Out of scope:** Phân công giáo viên vào lớp (ticket 03); xếp học sinh vào lớp (ticket 05). Regression boundary: `Home.razor` và scaffold Sprint 0 không đổi.

**Plan & Verification:**
- Seam & Failing Test: `dotnet test tests/SmartKMS.Application.UnitTests --filter "FullyQualifiedName~CreateClass"` (RED vì handler chưa có).
- Review Focus Pinned: lớp đóng (Closed) vẫn nhận học sinh/giáo viên mới -> chặn.
- Micro-Step 1: viết test fail cho CreateClass -> cài handler làm pass.
- Micro-Step 2: thêm edge (tên lớp trùng cùng khối+năm học, thiếu trường bắt buộc) -> pass.
- Micro-Step 3: dọn dẹp, xác nhận diff sạch.
- Verify Command: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~Class" && dotnet build SmartKMS.sln`

**Quality Gates:**
- Trace to the spec's `## Quality Gate Plan`: build + Application.UnitTests + ArchitectureTests + format.
- Commands: `dotnet build SmartKMS.sln`; `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~Class"`; `dotnet test tests/SmartKMS.ArchitectureTests/SmartKMS.ArchitectureTests.csproj --filter "FullyQualifiedName~CleanArchitectureRulesTests"`; `dotnet format SmartKMS.sln --verify-no-changes`.
- Evidence: `board/features/mvp-core/verification.md` — hàng Class CRUD.
- UI flows: `e2e/mvp-core.spec.ts` — "tạo lớp & xem danh sách & đóng lớp".

**Status:** READY_FOR_QA
- Plan-Approved: true (approved by: user via interactive gate 2026-11-05)

## Technical Plan

### Grilling Alignment (Two-Axis, đã chốt với user 2026-11-05)

- **G1 (DB env):** Không dùng PostgreSQL nội bộ máy — toàn bộ DB chạy **Docker** (`docker-compose.yml`, image `postgres:17`). `scripts/run-e2e-server.ps1` quản lý vòng đời: pre-flight port check → `docker compose up -d db` (wait healthy) → migration → web server ephemeral → test → teardown (`docker compose down` + taskkill process tree). Connection string truyền qua env var `ConnectionStrings__DefaultConnection` lúc chạy (không sửa `appsettings.json`, không commit mật khẩu thật; mật khẩu dev cục bộ `smartkms_dev` chỉ nằm trong compose file).
- **G2 (EF tooling):** Tool manifest `.config/dotnet-tools.json` pin `dotnet-ef` **10.0.4** (khớp EF Core 10.0.4); `dotnet tool restore` trước khi tạo migration.
- **G3 (Nav):** Thêm `MudNavLink Href="/classes"` + `data-testid="nav-classes"` vào `NavMenu.razor`. `Home.razor` KHÔNG đổi (regression boundary).
- **G4 (AgeGroup):** Enum `AgeGroup` 3 giá trị `Mam`/`Choi`/`La` (Mầm/Chồi/Lá) — đúng spec frozen cho Lớp học; nhóm nhà trẻ bổ sung sau.
- **Zero-ambiguity readings từ ACs (không cần hỏi):** bộ lọc trạng thái 3 mức (Tất cả/Đang hoạt động/Đã đóng — suy từ REQ-5 "lọc 'đã đóng'"); năm học regex `^\d{4}-\d{4}$`; unique (tên, khối, năm học); `MaxStudents = 30` hằng số trên aggregate; `Room` KHÔNG bắt buộc (REQ-1 liệt kê "thiếu trường bắt buộc (tên/khối/năm học)" — không gồm phòng); Update chỉ đổi tên/phòng (AC-4), khối/năm học bất biến; Close idempotent (đóng lớp đã đóng → success, không mất dữ liệu); sửa lớp đã đóng vẫn cho phép (AC không cấm — guard phân công thuộc ticket 03/05); detail hiển thị 0 giáo viên/0 học sinh/30 chỗ trống vì ClassAssignment/ChildEnrollment chưa tồn tại tới ticket 03/05 (spec-review đã chốt danh sách hợp lệ là trống).

### Component Breakdown & Surgical Footprint

**Domain** (`src/SmartKMS.Domain/Modules/Classes/`):
- `AgeGroup.cs` — enum Mam/Choi/La.
- `ClassStatus.cs` — enum Active/Closed.
- `Class.cs` — aggregate root: factory `Create(name, ageGroup, academicYear, room)`, `Rename(name, room)`, `Close()`, `public const int MaxStudents = 30`; status mặc định Active.

**Application** (`src/SmartKMS.Application/Modules/Classes/`):
- `Dtos/ClassSummaryDto.cs` — Id, Name, AgeGroup, AcademicYear, Room, Status, StudentCount, MaxStudents.
- `Dtos/ClassDetailDto.cs` — + Teachers (rỗng), Children (rỗng), VacantSlots (= MaxStudents − StudentCount).
- `Commands/CreateClass/CreateClassCommand.cs` (+ Handler + Validator).
- `Commands/UpdateClass/UpdateClassCommand.cs` (Id, Name, Room) (+ Handler + Validator).
- `Commands/CloseClass/CloseClassCommand.cs` (+ Handler).
- `Queries/ListClasses/ListClassesQuery.cs` (AgeGroup?, AcademicYear?, Status?) (+ Handler).
- `Queries/GetClassDetail/GetClassDetailQuery.cs` (Id) (+ Handler).
- `Mapping/ClassMapper.cs` — Riok.Mapperly (đã pin 4.3.1).

**Infrastructure:**
- `Persistence/Configurations/ClassConfiguration.cs` — bảng `classes`, PK `pk_classes`, unique index `uq_classes_name_agegroup_year` (name, age_group, academic_year), enum → string conversion, name ≤100 NOT NULL, academic_year ≤9 NOT NULL, room ≤50 NULL.
- `Persistence/ApplicationDbContext.cs` — thêm `DbSet<Class> Classes` (sửa 1 dòng).
- `Persistence/Migrations/*InitialCreate*` — migration đầu tiên (Identity + classes), tạo bằng dotnet-ef từ tool manifest.

**Web:**
- `Components/Pages/Classes/ClassesPage.razor` — `@page "/classes"`: bộ lọc khối/năm học/trạng thái + `DataTable` + nút Tạo lớp + hành động Sửa/Đóng/Xem; `data-testid`: `class-create-button`, `class-agegroup-filter`, `class-year-filter`, `class-status-filter`, `class-row-*`, `class-close-button`.
- `Components/Pages/Classes/ClassDetailPage.razor` — `@page "/classes/{Id:guid}"`: thông tin lớp + EmptyState danh sách giáo viên/học sinh + chỗ trống.
- `Components/Pages/Classes/CreateClassDialog.razor` + `EditClassDialog.razor` — form tên/khối/năm học/phòng; `data-testid`: `class-name-input`, `class-agegroup-select`, `class-year-input`, `class-room-input`, `class-submit-button`.
- `Components/Layout/NavMenu.razor` — +1 dòng nav link (sửa).

**Tests:**
- `tests/SmartKMS.Domain.UnitTests/Classes/ClassTests.cs` — factory/Close/Rename/MaxStudents.
- `tests/SmartKMS.Application.UnitTests/Classes/TestApplicationDbContext.cs` — DbContext InMemory implement `IApplicationDbContext` (test double tại seam, spec Testing Decisions cho phép in-memory cho handler test).
- `tests/SmartKMS.Application.UnitTests/Classes/{CreateClass,ListClasses,GetClassDetail,UpdateClass,CloseClass,Validators}Tests.cs`.
- `tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj` — thêm `Microsoft.EntityFrameworkCore.InMemory` 10.0.4 (NuGet chính chủ, khớp pin EF Core).

**E2E & Infra:**
- `docker-compose.yml` (root) — service `db` postgres:17, DB `smartkms`, user `postgres`, password `smartkms_dev`, healthcheck `pg_isready`.
- `scripts/run-e2e-server.ps1` — supervisor ephemeral theo đúng hợp đồng skill.
- `e2e/playwright.config.ts` — baseURL `http://localhost:5160` (override bằng env `E2E_BASE_URL`), reporter line.
- `e2e/mvp-core.spec.ts` — happy path headed, `slowMo: 300`, assert circuit `/_blazor` 101 trước mọi tương tác.
- `.config/dotnet-tools.json` — dotnet-ef 10.0.4.

**Không đụng:** `Home.razor`, `appsettings.json`, scaffold Sprint 0 khác (Anti-Preemption). Cảnh báo CS0105 có sẵn ở `_Imports.razor:8` → queue `suggested-tasks.md`.

### Data Flow & Schema Impact

1. **Create:** Dialog → `ISender.Send(CreateClassCommand)` → `ValidationBehavior` (Name required ≤100; AcademicYear regex `^\d{4}-\d{4}$`; Room optional ≤50) → Handler: `AnyAsync` unique check (Name+AgeGroup+AcademicYear) → duplicate ⇒ `Result.Failure<Guid>(Error.Validation("Class.DuplicateName", …))` → `Class.Create` → Save → `Result<Guid>` → snackbar thành công + reload list.
2. **List:** Filters (khối/year/trạng thái, nullable = không lọc) → `ListClassesQuery` → `AsNoTracking` + `Where` tương ứng → `IReadOnlyList<ClassSummaryDto>`; StudentCount = 0 cho tới ticket 05.
3. **Detail:** `GetClassDetailQuery` → NotFound ⇒ `Error.NotFound("Class.NotFound", …)`; thành công ⇒ DTO với Teachers=[], Children=[], `VacantSlots = MaxStudents − StudentCount`.
4. **Update:** (Id, Name, Room) → NotFound guard → duplicate check loại trừ chính nó → `Rename` → Save. Khối/năm học không đổi.
5. **Close:** NotFound guard → `Close()` (idempotent) → Save.
- DB unique index `uq_classes_name_agegroup_year` là defense-in-depth; đường lỗi nghiệp vụ qua handler check (testable ở unit test vì InMemory không enforce index).

### Playwright E2E Happy Path Outline (headed, slowMo 300, circuit sync)

Ephemeral: `powershell -ExecutionPolicy Bypass -File scripts/run-e2e-server.ps1 -Port 5160 -TestCommand "npx playwright test seed.spec.ts mvp-core.spec.ts --headed"`

1. `waitForResponse /_blazor 101` → click `nav-classes` → URL `/classes`, header "Lớp học".
2. Click `class-create-button` → dialog visible → điền "Lớp Lá A" / khối "Lá" / "2025-2026" / "Phòng 101" → submit → hàng "Lớp Lá A" với "0/30" + "Hoạt động".
3. Lọc khối "Lá" + năm "2025-2026" → hàng hiển thị; lọc khối "Mầm" → hàng biến mất (assert absence).
4. Vào chi tiết → EmptyState giáo viên + học sinh + "Chỗ trống: 30".
5. Sửa → đổi "Lớp Lá A1" / "Phòng 102" → hàng phản ánh tên mới.
6. Đóng lớp → ConfirmDialog `confirm-dialog-ok` → chip "Đã đóng"; lọc trạng thái "Đã đóng" → hàng vẫn hiển thị (soft-close).
7. Regression: `seed.spec.ts` green (Home "Tổng quan" không lỗi, NavMenu nguyên vẹn).

### Unit Test Matrix (RED Criteria)

| Test | Chứng minh |
| :--- | :--- |
| `ClassTests.Create_SetsActiveStatus_WithDefaults` | factory + trạng thái mặc định |
| `ClassTests.Close_SetsClosedStatus` / `Close_IsIdempotent` | soft-close |
| `ClassTests.Rename_UpdatesNameAndRoom` | hành vi rename |
| `ClassTests.MaxStudents_Is30` | hằng số sĩ số cố định |
| `CreateClassTests.HappyPath_PersistsActiveClass` | AC-1 tạo lớp |
| `CreateClassTests.DuplicateName_SameGroupAndYear_FailsValidation` | AC-1 "Fails when" |
| `CreateClassTests.SameName_DifferentGroupOrYear_Succeeds` | biên unique |
| `CreateClassValidators` (tên rỗng, năm sai format, phòng >50) | validation REQ-1 |
| `ListClassesTests.Filter_ByAgeGroup/ByYear/ByStatus/NoFilter_All/Empty` | AC-2 / REQ-2 / REQ-5 |
| `GetClassDetailTests.HappyPath_VacantSlots30_EmptyLists` / `NotFound` | AC-3 |
| `UpdateClassTests.HappyPath_ChangesNameRoom` / `NotFound` / `DuplicateName_ExcludingSelf` / `KeepsAgeGroupYear` | AC-4 |
| `CloseClassTests.HappyPath_Closed` / `NotFound` / `AlreadyClosed_Idempotent` | AC-5 |

## Risks & Trade-offs

- **InMemory cho handler tests:** không enforce unique index — rule trùng tên được test qua handler check; index là defense-in-depth ở migration. Testcontainers cho integration đúng chuẩn ADR sẽ tới ở wave sau.
- **Detail counts = 0 cứng:** trung thực với slice (chưa có assignment/enrollment), ticket 05 mở rộng query này.
- **Migration đầu gộp cả bảng Identity:** đúng debt ledger "migration đầu tiên ở wave có entity đầu tiên".
- **Docker Desktop phải chạy:** nếu daemon không lên được, E2E bị block và tôi sẽ báo lại (không bypass).
- **Chromium Playwright:** nếu chưa cài sẽ chạy `npx playwright install chromium` (tải một lần).

<!-- PLAN-APPROVED: user (2026-11-05, interactive approval gate) -->

**Acceptance (Capability & Regression Evals):**
<!-- FOUR-EYES AC ANCHOR -->
- [ ] [Capability] Given biểu mẫu lớp hợp lệ (tên, khối Mầm/Chồi/Lá, năm học "2025-2026", phòng), When gửi tạo lớp, Then lớp mới xuất hiện trong danh sách với sĩ số 0/30.
  - Fails when: thiếu trường bắt buộc hoặc tên lớp trùng trong cùng khối+năm học.
- [ ] [Capability] Given danh sách lớp, When lọc theo khối và năm học, Then chỉ các lớp khớp tiêu chí hiển thị.
  - Fails when: kết quả lọc không khớp khối/năm học đã chọn.
- [ ] [Capability] Given một lớp, When xem chi tiết, Then hiển thị danh sách giáo viên + học sinh + số chỗ trống = 30 − sĩ số.
  - Fails when: danh sách giáo viên/học sinh hiển thị thiếu hoặc thừa.
- [ ] [Capability] Given một lớp, When đổi tên/phòng và lưu, Then danh sách phản ánh giá trị mới.
  - Fails when: đổi tên trùng lớp khác cùng khối+năm học.
- [ ] [Capability] Given một lớp, When đóng lớp, Then trạng thái thành Closed (soft-close) và vẫn hiện khi lọc "đã đóng".
  - Fails when: lớp biến mất khỏi dữ liệu (xóa cứng) hoặc lớp đóng vẫn nhận giáo viên/học sinh mới (điểm này chốt tại ticket 03/05).
- [ ] [Regression] Given trang Home mặc định Sprint 0, When render, Then vẫn hiển thị không lỗi.
  - Fails when: ArchitectureTests hoặc build báo lỗi.

## Handoff Summary

Ticket 01 hoàn tất DEV, chuyển `READY_FOR_QA`. Bằng chứng (chạy fresh session này): unit/architecture 36 test pass (Domain 6 + Application 27 + Architecture 3), E2E headed `3 passed (12.7s)` — mvp-core happy path (tạo→lọc→xem→sửa→đóng, 9.7s) + seed 2/2. Root cause lỗi UI/E2E là `App.razor` thiếu CSS/JS MudBlazor (đã sửa, commit `8d52795`). Two-axis review: Standards CLEAR · Spec CLEAR.

**Queued tasks từ `board/features/mvp-core/suggested-tasks.md` (không thuộc ticket này, chờ slice riêng):**

| # | Nội dung |
|---|---|
| S-01 | `_Imports.razor:8` warning CS0105 (trùng using) — pre-existing |
| S-02 | `DataTable<TItem>` wrapper không truyền generic context cho column typed (ticket dùng `MudDataGrid` trực tiếp) |
| S-03 | Migration `InitialCreate` gộp cả bảng Identity + classes (đúng debt ledger, không cần tách ngay) |
| S-04 | `StudentCount`/detail lists hard-code 0 — chờ ticket 05 (enrollment) + 03 (assignment) mở rộng query |
| S-05 | Testcontainers Postgres 17 thay InMemory cho handler tests (đúng chuẩn ADR "không InMemory cho DB thật") |

Cộng minors từ code-review: index `uq_classes_name_agegroup_year` lệch snake_case (`agegroup` vs `age_group`), `room` null-vs-empty dual representation, dùng `MudDataGrid` thay `DataTable<TItem>` wrapper, thiếu `IsClosed` seam cho guard ticket 03/05.
