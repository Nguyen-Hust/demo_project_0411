# Tech Stack Research Index

Tổng hợp phiên bản & ghi chú API cho toàn bộ stack. Phiên bản đã **xác minh trên nuget.org ngày 2026-11-04** (Nguồn: `dotnet package search`, `dotnet build`/`dotnet test` trên máy thật).

<!-- Research note: Context7 MCP không có trong bộ tool của session này; thay bằng truy vấn nuget.org qua `dotnet package search` + đọc XML doc của package đã restore. -->

| Package | Version (pin) | Trang |
| :--- | :--- | :--- |
| MudBlazor | 9.12.0 | `docs/tech/mudblazor-9.md` |
| MediatR | 12.4.1 (MIT cuối) | `docs/tech/mediatr-12-cqrs.md` |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.3 | `docs/tech/efcore10-postgresql.md` |
| EFCore.NamingConventions | 10.0.1 | (trong efcore10) |
| FluentValidation | 12.2.0 | `docs/tech/fluentvalidation-12.md` |
| Riok.Mapperly | 4.3.1 | `docs/tech/mapperly-4.md` |
| Serilog.AspNetCore | 10.0.0 | `docs/tech/serilog-aspnetcore.md` |
| NetArchTest.Rules | 1.3.2 | (trong testing) |
| xUnit | 2.9.3 | (trong testing) |
| MudBlazor primitives | 9.12.0 | `docs/tech/mudblazor-9.md` |

## Framework-grade gotchas (đã đụng khi build thật)

1. **MediatR 12 gộp DI vào core** — KHÔNG có package `MediatR.Extensions.Microsoft.DependencyInjection` bản 12.4.1 (chỉ đến 11.1.0). Dùng `services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(...))` từ `MediatR` trực tiếp. Ghi lại ở `docs/tech/mediatr-12-cqrs.md`.
2. **Npgsql 10.0.3 yêu cầu EF Core ≥ 10.0.4** — không phải 10.0.0; bump `Microsoft.EntityFrameworkCore` và `Microsoft.Extensions.Logging.Abstractions` lên 10.0.4.
3. **MudBlazor v9 đổi API** (so với template v8 trong ADD):
   - `AddMudServices()` nằm ở namespace `MudBlazor.Services` (không phải `MudBlazor`).
   - `Color.TextSecondary` bị xoá → dùng `Color.Default`.
   - `MudDrawer.Variant` nhận `DrawerVariant` enum (Persistent/Temporary/Responsive/Mini), không còn `Variant.Responsive`.
   - `Typography.*` (`H1Typography`…) có `FontWeight`/`LineHeight` kiểu **string** ("700"/"1.5"), `FontFamily` là `string[]`.
4. **NetArchTest.Rules 1.3.2**: không có `GetOffendingTypes()`; dùng `TestResult.FailingTypeNames` (trả `null` khi pass — phải null-guard trước `string.Join`).
5. **.NET 10 SDK** tạo `.slnx` mặc định; cần `dotnet new sln --format sln` để được `.sln` cổ điển khớp tooling/docs.

## Verification commands (đã chạy xanh)

```bash
dotnet build SmartKMS.sln                                    # 0 warning 0 error
dotnet test <proj>.csproj --filter "FullyQualifiedName~X"    # 10 tests pass
```
