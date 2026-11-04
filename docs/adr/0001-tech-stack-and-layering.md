# ADR 0001 — Tech Stack & DDD Layering Topology

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Tech Lead (4-Round Architectural Interview, `/init-project`)
- **Sources:** `ADD_Technical_Architecture_Standards v1.1.0` (binding), Figma template `Quản lý trường mầm non GĐ1` (design reference only)

## Context

Team đang dựng hệ thống quản lý trường mầm non ("SmartKMS"). ADD chốt .NET 10 + Blazor Interactive Server + MudBlazor v9+; template mã nguồn mở là bản export từ Figma dùng React/shadcn. Hai hướng xung đột trực tiếp.

**Quyết định:** ADD là chuẩn kiến trúc ràng buộc. Template chỉ dùng làm **tham chiếu thiết kế** (color tokens, typography, layout patterns, domain screens) — không phải runtime code. UI sẽ được dựng lại bằng MudBlazor theo đúng token trích xuất từ template.

## Decision

### 1. Stack (phiên bản đã pin & xác minh trên nuget.org ngày 2026-11-04)

| Lớp | Công nghệ | Phiên bản | Ghi chú |
| :--- | :--- | :--- | :--- |
| Runtime & SDK | .NET 10 LTS (C# 14) | SDK 10.0.400 | LTS đến 11/2028; Dynamic PGO mặc định |
| UI | Blazor Web App — Interactive Server | net10.0 | Chuyển Auto/WASM cho cổng phụ huynh khi cần |
| UI Kit | MudBlazor | 9.12.0 | V9+ theo ADD; primitives dùng trực tiếp |
| DB | PostgreSQL 17+ (sẵn sàng PG18) | — | pg_trgm + unaccent, tsvector, JSONB |
| ORM | EF Core 10 + Npgsql | Npgsql.EntityFrameworkCore.PostgreSQL 10.0.3 | + EFCore.NamingConventions 10.0.1 (snake_case) |
| CQRS | MediatR (pin MIT) | 12.4.1 | Bản MIT cuối; KHÔNG dùng v13+ (license thương mại) |
| Validation | FluentValidation | 12.2.0 | Business rules tách khỏi DTO |
| Mapping | Riok.Mapperly | 4.3.1 | Compile-time source generator |
| Observability | Serilog.AspNetCore | 10.0.0 | Structured + TraceId correlation (AD-4) |
| Cache / Realtime | Redis 7.2+ / Valkey 8+; SignalR | — | Sprint 0 chưa bật; là công việc wave sau |
| Tests | xUnit + NetArchTest.Rules | 2.9.3 / 1.3.2 | + Testcontainers PostgreSQL cho integration |
| E2E | Playwright | npm `@playwright/test` | Chạy qua HTTP, độc lập stack FE |

### 2. Layering Topology (monorepo, một solution)

```
SmartKMS.sln
├── src/
│   ├── SmartKMS.Domain/          # KHÔNG tham chiếu project nào khác, KHÔNG package ngoài
│   │   ├── Common/               # BaseEntity, IAggregateRoot, IDomainEvent, ValueObject
│   │   ├── Enums/
│   │   ├── Exceptions/           # DomainException
│   │   └── Modules/              # Children, Staff, Academics, Attendance, Nutrition
│   ├── SmartKMS.Application/     # → Domain
│   │   ├── Common/Behaviors/     # Validation, Logging, PerformanceBehavior
│   │   ├── Common/Interfaces/    # IApplicationDbContext, ICurrentUserService, IDateTimeProvider
│   │   ├── Common/Models/        # Result<T>, Result, Error, PagedResult<T>
│   │   └── Modules/<M>/Commands|Queries|Dtos
│   ├── SmartKMS.Infrastructure/  # → Application + Domain
│   │   ├── Persistence/          # ApplicationDbContext, Configurations/, Migrations/
│   │   ├── Identity/             # Identity + JWT (AD-2)
│   │   └── Services/             # DateTimeProvider, ApiClient
│   └── SmartKMS.Web/             # → Application + Infrastructure (Composition Root)
│       ├── Components/           # Common/ (PageHeader, ConfirmDialog, EmptyState, DataTable), Business/
│       ├── Layout/               # MainLayout, NavMenu
│       ├── Pages/
│       └── Theme/                # KindergartenTheme.cs (token GĐ1)
└── tests/
    ├── SmartKMS.Domain.UnitTests/
    ├── SmartKMS.Application.UnitTests/
    └── SmartKMS.ArchitectureTests/   # NetArchTest.Rules — chặn CI khi vi phạm dependency
```

### 3. Import-boundary rules (enforced by `SmartKMS.ArchitectureTests`)

| Project | Được tham chiếu |
| :--- | :--- |
| Domain | ∅ (chỉ BCL) |
| Application | Domain |
| Infrastructure | Application, Domain |
| Web | Application, Infrastructure |
| ArchitectureTests | Domain, Application, Infrastructure, Web |

Quy tắc tuyệt đối theo ADD §3.1: **Domain là trung tâm**, không phụ thuộc EF Core/Web/UI. Vi phạm → CI chặn PR ngay.

### 4. Template GĐ1 — phạm vi sử dụng

- **Dùng:** color tokens (`#f97316`, `#fdf9f5`, `#fef3e8`, `#fde68a`, `#f5ede0`, `#ef4444`, border nâu ấm, radius 14px), typography (Nunito heading / Plus Jakarta Sans body), màn hình tham chiếu cho Children/Attendance/Nutrition.
- **Không dùng:** toàn bộ React/shadcn code — không vào repo.

## Consequences

- **Đánh đổi:** mất khả năng tái sử dụng trực tiếp code UI GĐ1 (React) — bù lại bằng token trích xuất chính xác, tốc độ dựng MudBlazor tăng đáng kể.
- Pin MediatR 12.4.1 (MIT) tránh rủi ro license v13+; nếu cần source-generator chuyển sang `Mediator` (martinothamar) — xem `docs/tech/mediatr-12-cqrs.md`.
- PostgreSQL-first: mọi tính năng DB phải dùng đặc tính PG (không InMemory cho integration test — Testcontainers bắt buộc).
