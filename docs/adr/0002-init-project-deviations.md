# Sprint 0 — Init-Project Deviations

Ghi nhận các lệch so với 4-Round Tech Lead Interview & Sprint 0 Foundation Builder, chấp nhận bởi người dùng 2026-11-04.

## 1. Oracle `map-codebase --bootstrap` không đạt exit 0

- Lệnh `node %USERPROFILE%/.config/ai-studio/scripts/map-codebase.mjs --root . --bootstrap` không thể exit 0.
- **Nguyên nhân:** script nguồn `map-codebase.mjs` (và toàn bộ `C:\Users\datnt3\.config\ai-studio\scripts\*.mjs`) đã bị xóa khỏi đĩa giữa session — thay đổi môi trường ngoài tầm kiểm soát của session.
- **Kết quả thay thế:** bootstrap đã chạy thành công ở lần đầu (call trước khi xóa) tạo đủ `.ai-studio/memory/**`, `docs/CONVENTIONS.md`, `docs/agents/codebase/**`, `GLOSSARY.md`, `.workspace/templates/**`, `.git/hooks/pre-commit`.

## 2. Context7 MCP không khả dụng

- Tool `context7` không có trong bộ tool của session (chỉ có `ai-mcp_kb-query`, `config-manage`, ...).
- **Thay thế:** version của mọi package được xác minh qua `dotnet package search` + `dotnet build` trên máy thật, ghi chú API/breaking changes vào `docs/tech/*.md`.

## 3. Path convention `src/components/ui/**` + `src/shared/**`

- Convention này thuộc template **React/GĐ1** (Vite + shadcn). Stack đã chốt là **Blazor/MudBlazor** (.NET clean architecture 4 project).
- **Layout thực tế (.NET chuẩn):** shared UI = `src/SmartKMS.Web/Components/Common`, shared utilities = `src/SmartKMS.Application/Common` (Result/Error/PagedResult/interfaces/behaviors). Không áp dụng `src/components/ui` / `src/shared` cho .NET.
- Không tạo thư mục phụ trái chuẩn (hack convention) theo quyết định người dùng.

## Kết quả thực tế (đã verify)

- `dotnet build SmartKMS.sln` → 0 warning / 0 error.
- 3 test suite → 10/10 pass (2 Domain + 5 Application + 3 Architecture).
- Commit `cd4ba7e` — 91 files, 2377 insertions, pre-commit hook pass.
