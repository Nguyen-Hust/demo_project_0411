# 04: Quản lý học sinh (CRUD + thôi học)

**Serves:** REQ-12, REQ-15, REQ-16 (spec mvp-core)
- Estimate: 2 SP (DEV: 2 SP | QA: 0 SP)
- Feature ID: F-001
- Sprint: BACKLOG
- Sprint Target: DONE
- Dev Assignee: @tl-1
- QA Assignee: @unassigned
- Estimate (optional): 6 SP (DEV: 4 SP | QA: 2 SP)

**What to build:** Màn hình hồ sơ học sinh cho phép tạo (họ tên, ngày sinh, giới tính, thông tin phụ huynh, địa chỉ, ngày nhập học, trạng thái), sửa, thôi học (soft-close), xem bạn cùng lớp + giáo viên phụ trách (trống trước ticket 05), và tìm kiếm/lọc theo lớp/khối/trạng thái.

**Blocked by:** None (xem bạn cùng lớp/giáo viên có thể trống trước ticket 05/03).

**Interfaces:**
- Consumes: `Result<T>`/`Error`; `IApplicationDbContext`; `PageHeader`, `DataTable<TItem>`, `EmptyState`, `ConfirmDialog`, MudBlazor primitives.
- Produces: `Child` aggregate + `CreateChildCommand`, `UpdateChildCommand`, `WithdrawChildCommand`, `ListChildrenQuery`, `GetChildContextQuery` (bạn cùng lớp + giáo viên).

**Out of scope:** xếp lớp và chuyển lớp (ticket 05). Regression boundary: Teacher/Class không đổi.

**Plan & Verification:**
- Seam & Failing Test: `dotnet test tests/SmartKMS.Application.UnitTests --filter "FullyQualifiedName~CreateChild"` (RED).
- Review Focus Pinned: (không có chặn cứng ở CRUD; chặn tại ticket 05).
- Micro-Step 1: test fail CreateChild -> pass.
- Micro-Step 2: edge (thiếu họ tên/ngày sinh, thôi học không xóa) -> pass.
- Micro-Step 3: dọn dẹp, diff sạch.
- Verify Command: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~Child" && dotnet build SmartKMS.sln`

**Quality Gates:**
- Commands: build; Application.UnitTests `--filter "FullyQualifiedName~Child"`; ArchitectureTests; format.
- Evidence: `board/features/mvp-core/verification.md` — hàng Child CRUD.
- UI flows: `e2e/mvp-core.spec.ts` — "tạo học sinh & thôi học".

**Status:** READY_FOR_DEV

**Acceptance (Capability & Regression Evals):**
- [ ] [Capability] Given biểu mẫu học sinh hợp lệ, When gửi tạo, Then hồ sơ lưu đủ họ tên, ngày sinh, giới tính, phụ huynh, địa chỉ, ngày nhập học, trạng thái.
  - Fails when: thiếu họ tên hoặc ngày sinh.
- [ ] [Capability] Given một học sinh, When thôi học, Then trạng thái đổi mà không xóa khỏi lịch sử.
  - Fails when: học sinh biến mất khỏi dữ liệu.
- [ ] [Capability] Given một học sinh có lớp, When xem chi tiết, Then hiển thị lớp hiện tại, bạn cùng lớp, giáo viên phụ trách.
  - Fails when: danh sách hiển thị sai (trống hợp lệ trước ticket 03/05).
- [ ] [Capability] Given danh sách học sinh, When lọc theo lớp/khối/trạng thái, Then kết quả khớp tiêu chí.
  - Fails when: kết quả lọc không khớp.
- [ ] [Regression] Given module Classes/Teachers, When chạy test Class/Teacher, Then vẫn green.
  - Fails when: ArchitectureTests/build báo lỗi.
