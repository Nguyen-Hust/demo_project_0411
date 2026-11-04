# MediatR 12.4.1 — CQRS notes

## Pin license

MediatR **12.4.1** là bản MIT cuối; từ v13+ (MediatR.io) dùng license thương mại — CẤM nâng lên v13+ trong SmartKMS.

## Package gộp DI

MediatR 12 đã gộp DI vào package core — **KHÔNG** có `MediatR.Extensions.Microsoft.DependencyInjection` bản 12.4.1 (nuget chỉ có đến 11.1.0). Đăng ký trực tiếp:

```csharp
using MediatR; // chứa AddMediatR extension
services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
```

## Pipeline Behaviors

```csharp
public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse> where TRequest : notnull where TResponse : class
{ /* ... */ }

// Thứ tự đăng ký = thứ tự thực thi
services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
services.AddTransient(typeof(IPipelineBehavior<,>), typeof(PerformanceBehavior<,>));
```

## Gotcha registration (G-architecture-001)

Đăng ký handler/behavior phải là **Scoped** khi inject scoped `DbContext`. MediatR 12 `AddMediatR` mặc định handler là Transient nhưng hãy xác minh lifetime khi có DbContext trong handler — một Singleton/Scoped sai lifetime giữ DbContext sẽ lỗi ở runtime. (Rule `[G-architecture-001]` global.)

## Fallback source-generator

Nếu cần tránh reflection hoàn toàn (Native AOT), dùng `Mediator` (martinothamar) — MIT source-gen. Không ưu tiên ở Sprint 0; giữ MediatR 12.4.1.
