# Serilog.AspNetCore 10 — notes

- Version pin: **10.0.0**.
- Cấu hình theo AD-4: structured logging + TraceId correlation, `PerformanceBehavior` cảnh báo >500ms.

```csharp
builder.Host.UseSerilog((context, services, cfg) => cfg
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext()
    .WriteTo.Console());

app.UseSerilogRequestLogging();
```

- `appsettings.json` → `Serilog:MinimumLevel` (ghi đè `Microsoft.AspNetCore` thành Warning).
- Dev: console; Prod: thêm file/Seq sink (chưa cấu hình ở Sprint 0).
- `ApiClient` gắn `TraceId` header (`Activity.Current?.Id`) vào mọi outbound request.
