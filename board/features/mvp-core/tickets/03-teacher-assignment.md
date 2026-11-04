# 03: Phân công giáo viên vào lớp (3 GV/lớp, vai trò chủ nhiệm/hỗ trợ)

**Serves:** REQ-6, REQ-9 (spec mvp-core) — thực thi D-02, D-05
- Estimate: 0 SP (DEV: 0 SP | QA: 0 SP)
- Feature ID: F-001
- Sprint: BACKLOG
- Sprint Target: DONE
- Dev Assignee: @unassigned
- QA Assignee: @unassigned
- Estimate (optional): 8 SP (DEV: 5 SP | QA: 3 SP)

**What to build:** Nghiệp vụ phân công giáo viên vào lớp với vai trò Homeroom/Support, thực thi bất biến: mỗi lớp tối đa 3 giáo viên, đúng 1 chủ nhiệm, 1 giáo viên chủ nhiệm tối đa 1 lớp; cảnh báo thiếu giáo viên.

**Blocked by:** 01, 02 (cần Class và Teacher tồn tại).

**Interfaces:**
- Consumes: `Class` (ticket 01), `Teacher` (ticket 02); `Result<T>`/`Error`; `IApplicationDbContext`.
- Produces: entity `ClassAssignment` + `AssignTeacherCommand`, `RemoveTeacherAssignmentCommand`; bất biến số lượng/vai trò nằm trong aggregate `Class`.

**Out of scope:** xếp học sinh (ticket 05). Regression boundary: Class CRUD và Teacher CRUD không đổi quy tắc đã có.

**Plan & Verification:**
- Seam & Failing Test: `dotnet test tests/SmartKMS.Application.UnitTests --filter "FullyQualifiedName~AssignTeacher"` (RED).
- Review Focus Pinned: lớp đã có chủ nhiệm nhưng gán thêm chủ nhiệm -> chặn; một GV chủ nhiệm 2 lớp -> chặn.
- Micro-Step 1: test fail AssignTeacher (gán happy path 3 GV) -> pass.
- Micro-Step 2: edge (gán GV thứ 4, gán chủ nhiệm thứ 2, chủ nhiệm 2 lớp) -> pass.
- Micro-Step 3: dọn dẹp, diff sạch.
- Verify Command: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~AssignTeacher" && dotnet build SmartKMS.sln`

**Quality Gates:**
- Commands: build; Application.UnitTests `--filter "FullyQualifiedName~AssignTeacher"`; ArchitectureTests; format.
- Evidence: `board/features/mvp-core/verification.md` — hàng phân công giáo viên.
- UI flows: `e2e/mvp-core.spec.ts` — "phân công & chặn GV thứ 4/chủ nhiệm trùng".

**Status:** BACKLOG

**Acceptance (Capability & Regression Evals):**
- [ ] [Capability] Given lớp còn chỗ và GV chưa chủ nhiệm lớp khác, When gán giáo viên với vai trò Homeroom/Support, Then phân công thành công và thấy trong danh sách lớp.
  - Fails when: phân công thất bại dù thỏa điều kiện.
- [ ] [Capability / Review Focus] Given lớp đã đủ 3 giáo viên, When gán thêm giáo viên thứ 4, Then bị chặn bằng `Error.Validation`.
  - Fails when: cho phép 4 giáo viên trong một lớp.
- [ ] [Capability / Review Focus] Given lớp đã có chủ nhiệm, When gán thêm chủ nhiệm, Then bị chặn bằng `Error.Validation`.
  - Fails when: lớp có 2 chủ nhiệm.
- [ ] [Capability / Review Focus] Given một giáo viên đang chủ nhiệm lớp A, When phân công chủ nhiệm lớp B, Then bị chặn bằng `Error.Validation`.
  - Fails when: một GV chủ nhiệm 2 lớp.
- [ ] [Capability] Given lớp có 1–2 giáo viên, When xem trạng thái, Then cảnh báo "thiếu giáo viên".
  - Fails when: không phát sinh cảnh báo cho lớp dưới 3 GV.
- [ ] [Regression] Given phân công hợp lệ, When chạy lại test Class/Teacher, Then vẫn green.
  - Fails when: ArchitectureTests/buôn báo lỗi.
