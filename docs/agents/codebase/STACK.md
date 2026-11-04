# Stack

- **Project**: `SmartKMS` (quản lý trường mầm non)
- **Runtime & Languages**: .NET 10 LTS (C# 14) — SDK 10.0.400
- **Frontend**: Blazor Web App (Interactive Server) + MudBlazor 9.12.0
- **Database**: PostgreSQL 17+ via EF Core 10 (Npgsql 10.0.3 + EFCore.NamingConventions 10.0.1, snake_case)
- **CQRS**: MediatR 12.4.1 (pin MIT; cấm v13+)
- **Validation**: FluentValidation 12.2.0 · **Mapping**: Riok.Mapperly 4.3.1 (compile-time)
- **Observability**: Serilog.AspNetCore 10.0.0 (structured + TraceId)
- **Tests**: xUnit 2.9.3, NetArchTest.Rules 1.3.2, Testcontainers PostgreSQL (integration), Playwright (e2e)
- **Monorepo**: yes — một `SmartKMS.sln` (src/ + tests/)
- **Nguồn quyết định**: `docs/adr/0001-tech-stack-and-layering.md` (từ ADD v1.1.0); template GĐ1 (React/shadcn) chỉ là tham chiếu thiết kế.
