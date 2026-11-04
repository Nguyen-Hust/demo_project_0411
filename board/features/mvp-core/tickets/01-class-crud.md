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

**Status:** READY_FOR_DEV

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
