# Suggested Tasks — mvp-core (Anti-Preemption log)

Out-of-scope issues discovered during Ticket 01, deferred deliberately. Each is
a candidate for a separate slice; none blocks Ticket 01 happy path.

| # | Issue | Origin | Suggested fix |
| :-- | :-- | :-- | :-- |
| S-01 | `src/SmartKMS.Web/Components/_Imports.razor:8` warning CS0105 — trùng `@using Microsoft.AspNetCore.Components.Web` | Pre-existing (baseline build) | Gộp/gỡ using trùng; 1 dòng, không đụng logic |
| S-02 | `DataTable<TItem>` wrapper (Common/DataTable.razor) không truyền generic context cho cột typed → `PropertyColumn`/`TemplateColumn` không infer `T`. Ticket 01 dùng `MudDataGrid` trực tiếp để tránh bug | Discovered during Ticket 01 UI | Type `Columns` param là `RenderFragment<MudDataGrid<TItem>>` + fix `@context` clash; rồi cấm dùng wrapper cho grid typed |
| S-03 | Migration đầu `InitialCreate` gộp cả bảng Identity + classes (đúng debt ledger "migration đầu ở wave entity đầu tiên") | Ticket 01 | Không cần tách; ghi nhận khi wave Identity riêng |
| S-04 | `StudentCount`/detail lists hard-code 0 (chờ ticket 05 enrollment, ticket 03 assignment) | Ticket 01 | Ticket 05 mở rộng `GetClassDetail`/`ListClasses` query đếm thật |
| S-05 | Testcontainers cho integration test PostgreSQL thật (thay InMemory) đúng chuẩn ADR "không InMemory cho DB test thật" | Ticket 01 handler tests dùng InMemory | Tách slice: chuyển handler tests sang Testcontainers Postgres 17 |
