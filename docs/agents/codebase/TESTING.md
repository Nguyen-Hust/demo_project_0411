# Testing & Verification

## Verification commands

```bash
dotnet build SmartKMS.sln                 # build toàn solution
dotnet test SmartKMS.sln                  # Unit + Architecture tests
dotnet format SmartKMS.sln --verify-no-changes   # CI style gate
dotnet run --project src/SmartKMS.Web     # dev server → http://localhost:5160
cd e2e && npm install && npx playwright test   # e2e (Playwright, sau khi app chạy)
```

## Test pyramid (ADD §6)

1. **Architecture tests** — `tests/SmartKMS.ArchitectureTests/` (NetArchTest.Rules 1.3.2): Domain không phụ thuộc project khác; hướng tham chiếu đúng theo ADR 0001.
2. **Unit tests** — xUnit 2.9.3: `tests/SmartKMS.Domain.UnitTests/`, `tests/SmartKMS.Application.UnitTests/`.
3. **Integration tests** — Testcontainers PostgreSQL 17 thật (cấm InMemory DB), thêm ở wave đầu tiên có persistence.
4. **E2E** — `e2e/seed.spec.ts` (Playwright, chromium; smoke test cho Blazor Server). Test Studio native seed: `docs/intel/_tests/suite.json`.

## Quality gates

- Baseline gates (`build, type, lint, test, security, diff`) áp dụng mặc định; overrides riêng trong `docs/quality-gates.md`.
- CI: `dotnet format --verify-no-changes` + `dotnet test` 100% PASS; SonarQube coverage ≥ 80% cho Domain & Application (ADD §7).
