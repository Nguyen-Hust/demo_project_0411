# EF Core 10 + PostgreSQL — notes

## Package & versions (đã xác minh, pin)

| Package | Version | Ghi chú |
| :--- | :--- | :--- |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.3 | yêu cầu EF Core ≥ 10.0.4 |
| EFCore.NamingConventions | 10.0.1 | snake_case tự động |
| Microsoft.EntityFrameworkCore | 10.0.4 | bump bắt buộc (không phải 10.0.0) |
| Microsoft.Extensions.Logging.Abstractions | 10.0.4 | đồng bộ với EF 10.0.4 |

## Cấu hình Npgsql + snake_case

```csharp
services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention());
```

## Đặt tên (ADD §5.3)

- PK `pk_<table>`, FK `fk_<child>_<parent>_<col>`, index `idx_<table>_<cols>`, unique `uq_<table>_<cols>`.
- Config qua `IEntityTypeConfiguration<T>` — CẤM DataAnnotations trên entity.

## Integration test

Testcontainers PostgreSQL 17 thật (không InMemory) — chưa thiết lập ở Sprint 0, thêm ở wave đầu có persistence.
