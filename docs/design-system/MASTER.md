# Design System — Kindergarten (GĐ1)

Nguồn token: template Figma `Quản lý trường mầm non GĐ1`. Áp dụng vào MudBlazor qua `src/SmartKMS.Web/Theme/KindergartenTheme.cs` + `wwwroot/app.css`.

> **Quy tắc đồng bộ:** sửa token ở BẤT KỲ đâu (theme C# / app.css / file này / `.workspace/DESIGN-PREVIEW.html`) phải cập nhật đồng thời 4 nơi.

## Color Tokens (Light)

| Token | Giá trị | Vai trò |
| :--- | :--- | :--- |
| `--primary` / `Primary` | `#f97316` | Hành động chính, brand (cam ấm) |
| `--secondary` / `Secondary` | `#fef3e8` | Bề mặt phụ, nền nút outline |
| `--tertiary` / `Tertiary` | `#fde68a` | Accent vàng (điểm nhấn nhẹ) |
| `--background` / `Background` | `#fdf9f5` | Nền app (kem ấm) |
| `--surface` / `Surface` | `#ffffff` | Thẻ, paper, drawer |
| `--text` / `TextPrimary` | `#231c0d` | Văn bản chính (nâu đen) |
| `--text-muted` / `TextSecondary` | `#8a7055` | Văn bản phụ (nâu nhạt) |
| `--border` / `LinesDefault` | `rgba(140, 100, 40, 0.12)` | Viền, divider |
| `--danger` / `Error` | `#ef4444` | Lỗi / destructive |
| ok / warn / info | `#4ade80` / `#fbbf24` / `#60a5fa` | Trạng thái |

## Status Palette

| Trạng thái | Màu | Dùng cho |
| :--- | :--- | :--- |
| Success | `#4ade80` | Hoàn tất, đã chốt suất ăn |
| Warning | `#fbbf24` | Cần chú ý, thiếu thông tin |
| Danger | `#ef4444` | Lỗi, chưa bàn giao, quá hạn |
| Info | `#60a5fa` | Thông tin |

## Typography

| Vai trò | Font | Weight | Line-height | Ghi chú |
| :--- | :--- | :--- | :--- | :--- |
| Body / mặc định | Plus Jakarta Sans | 400 | ≥ 1.45 | Có sẵn `system-ui` fallback |
| Heading H1–H4 | Nunito | 500–700 | 1.5 | Diacritics tiếng Việt an toàn |
| Số liệu / metric | Plus Jakarta Sans | 600 | 1.5 | dùng `tabular-nums` cho số thẳng hàng |

- Base font-size `15px`.
- `line-height >= 1.45` toàn bộ (ADD không khống chế, đây là chuẩn AI Studio cho Việt ngữ — tránh dấu bị cắt).
- Fonts load từ Google Fonts CDN ở `App.razor` (Debt Ledger: tự host khi offline).

## Spacing & Radius

- Border radius mặc định `14px` (`LayoutProperties.DefaultBorderRadius`).
- Spacing 4px grid của MudBlazor (MudContainer, MudGrid, `pa-*`/`mt-*`).

## Component Gallery (Sprint 0)

| Component | Path | Ghi chú |
| :--- | :--- | :--- |
| PageHeader | `Components/Common/PageHeader.razor` | Title + Subtitle + Actions |
| ConfirmDialog | `Components/Common/ConfirmDialog.razor` | qua `IDialogService` |
| EmptyState | `Components/Common/EmptyState.razor` | Icon + Message + Action |
| DataTable<T> | `Components/Common/DataTable.razor` | wrapper MudDataGrid |
| Primitives | package MudBlazor | dùng trực tiếp, cấm wrapper |

Live preview: `.workspace/DESIGN-PREVIEW.html`.
