# Ticket Review: mvp-core

- Feature: F-001 — MVP Quản lý Lớp học / Giáo viên / Học sinh + Dashboard
- Spec: `board/features/mvp-core/spec.md`
- Slicing: Option B (Balanced) — 6 vertical-slice tickets
- Reviewer: BA (orchestrator)
- Date: 2026-11-04
- Verdict: APPROVED

## Traceability (TKT-01, TKT-08)

| REQ | Ticket | Đạt |
| :--- | :--- | :--- |
| REQ-1..5 (Class) | 01 | ✓ |
| REQ-7, REQ-8, REQ-10, REQ-11 (Teacher CRUD) | 02 | ✓ |
| REQ-6, REQ-9 (phân công, 3 GV) | 03 | ✓ |
| REQ-12, REQ-15, REQ-16 (Child CRUD) | 04 | ✓ |
| REQ-13, REQ-14 (xếp/chuyển lớp) | 05 | ✓ |
| REQ-17 (Dashboard) | 06 | ✓ |

Mọi REQ đều được phủ bởi đúng một ticket; không REQ nào bị bỏ sót; không ticket nào vi phạm `<frozen-after-approval>`.

## Checklist

| Check | Kết quả | Ghi chú |
| :--- | :--- | :--- |
| TKT-01 (REQ coverage) | PASS | 17/17 REQ phủ |
| TKT-02 (Gherkin AC + Fails when) | PASS | Mọi AC dùng Given-When-Then + negative `Fails when` |
| TKT-03 (verify command độc lập <30s) | PASS | Mỗi ticket có `dotnet test --filter` + build |
| TKT-04 (tester kiểm độc lập qua UI) | PASS | Mỗi ticket có UI flow tương ứng |
| TKT-05 (Blocked-by không vòng) | PASS | 03→01,02; 05→01,04; 06→01,03 — DAG, không chu kỳ |
| TKT-06 (không ticket tài liệu/ADR tách biệt) | PASS | Không có ticket standalone doc/ADR |
| TKT-07 (test co-located) | PASS | Test nằm trong mỗi ticket (Micro-Step 1), không ticket "write test" riêng |
| TKT-08 (traceability) | PASS | Mỗi ticket ghi `Serves: REQ-xxx` |
| TKT-09 (không chủ quan/placeholder) | PASS | Không TODO/TBD/[NEEDS CLARIFICATION]/tính từ mơ hồ |

## Dependency graph (acyclic)

```
01 Class CRUD ──┬──> 03 Phân công GV ──> 06 Dashboard
02 Teacher CRUD ┘
01 Class CRUD ──┐
04 Child CRUD ──┴──> 05 Xếp/chuyển lớp
```

## Notes

- Ticket 02 và 04 không `Blocked by` do danh sách "lớp phụ trách" / "bạn cùng lớp" có thể hợp lệ là trống trước khi có ticket 03/05; điều này được ghi rõ trong AC của từng ticket.
- Ngưỡng "gần đầy" ≥28/30 (D-08) được chốt trong AC ticket 06.

## Verdict

**APPROVED** — 6 tickets đủ điều kiện kích hoạt sprint (không có blocker defect).
