# SPEC: mvp-core

<frozen-after-approval>

## Goal

Hoàn thiện bản MVP hệ thống quản lý trường mầm non "Mầm Chồi Lá" (Giai đoạn 1: quản lý Lớp học, Giáo viên, Học sinh; phân công 3 giáo viên/lớp; xếp học sinh vào lớp; dashboard cơ bản).

## Problem Statement

Trường mầm non "Mầm Chồi Lá" hiện quản lý vận hành bằng sổ sách thủ công: danh sách lớp, giáo viên và học sinh nằm rải rác, việc phân công giáo viên vào lớp và xếp học sinh vào lớp không có cơ chế kiểm soát sĩ số chặt chẽ, và không có nơi nhìn tổng thể để phát hiện lớp thiếu giáo viên hay sắp đầy sĩ số. Hệ thống cần số hóa ba thực thể cốt lõi (Lớp học – Giáo viên – Học sinh) với các ràng buộc nghiệp vụ đặc trưng (mỗi lớp gắn đúng 3 giáo viên, sĩ số tối đa 30) và một bảng điều khiển tổng quan để cảnh báo vi phạm.

### Ubiquitous Language & DDD Domain Model (Bounded Context)

<!-- Đồng bộ hai chiều với GLOSSARY.md — bài toán này dùng các thuật ngữ GLOSSARY hiện có (Child, AgeGroup, ChildEnrollment) cộng thêm thực thể Lớp và Giáo viên/Phân công chưa có. -->

| Term (VI) | Code Identifier (EN) | DDD Role (Aggregate Root / Entity / Value Object / Domain Event / Service) | Core Invariant |
| :--- | :--- | :--- | :--- |
| Lớp học | `Class` | Aggregate Root (Classes) | Sĩ số tối đa 30; thuộc đúng một khối Mầm/Chồi/Lá; gắn từ 1 đến 3 giáo viên (không quá 3), trong đó đúng 1 giáo viên chủ nhiệm khi đủ 3 GV |
| Giáo viên | `Teacher` | Aggregate Root (Teachers) | Mỗi giáo viên được chủ nhiệm tối đa 1 lớp; được hỗ trợ nhiều lớp |
| Phân công giáo viên–lớp | `ClassAssignment` | Entity (thuộc Class) | Liên kết Teacher↔Class với vai trò Homeroom/Support và năm học; tổng vai trò Homeroom của một Class ≤ 1 |
| Học sinh | `Child` | Aggregate Root (Children) | `ChildCode` duy nhất; trạng thái học hợp lệ (Enrolled/Withdrawn) |
| Xếp lớp | `ChildEnrollment` | Entity (thuộc Child) | Liên kết 1 trẻ ↔ 1 lớp; ghi lịch sử lớp đã học; tổng sĩ số lớp ≤ 30 |
| Khối nhóm tuổi | `AgeGroup` | Value Object | Mầm (3–4), Chồi (4–5), Lá (5–6) |
| Năm học | `(string)` | Value Object (thuộc tính) | Chuỗi dạng "2025-2026", không phải thực thể |

## Solution

Xây dựng ba module CRUD gắn kết quanh các aggregate `Class`, `Teacher`, `Child`, cộng một màn hình `Dashboard` tổng quan. Bộ chỉ huy (command) thực thi các bất biến miền (sĩ số 30, ≤3 giáo viên, 1 chủ nhiệm) và trả về `Result<T>` theo AD-1; các màn Blazor + MudBlazor hiển thị dữ liệu và phản hồi lỗi qua `ISnackbar`. Toàn bộ nghiệp vụ ở MVP chạy dưới một vai trò quản trị duy nhất (chưa có đăng nhập).

## Existing Reusable Components

