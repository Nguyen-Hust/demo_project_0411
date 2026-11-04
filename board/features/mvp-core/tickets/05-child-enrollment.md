# 05: Xếp lớp & chuyển lớp học sinh (sĩ số 30, cảnh báo độ tuổi, lịch sử)

**Serves:** REQ-13, REQ-14 (spec mvp-core) — thực thi D-02 sĩ số, D-09 độ tuổi, D-06 chuyển lớp
- Feature ID: F-001
- Sprint: BACKLOG
- Sprint Target: DONE
- Dev Assignee: @unassigned
- QA Assignee: @unassigned
- Estimate (optional): 8 SP (DEV: 5 SP | QA: 3 SP)

**What to build:** Nghiệp vụ xếp học sinh vào lớp (chặn khi lớp đủ 30 bằng `Error.Conflict`, cảnh báo không chặn khi lệch độ tuổi khối) và chuyển lớp giữa năm (có lịch sử lớp đã học, chặn khi lớp đích đủ 30).

**Blocked by:** 01, 04 (cần Class và Child).

**Interfaces:**
- Consumes: `Class` (ticket 01), `Child` (ticket 04); `Result<T>`/`Error`; `IApplicationDbContext`.
- Produces: entity `ChildEnrollment` + `EnrollChildCommand`, `TransferChildCommand`; bất biến sĩ số nằm trong aggregate `Class`.

**Out of scope:** lên khối cuối năm & quản lý năm học (GĐ4). Regression boundary: Class/Child CRUD không đổi.

**Plan & Verification:**
- Seam & Failing Test: `dotnet test tests/SmartKMS.Application.UnitTests --filter "FullyQualifiedName~EnrollChild"` (RED).
- Review Focus Pinned: lớp đủ 30 vẫn xếp -> chặn Conflict; xếp lệch độ tuổi -> cảnh báo nhưng thành công; chuyển vào lớp đầy -> chặn.
- Micro-Step 1: test fail EnrollChild (hợp lệ) -> pass.
- Micro-Step 2: edge (đủ 30, lệch tuổi, chuyển vào lớp đầy) -> pass.
- Micro-Step 3: dọn dẹp, diff sạch.
- Verify Command: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~EnrollChild\|TransferChild" && dotnet build SmartKMS.sln`

**Quality Gates:**
- Commands: build; Application.UnitTests `--filter "FullyQualifiedName~EnrollChild\|TransferChild"`; ArchitectureTests; format.
- Evidence: `board/features/mvp-core/verification.md` — hàng xếp lớp/chuyển lớp.
- UI flows: `e2e/mvp-core.spec.ts` — "xếp lớp & chặn lớp đầy & chuyển lớp có lịch sử".

**Status:** BACKLOG

**Acceptance (Capability & Regression Evals):**
- [ ] [Capability] Given lớp còn chỗ (<30), When xếp học sinh vào lớp, Then thành công và trẻ hiển thị trong lớp.
  - Fails when: xếp thất bại dù còn chỗ.
- [ ] [Capability / Review Focus] Given lớp đã đủ 30, When xếp thêm, Then bị chặn bằng `Error.Conflict`.
  - Fails when: xếp vào lớp đầy vẫn thành công.
- [ ] [Capability / Review Focus] Given trẻ không khớp độ tuổi khối, When xếp vào lớp, Then cảnh báo nhưng vẫn thành công.
  - Fails when: xếp lệch tuổi bị chặn cứng (trái D-09).
- [ ] [Capability] Given học sinh ở lớp A, When chuyển sang lớp B còn chỗ, Then chuyển thành công và lưu lịch sử lớp đã học.
  - Fails when: lịch sử lớp đã học bị mất.
- [ ] [Capability / Review Focus] Given học sinh chuyển vào lớp B đã đủ 30, Then bị chặn bằng `Error.Conflict`.
  - Fails when: chuyển vào lớp đầy vẫn thành công.
- [ ] [Regression] Given Class/Child đã có, When chạy test Class/Child, Then vẫn green.
  - Fails when: ArchitectureTests/build báo lỗi.
