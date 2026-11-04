# Project State

## Overview
- **Project**: `SmartKMS` — Hệ thống quản lý trường mầm non (repo `demo_project_0411`)
- **Runtime & Languages**: .NET 10 LTS (C# 14), Blazor Interactive Server, MudBlazor 9.12.0
- **Database**: PostgreSQL 17+ / EF Core 10 (Npgsql 10.0.3, snake_case)
- **Monorepo**: yes — `SmartKMS.sln` (src/ + tests/)
- **Sprint 0 hoàn tất**: 2026-11-04 (4-Round Tech Lead Interview, architecture locked)

## Architectural Decisions
- `docs/adr/0001-tech-stack-and-layering.md` — Clean Architecture + DDD + CQRS; template GĐ1 (React/shadcn) chỉ là tham chiếu thiết kế, không vào repo.
- **AD-1**: Result Pattern + RFC 9457 ProblemDetails; **AD-2**: Identity cookie (Blazor) + JWT bearer (API), resource-based policies; **AD-3**: FluentValidation qua pipeline behavior, cấm DataAnnotations trên entity; **AD-4**: Serilog structured + TraceId, PerformanceBehavior >500ms.
- **MediatR pin 12.4.1** (MIT cuối) — cấm v13+ (license thương mại). Fallback source-gen: `Mediator` (martinothamar).
- Design tokens khóa từ template GĐ1: primary `#f97316`, bg `#fdf9f5`, radius 14px, Nunito/Plus Jakarta Sans — `docs/design-system/MASTER.md` + `.workspace/DESIGN-PREVIEW.html`.

## Active Tech Debt & Shortcuts
- Fonts đang load từ Google Fonts CDN — tự host khi triển khai offline (Debt Ledger trong `docs/CONVENTIONS.md`).
- Redis/SignalR chưa bật ở Sprint 0 — bật ở wave realtime đầu tiên.