- `Result<T>` / `Result` / `Error` / `PagedResult<T>` — `src/SmartKMS.Application/Common/Models/` — [CONTRACT] mọi Handler trả `Result<T>` (AD-1).
- `IApplicationDbContext` — `src/SmartKMS.Application/Common/Interfaces/` — [CONTRACT] Handler truy cập DB qua interface này.
- `IDateTimeProvider` / `ICurrentUserService` — `src/SmartKMS.Application/Common/Interfaces/` — [HELPER] thời gian/test double.
- `PageHeader` — `src/SmartKMS.Web/Components/Common/PageHeader.razor` — [UI] header mọi trang.
- `ConfirmDialog` — `src/SmartKMS.Web/Components/Common/ConfirmDialog.razor` — [UI] xác nhận thao tác đóng lớp / ngừng công tác / thôi học.
- `EmptyState` — `src/SmartKMS.Web/Components/Common/EmptyState.razor` — [UI] danh sách rỗng.
- `DataTable<TItem>` — `src/SmartKMS.Web/Components/Common/DataTable.razor` — [UI] wrapper MudDataGrid cho mọi màn danh sách.
- `KindergartenTheme` — `src/SmartKMS.Web/Theme/KindergartenTheme.cs` — [THEME] token toàn app.
- MudBlazor primitives (`MudButton`, `MudTextField`, `MudSelect`, `MudDialog`, `ISnackbar`, `MudChip`, `MudPaper`) — gói `MudBlazor` 9.12.0 — [UI] dùng trực tiếp, cấm wrapper.

## Global Constraints

