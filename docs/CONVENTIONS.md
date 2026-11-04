# CONVENTIONS

<!-- Nguồn: ADD v1.1.0 + 4-Round Tech Lead Interview 2026-11-04. Update khi reusable modules hoặc verification commands thay đổi. -->

## Stack & Runtime

- Project: `SmartKMS` — .NET 10 (C# 14), Blazor Interactive Server + MudBlazor 9.12.0, PostgreSQL 17+ / EF Core 10.
- Full stack: `docs/adr/0001-tech-stack-and-layering.md`. Nghiên cứu thư viện: `docs/tech/INDEX.md`.

## Cross-Cutting Contracts (AD-1..AD-4)

### AD-1 — API & Error Envelope (Result Pattern + RFC 9457)

- Mọi use case (Command/Query Handler) trả về `Result<T>` / `Result` (`src/SmartKMS.Application/Common/Models/Result.cs`). KHÔNG dùng exception cho lỗi nghiệp vụ thông thường.
- `Error(Code, Description, ErrorType)` với factories: `NotFound`, `Validation`, `Conflict`. `ErrorType`: `Failure | Validation | NotFound | Conflict | Unauthorized | Forbidden`.
- Web API ánh xạ `Error[]` → `ProblemDetails` theo **RFC 9457** (thay RFC 7807) qua middleware `UseStatusCodePages`/handler trong `SmartKMS.Web`; Blazor UI hiển thị lỗi qua `ISnackbar`.
- Envelope `{ data, error: { code, message, details }, meta }` cho các endpoint API công khai (đọc bởi `ApiClient`).

### AD-2 — Auth & RBAC (Cookie + JWT hybrid)

- **Blazor Server (admin):** ASP.NET Core Identity + cookie (`IdentityConstants.ApplicationScheme`), chống CSRF/antiforgery mặc định.
- **API endpoint (tablet/nhà bếp):** JWT Bearer (`AddBearerToken(IdentityConstants.BearerScheme)`).
- **RBAC:** Resource-Based Policy Authorization theo ADD — ví dụ: giáo viên chỉ sửa nhật ký lớp mình phụ trách. Roles: `Admin | Teacher | OfficeStaff | Parent`.
- Mật khẩu: PBKDF2-HMAC-SHA256 (mặc định Identity); custom `Argon2id` khi có yêu cầu — không bao giờ clear text.

### AD-3 — Validation (FluentValidation)

- Toàn bộ business rules trong `AbstractValidator<T>` (`SmartKMS.Application/Modules/<M>/Commands/…Validator.cs`), chạy qua `ValidationBehavior` trong pipeline MediatR (trước khi vào Handler).
- CẤM Data Annotations (`[Required]`, `[MaxLength]`) trên Domain Entity (ADD §5.3). DB config chỉ trong `IEntityTypeConfiguration<T>`.
- Validation lỗi → `Result<T>` failure với `Error.Validation(...)`, KHÔNG throw `ValidationException` khi TResponse là `Result`/`Result<T>`.

### AD-4 — Observability & Environment Config

- **Serilog** structured logging: console (development) + file/Seq (production), `Enrich.FromLogContext()`, TraceId correlation từ đầu request.
- `LoggingBehavior` (log request/response), `PerformanceBehavior` (cảnh báo khi handler > 500ms) — thứ tự pipeline: Logging → Validation → Performance → Handler.
- Cấu hình qua **typed options** (`IOptions<T>`) + `AddOptions<T>().Bind(...)`; env vars + user-secrets cho dev. KHÔNG đọc `Configuration["..."]` rải rác trong code.
- Chuỗi kết nối, JWT key: user-secrets / env — không commit.

## Naming Conventions (ADD §5.1)

| Đối tượng | Quy tắc | Ví dụ đúng | Cấm |
| :--- | :--- | :--- | :--- |
| Namespace / Class / Record | PascalCase | `SmartKMS.Application.Modules.Children` | `smartkms.application` |
| Interface | `I` + PascalCase | `IApplicationDbContext` | `ApplicationDbContextInterface` |
| Method | PascalCase + `Async` suffix nếu async | `GetChildrenAsync` | `getChildren` |
| Parameter | camelCase | `childId` | `ChildId` |
| Private field | `_` + camelCase | `_dbContext` | `m_dbContext` |
| Command/Query | Động từ + Danh từ + Command/Query | `RegisterChildCommand` | `ChildCreate` |
| DTO | Danh từ + `Dto` | `ChildSummaryDto` | `ChildData` |
| Razor component | PascalCase `.razor` | `PickupDialog.razor` | `pickup-dialog.razor` |

## C# Idioms (ADD §5.2)

- Nullable Reference Types bật toàn solution (`Directory.Build.props`); nullability warning = error.
- File-scoped namespaces, primary constructors, collection expressions `[...]`, switch expressions.
- Blazor components: cấm `.Result`/`.Wait()`; async `await` toàn bộ. `IAsyncDisposable` bắt buộc khi đăng ký SignalR/timer (ADD §5.4).

## PostgreSQL & EF Core (ADD §5.3)

- snake_case toàn bộ bảng/cột/index/khóa (`.UseSnakeCaseNamingConvention()`).
- Đặt tên: PK `pk_<table>`; FK `fk_<child>_<parent>_<col>`; index `idx_<table>_<cols>`; unique `uq_<table>_<cols>`.
- Rich domain model (ADD §3.3): hành vi qua phương thức entity, factory method tạo aggregate; ID dùng `Guid`.
- Specification pattern cho query phức tạp (ADD §4.3).

## Common Reusable Components

| Module | Path | Exports / Contract | When to Reuse |
| :--- | :--- | :--- | :--- |
| `PageHeader` | `src/SmartKMS.Web/Components/Common/PageHeader.razor` | `Title` (string), `Subtitle` (string?), `Actions` (RenderFragment?) | Header tiêu đề mọi page, có `data-testid="page-header"` |
| `ConfirmDialog` | `src/SmartKMS.Web/Components/Common/ConfirmDialog.razor` | `Title`, `ContentText`, `ConfirmText`; trả `DialogResult<bool>` qua `IDialogService` | Mọi thao tác xác nhận phá hủy/không hoàn tác được |
| `EmptyState` | `src/SmartKMS.Web/Components/Common/EmptyState.razor` | `Icon`, `Message`, `ActionContent` (RenderFragment?) | Danh sách rỗng / không có dữ liệu |
| `DataTable<TItem>` | `src/SmartKMS.Web/Components/Common/DataTable.razor` | Wrapper `MudDataGrid<TItem>`: `Items`, `Loading`, `Columns`, `ToolBar`; `NoRecordsContent` = EmptyState | Mọi màn hình bảng biểu (điểm danh, danh sách trẻ…) |
| MudBlazor primitives | package `MudBlazor` 9.12.0 | `MudButton`, `MudTextField`, `MudSelect`, `MudDialog`, `MudDataGrid`, `ISnackbar`, `MudChip`, `MudPaper`, `MudLayout` | Dùng trực tiếp — **cấm wrapper primitives** |
| `ErrorBoundary` | .NET built-in `<ErrorBoundary>` | `<ErrorBoundary><ChildContent>…</ChildContent></ErrorBoundary>` | Bọc vùng render dễ vỡ; không tự viết ErrorBoundary riêng |
| `KindergartenTheme` | `src/SmartKMS.Web/Theme/KindergartenTheme.cs` | `MudTheme` từ token GĐ1 (xem `docs/design-system/MASTER.md`) | Theme toàn app — sửa token ở đây + MASTER.md đồng thời |
| `Result<T>` / `Result` / `Error` / `PagedResult<T>` | `src/SmartKMS.Application/Common/Models/` | AD-1 contract (ADD §4.2) | Mọi return của Handler/DTO tầng Application |
| `IApplicationDbContext` | `src/SmartKMS.Application/Common/Interfaces/` | `DbSet<TEntity>`, `SaveChangesAsync` | Handler truy cập DB qua interface này, không qua DbContext cụ thể |
| `IDateTimeProvider` / `ICurrentUserService` | `src/SmartKMS.Application/Common/Interfaces/` | `UtcNow` / `UserId` | Tránh phụ thuộc `DateTime.UtcNow` trực tiếp (testable) |
| `ApiClient` | `src/SmartKMS.Infrastructure/Services/ApiClient.cs` | HttpClient wrapper: gắn `TraceId` header, decode envelope `{data, error, meta}` | Gọi API ngoài / endpoint nội bộ từ server |
| `DateTimeProvider` | `src/SmartKMS.Infrastructure/Services/DateTimeProvider.cs` | Implement `IDateTimeProvider` | Đăng ký trong `AddInfrastructure` |

## Verification Commands

- `build`: `dotnet build SmartKMS.sln`
- `test`: `dotnet test SmartKMS.sln`
- `format`: `dotnet format SmartKMS.sln --verify-no-changes`
- `e2e`: `cd e2e && npm install && npx playwright test` (app chạy trước: `dotnet run --project src/SmartKMS.Web`)

## Debt Ledger (Shortcuts)

<!-- Harvested by /retro from `// shortcut: <limit>, upgrade when <trigger>` annotations. -->

| Location | Current Limit | Upgrade Trigger |
| :--- | :--- | :--- |
| Fonts (Google Fonts CDN) | Nunito + Plus Jakarta Sans load từ CDN | Tự host woff2 trong `wwwroot/fonts` khi triển khai nội bộ offline |
| Redis/SignalR | Chưa bật ở Sprint 0 | Wave có tính năng realtime (bàn giao trẻ, dặn thuốc) |
| Migrations | Chưa có migration đầu tiên | Ngay wave đầu có entity thật (Children/Staff) |
