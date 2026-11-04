# 02: Quản lý giáo viên (CRUD + ngừng công tác)

**Serves:** REQ-7, REQ-8, REQ-10, REQ-11 (spec mvp-core)
- Estimate: 2 SP (DEV: 2 SP | QA: 0 SP)
- Feature ID: F-001
- Sprint: BACKLOG
- Sprint Target: DONE
- Dev Assignee: @tl-1
- QA Assignee: @unassigned
- Estimate (optional): 6 SP (DEV: 4 SP | QA: 2 SP)

**What to build:** Màn hình hồ sơ giáo viên cho phép tạo (họ tên, ngày sinh, liên hệ, trình độ, ngày vào trường, trạng thái), sửa, ngừng công tác (soft-close), xem danh sách lớp phụ trách, và tìm kiếm/lọc theo trạng thái/lớp/khối.

**Blocked by:** None (danh sách lớp phụ trách có thể trống trước khi có ticket 03).

**Interfaces:**
- Consumes: `Result<T>`/`Error`; `IApplicationDbContext`; `PageHeader`, `DataTable<TItem>`, `EmptyState`, `ConfirmDialog`, MudBlazor primitives.
- Produces: `Teacher` aggregate + `CreateTeacherCommand`, `UpdateTeacherCommand`, `WithdrawTeacherCommand`, `ListTeachersQuery`, `GetTeacherAssignmentsQuery`.

**Out of scope:** Phân công giáo viên vào lớp (ticket 03). Regression boundary: module Classes (ticket 01) không đổi.

**Plan & Verification:**
- Seam & Failing Test: `dotnet test tests/SmartKMS.Application.UnitTests --filter "FullyQualifiedName~CreateTeacher"` (RED).
- Review Focus Pinned: một giáo viên chủ nhiệm 2 lớp -> chặn (chốt tại ticket 03; ở đây kiểm tra dữ liệu hồ sơ đúng).
- Micro-Step 1: test fail CreateTeacher -> pass.
- Micro-Step 2: edge (thiếu họ tên/ngày sinh, ngừng công tác không xóa) -> pass.
- Micro-Step 3: dọn dẹp, diff sạch.
- Verify Command: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~Teacher" && dotnet build SmartKMS.sln`

**Quality Gates:**
- Commands: build; Application.UnitTests `--filter "FullyQualifiedName~Teacher"`; ArchitectureTests; format.
- Evidence: `board/features/mvp-core/verification.md` — hàng Teacher CRUD.
- UI flows: `e2e/mvp-core.spec.ts` — "tạo giáo viên & ngừng công tác".

**Status:** READY_FOR_DEV

**Acceptance (Capability & Regression Evals):**
- [ ] [Capability] Given biểu mẫu giáo viên hợp lệ, When gửi tạo, Then hồ sơ lưu đủ họ tên, ngày sinh, liên hệ, trình độ, ngày vào trường, trạng thái làm việc.
  - Fails when: thiếu họ tên hoặc ngày sinh.
- [ ] [Capability] Given một giáo viên, When ngừng công tác, Then trạng thái đổi mà không xóa khỏi lịch sử phân công.
  - Fails when: giáo viên biến mất khỏi danh sách/lịch sử.
- [ ] [Capability] Given một giáo viên, When xem danh sách lớp phụ trách, Then liệt kê các lớp chủ nhiệm + hỗ trợ.
  - Fails when: danh sách lớp thiếu phân công (trống hợp lệ trước ticket 03).
- [ ] [Capability] Given danh sách giáo viên, When lọc theo trạng thái/lớp/khối, Then kết quả khớp tiêu chí.
  - Fails when: kết quả lọc không khớp.
- [ ] [Regression] Given module Classes (ticket 01), When chạy test Class, Then vẫn green.
  - Fails when: ArchitectureTests/buôn báo lỗi.