- .NET 10 (C# 14); Blazor Interactive Server + MudBlazor 9.12.0; PostgreSQL 17 / EF Core 10 (snake_case).
- MediatR pin 12.4.1 (cấm v13+); FluentValidation qua pipeline `ValidationBehavior` (AD-3).
- Không dùng DataAnnotations trên entity; validation trong `AbstractValidator<T>`; DB config chỉ trong `IEntityTypeConfiguration<T>`.
- Không dùng exception cho lỗi nghiệp vụ — mọi thứ qua `Result<T>` (AD-1).
- snake_case bảng/cột/index; PK `pk_<table>`, FK `fk_<child>_<parent>_<col>`, unique `uq_<table>_<cols>`.
- ID dùng `Guid`; rich domain: hành vi qua phương thức entity + factory method.
- Naming: Command/Query = Động từ + Danh từ + Command/Query; DTO = Danh từ + `Dto`; Razor = PascalCase `.razor`.

## User Stories (Capability Evals)

### Module: Quản lý Lớp học

REQ-1. As an quản trị viên, I want tạo lớp học mới, so that trường có cấu trúc lớp theo khối và năm học.
- Expected: sau khi gửi biểu mẫu hợp lệ (tên lớp, khối Mầm/Chồi/Lá, năm học dạng "2025-2026", phòng học), lớp mới xuất hiện trong danh sách với sĩ số 0/30.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~CreateClass"` (RED trước, GREEN sau khi cài).
- Fails when: thiếu trường bắt buộc (tên/khối/năm học), hoặc tên lớp trùng trong cùng khối+năm học.
- Must not: cho phép sĩ số tối đa khác 30 (hằng số cố định).

REQ-2. As an quản trị viên, I want xem danh sách lớp theo khối và năm học, so that nắm cấu trúc trường nhanh.
- Expected: danh sách lọc được theo khối (Mầm/Chồi/Lá) và năm học; mỗi hàng hiển thị tên, khối, sĩ số hiện tại/30, trạng thái.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~ListClasses"`
- Fails when: kết quả lọc không khớp khối/năm học đã chọn.

REQ-3. As an quản trị viên, I want xem chi tiết một lớp, so that biết danh sách giáo viên và học sinh hiện tại.
- Expected: chi tiết lớp hiển thị 3 giáo viên (kèm vai trò chủ nhiệm/hỗ trợ), danh sách học sinh, và số chỗ trống = 30 − sĩ số hiện tại.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~GetClassDetail"`
- Fails when: danh sách giáo viên/học sinh hiển thị thiếu hoặc thừa so với phân công/xếp lớp hiện có.

REQ-4. As an quản trị viên, I want cập nhật thông tin lớp (đổi tên, đổi phòng), so that thông tin luôn chính xác.
- Expected: sau khi sửa tên/phòng và lưu, danh sách/chi tiết phản ánh giá trị mới.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~UpdateClass"`
- Fails when: đổi tên thành giá trị trùng lớp khác cùng khối+năm học.

REQ-5. As an quản trị viên, I want đóng lớp khi kết thúc năm học, so that dữ liệu được lưu trữ mà không mất lịch sử.
- Expected: lớp chuyển trạng thái Closed (soft-close); vẫn hiện trong danh sách khi lọc "đã đóng", không thể xếp thêm học sinh/giáo viên vào lớp đã đóng.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~CloseClass"`
- Fails when: lớp đã đóng vẫn nhận học sinh/giáo viên mới, hoặc lớp biến mất khỏi dữ liệu (xóa cứng).

REQ-6. As an quản trị viên, I want hệ thống cảnh báo khi lớp chưa đủ hoặc vượt quá 3 giáo viên, so that ràng buộc 3 GV/lớp được giám sát.
- Expected: lớp có 1–2 giáo viên hiển thị cảnh báo "thiếu giáo viên"; thao tác thêm giáo viên thứ 4 bị chặn bằng lỗi `Error.Validation`.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~ClassTeacherCount"`
- Fails when: cho phép 4 giáo viên trong một lớp, hoặc không phát sinh cảnh báo cho lớp dưới 3 GV.

### Module: Quản lý Giáo viên

REQ-7. As an quản trị viên, I want tạo hồ sơ giáo viên, so that có thông tin nhân sự giảng dạy.
- Expected: hồ sơ lưu họ tên, ngày sinh, liên hệ, trình độ chuyên môn, ngày vào trường, trạng thái làm việc (Đang làm/Ngừng công tác).
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~CreateTeacher"`
- Fails when: thiếu họ tên hoặc ngày sinh.

REQ-8. As an quản trị viên, I want chỉnh sửa và ngừng công tác giáo viên, so that hồ sơ luôn đúng hiện trạng.
- Expected: sửa thông tin cập nhật đúng; "ngừng công tác" chuyển trạng thái mà không xóa giáo viên khỏi lịch sử phân công.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~UpdateTeacher\|WithdrawTeacher"`
- Fails when: giáo viên ngừng công tác biến mất khỏi danh sách/lịch sử phân công.

REQ-9. As an quản trị viên, I want phân công giáo viên vào lớp với vai trò chủ nhiệm/hỗ trợ, so that mỗi lớp có đúng cấu trúc giáo viên.
- Expected: gán giáo viên vào lớp kèm vai trò (Homeroom/Support); hệ thống chặn (Error) nếu lớp đã đủ 3 GV, hoặc lớp đã có chủ nhiệm mà gán thêm chủ nhiệm, hoặc GV đó đang chủ nhiệm lớp khác.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~AssignTeacher"`
- Fails when: vi phạm một trong ba ràng buộc trên mà vẫn thành công.

REQ-10. As an quản trị viên, I want xem danh sách lớp mà một giáo viên phụ trách, so that theo dõi khối lượng phân công.
- Expected: trang/chế độ xem của một giáo viên liệt kê các lớp họ phụ trách (chủ nhiệm + hỗ trợ).
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~TeacherAssignments"`
- Fails when: danh sách lớp thiếu phân công hỗ trợ hoặc chủ nhiệm.

REQ-11. As an quản trị viên, I want tìm kiếm và lọc giáo viên theo trạng thái, lớp, khối, so that định vị nhân sự nhanh.
- Expected: danh sách giáo viên lọc theo trạng thái (Đang làm/Ngừng), theo lớp, theo khối.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~FilterTeachers"`
- Fails when: kết quả lọc không khớp tiêu chí.

### Module: Quản lý Học sinh

REQ-12. As an quản trị viên, I want tạo hồ sơ học sinh, so that có thông tin trẻ và phụ huynh.
- Expected: hồ sơ lưu họ tên, ngày sinh, giới tính, thông tin phụ huynh/người giám hộ, địa chỉ, ngày nhập học, trạng thái (Đang học/Thôi học).
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~CreateChild"`
- Fails when: thiếu họ tên hoặc ngày sinh.

REQ-13. As an quản trị viên, I want xếp học sinh vào lớp phù hợp khối tuổi, so that trẻ học đúng khối.
- Expected: xếp trẻ vào lớp; nếu lớp còn chỗ (sĩ số < 30) thì thành công, nếu đầy 30 thì bị chặn bằng lỗi `Error.Conflict`; nếu trẻ không khớp độ tuổi khối thì cảnh báo nhưng vẫn cho xếp.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~EnrollChild"`
- Fails when: xếp vào lớp đã đủ 30 vẫn thành công, hoặc xếp lệch tuổi bị chặn cứng (trái D-09).

REQ-14. As an quản trị viên, I want chuyển lớp cho học sinh giữa năm, so that điều chỉnh lớp khi cần và giữ lịch sử.
- Expected: học sinh chuyển từ lớp A sang lớp B (có lịch sử lớp đã học); bị chặn nếu lớp B đã đủ 30.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~TransferChild"`
- Fails when: chuyển vào lớp đầy vẫn thành công, hoặc lịch sử lớp đã học bị mất.

REQ-15. As an quản trị viên, I want xem bạn cùng lớp và giáo viên phụ trách của một học sinh, so that nắm bối cảnh lớp của trẻ.
- Expected: chi tiết học sinh hiển thị danh sách lớp hiện tại, các bạn cùng lớp, và 3 giáo viên phụ trách.
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~ChildClassmates"`
- Fails when: danh sách bạn cùng lớp/giáo viên hiển thị sai.

REQ-16. As an quản trị viên, I want tìm kiếm và lọc học sinh theo lớp, khối, trạng thái, so that định vị học sinh nhanh.
- Expected: danh sách học sinh lọc theo lớp, khối, trạng thái (Đang học/Thôi học).
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~FilterChildren"`
- Fails when: kết quả lọc không khớp tiêu chí.

### Module: Dashboard

REQ-17. As an quản trị viên, I want bảng điều khiển tổng quan, so that nắm tình hình toàn trường trong một màn hình.
- Expected: hiển thị tổng số lớp, tổng số giáo viên, tổng số học sinh, sĩ số theo từng khối; danh sách cảnh báo: lớp thiếu giáo viên, lớp gần đầy (28–29/30), lớp đã đầy (30/30).
- Verification: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~Dashboard"`
- Fails when: số liệu thống kê sai lệch, hoặc lớp ≥28/30 không xuất hiện trong danh sách cảnh báo tương ứng.

</frozen-after-approval>

## Affected Paths

- `src/SmartKMS.Domain/` — thêm aggregates `Classes`, `Teachers`, `Children` (hoặc mở rộng `Child` hiện có nếu đã tồn tại các value object `AgeGroup`).
- `src/SmartKMS.Application/` — thêm Modules `Classes`, `Teachers`, `Children`, `Dashboard` (Commands/Queries/Handlers/DTO/Validators).
- `src/SmartKMS.Infrastructure/Persistence/` — DbContext mở rộng `DbSet` cho Class/Teacher/Child/ClassAssignment/ChildEnrollment + `IEntityTypeConfiguration` + migration đầu tiên.
- `src/SmartKMS.Web/Components/Pages/` — thêm các trang `.razor` cho Classes, Teachers, Children, Dashboard.

### Delete-Zone Table (Deprecated / Removed Entities)

| Path / Symbol | Deprecation Reason | Replacement / Migration |
| :--- | :--- | :--- |
| `none` | — | — |

## Regression Evals

- Kiến trúc Clean Architecture không bị vi phạm: `dotnet test tests/SmartKMS.ArchitectureTests/SmartKMS.ArchitectureTests.csproj --filter "FullyQualifiedName~CleanArchitectureRulesTests"`
- Build toàn giải pháp không hồi quy: `dotnet build SmartKMS.sln` (0 warning, 0 error).
- `Home.razor` (trang mặc định Sprint 0) vẫn render không lỗi.

## Review Focus

- `lớp đã đủ 30 nhưng vẫn xếp thêm học sinh -> chặn Error.Conflict`
- `lớp đã có chủ nhiệm nhưng gán thêm chủ nhiệm -> chặn Error.Validation`
- `một giáo viên chủ nhiệm 2 lớp -> chặn Error.Validation`
- `xếp học sinh lệch độ tuổi khối -> cảnh báo nhưng vẫn thành công`
- `lớp đóng (Closed) vẫn nhận học sinh/giáo viên mới -> chặn`

## Implementation & Interface Decisions

- Ba aggregate roots `Class`, `Teacher`, `Child` + hai entity liên kết `ClassAssignment` (Teacher↔Class) và `ChildEnrollment` (Child↔Class).
- `Child` hiện có thể đã tồn tại ở Sprint-0 scaffold (xem GLOSSARY `Child` / `AgeGroup`); việc khai thác phải tái sử dụng `AgeGroup` (Mầm/Chồi/Lá) thay vì tạo enum mới.
- Mọi use case theo CQRS: Command trả `Result<T>`, Query trả `Result<T>`/`PagedResult<T>`.
- Không có thực thể `School` (D-04) và không có thực thể `AcademicYear` (D-07) — năm học là thuộc tính chuỗi.

### Architecture Spine (AD-n Binding Decisions)

- **AD-1 (Domain error model):**
  - Binds: toàn bộ module Classes/Teachers/Children/Dashboard.
  - Prevents: dùng exception cho lỗi nghiệp vụ.
  - Rule: Mọi Handler trả `Result<T>`; lỗi nghiệp vụ qua `Error.NotFound/Validation/Conflict`.
- **AD-2 (Teacher count invariant):**
  - Binds: module Classes + Teachers (phân công).
  - Prevents: hơn 3 giáo viên/lớp, nhiều hơn 1 chủ nhiệm/lớp, 1 GV chủ nhiệm nhiều lớp.
  - Rule: `ClassAssignment` thực thi bất biến tại aggregate `Class`; số GV/lớp được kiểm tra trong command phân công trong cùng giao dịch.
- **AD-3 (Class capacity invariant):**
  - Binds: Classes + Children (xếp lớp).
  - Prevents: vượt sĩ số 30.
  - Rule: sĩ số kiểm tra trong command xếp lớp/chuyển lớp trong cùng giao dịch, lỗi `Error.Conflict`.

## Testing Decisions

- Test ở seam công khai: handler (Application.UnitTests) kiểm tra hành vi qua `IApplicationDbContext` in-memory/Effort (không test internal).
- TDD RED→GREEN cho từng REQ; mỗi REQ có một test lớp đặt tên theo capability (CreateClass, AssignTeacher, EnrollChild, TransferChild, Dashboard…).
- Counter-test bar: mỗi rule nghiệp vụ (≤3 GV, 1 chủ nhiệm, ≤30 sĩ số, soft-close) phải có ít nhất một test phủ định (vi phạm rule phải fail).
- Test kiến trúc chạy cùng `ArchitectureTests` hiện có, không tạo project test mới.

## Verification Plan

- Build: `dotnet build SmartKMS.sln` (0 warning, 0 error).
- Domain/Application test: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj`
- Kiến trúc: `dotnet test tests/SmartKMS.ArchitectureTests/SmartKMS.ArchitectureTests.csproj --filter "FullyQualifiedName~CleanArchitectureRulesTests"`
- Format: `dotnet format SmartKMS.sln --verify-no-changes`
- E2E UI: `cd e2e && npm install && npx playwright test` (chạy app trước: `dotnet run --project src/SmartKMS.Web`) — bao gồm DEV Happy Path (tạo lớp → tạo GV → phân công → tạo HS → xếp lớp → xem dashboard) và TESTER Adversarial (xếp vào lớp đầy, gán GV thứ 4, chuyển vào lớp đầy).
- Evidence path: `board/features/mvp-core/verification.md`.

## Out of Scope

- Xác thực & phân quyền theo vai trò (Admin/Teacher/Parent) — để Giai đoạn 2 (D-01).
- Điểm danh hằng ngày, Học phí, Thực đơn & bữa ăn, Sức khỏe & tăng trưởng, Nhật ký lớp, Thông báo phụ huynh, Báo cáo thống kê nâng cao, Quản lý năm học.
- Nghiệp vụ "lên khối" cuối năm và quản lý năm học tự động — để Giai đoạn 4 (D-06).
- Thực thể `School` (đa trường/tenant) — bỏ (D-04).
- Xóa cứng (hard delete) bất kỳ — toàn bộ là soft-close (D-03).

## Further Notes

- Quản lý năm học là thuộc tính chuỗi trên Lớp và Phân công; quy tắc "lên khối theo năm học" thuộc GĐ4, không phải MVP này.
- Ngưỡng "gần đầy" = 28/30 là hằng số cấu hình, có thể đổi sau (D-08).

## Spec Change Log

| Date | Section | Reason & KEEP Instructions |
| :--- | :--- | :--- |
