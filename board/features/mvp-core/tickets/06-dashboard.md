# 06: Dashboard tổng quan & cảnh báo nghiệp vụ

**Serves:** REQ-17 (spec mvp-core) — thực thi D-02, D-08
- Feature ID: F-001
- Sprint: BACKLOG
- Sprint Target: DONE
- Dev Assignee: @unassigned
- QA Assignee: @unassigned
- Estimate (optional): 4 SP (DEV: 2 SP | QA: 2 SP)

**What to build:** Màn hình tổng quan hiển thị tổng số lớp/giáo viên/học sinh, sĩ số theo từng khối, và danh sách cảnh báo (lớp thiếu giáo viên, lớp gần đầy 28–29/30, lớp đã đầy 30/30).

**Blocked by:** 01, 03 (cần dữ liệu lớp + phân công để có cảnh báo thiếu GV).

**Interfaces:**
- Consumes: `Class`, `Teacher`, `Child`, `ClassAssignment`, `ChildEnrollment`; `Result<T>`/`Error`; `IApplicationDbContext`; `PageHeader`, MudBlazor primitives, `KindergartenTheme`.
- Produces: `DashboardQuery` (read model tổng hợp).

**Out of scope:** báo cáo nâng cao, biểu đồ chuyên cần/chuyên thu (GĐ3/4). Regression boundary: không đổi logic module khác.

**Plan & Verification:**
- Seam & Failing Test: `dotnet test tests/SmartKMS.Application.UnitTests --filter "FullyQualifiedName~Dashboard"` (RED).
- Review Focus Pinned: lớp ≥28/30 phải xuất hiện trong cảnh báo tương ứng.
- Micro-Step 1: test fail Dashboard (số liệu tổng) -> pass.
- Micro-Step 2: edge (ngưỡng 28 gần đầy, 30 đã đầy, thiếu GV) -> pass.
- Micro-Step 3: dọn dẹp, diff sạch.
- Verify Command: `dotnet test tests/SmartKMS.Application.UnitTests/SmartKMS.Application.UnitTests.csproj --filter "FullyQualifiedName~Dashboard" && dotnet build SmartKMS.sln`

**Quality Gates:**
- Commands: build; Application.UnitTests `--filter "FullyQualifiedName~Dashboard"`; ArchitectureTests; format.
- Evidence: `board/features/mvp-core/verification.md` — hàng dashboard.
- UI flows: `e2e/mvp-core.spec.ts` — "xem dashboard tổng quan & cảnh báo".

**Status:** BACKLOG

**Acceptance (Capability & Regression Evals):**
- [ ] [Capability] Given dữ liệu trường đã có, When mở dashboard, Then hiển thị tổng số lớp, giáo viên, học sinh đúng và sĩ số theo từng khối.
  - Fails when: số liệu thống kê sai lệch.
- [ ] [Capability / Review Focus] Given lớp đạt 28–29/30, When xem cảnh báo, Then xuất hiện "gần đầy".
  - Fails when: lớp ≥28 không xuất hiện cảnh báo gần đầy tương ứng.
- [ ] [Capability / Review Focus] Given lớp đủ 30/30, When xem cảnh báo, Then xuất hiện "đã đầy".
  - Fails when: lớp 30/30 không xuất hiện cảnh báo đã đầy.
- [ ] [Capability] Given lớp có 1–2 giáo viên, When xem cảnh báo, Then xuất hiện "thiếu giáo viên".
  - Fails when: không phát sinh cảnh báo thiếu giáo viên.
- [ ] [Regression] Given module Classes/Teachers, When chạy test, Then vẫn green.
  - Fails when: ArchitectureTests/build báo lỗi.
