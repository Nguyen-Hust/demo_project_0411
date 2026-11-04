# MudBlazor v9 — API notes (đã xác minh với 9.12.0)

## Cấu hình

```csharp
// Program.cs
using MudBlazor.Services; // AddMudServices nằm ở namespace này, KHÔNG phải MudBlazor
builder.Services.AddMudServices();
```

Razor components (`_Imports.razor`):
```razor
@using MudBlazor
@using Microsoft.AspNetCore.Components.Web
@using static Microsoft.AspNetCore.Components.Web.RenderMode  // để dùng @rendermode="@InteractiveServer"
```

## Breaking changes so với MudBlazor v8 (template ADD)

| Vấn đề | v8 (ADD) | v9 (thực tế) |
| :--- | :--- | :--- |
| Color phụ văn bản | `Color.TextSecondary` | **XOÁ** → `Color.Default` |
| Drawer variant | `Variant.Responsive` | `DrawerVariant.Responsive` (enum: Persistent/Temporary/Responsive/Mini) |
| Typography weight/height | `int` / `double` | **string** (`"700"`, `"1.5"`); `FontFamily` là `string[]` |
| Đăng ký services | `AddMudServices()` auto | namespace `MudBlazor.Services` |

## Theme

```csharp
new MudTheme {
    PaletteLight = new PaletteLight { Primary = "#f97316", ... },
    Typography = new Typography {
        H1 = new H1Typography { FontFamily = ["Nunito","sans-serif"], FontWeight = "700", LineHeight = "1.5" },
    },
    LayoutProperties = new LayoutProperties { DefaultBorderRadius = "14px" },
}
```

Provider trong layout:
```razor
<MudThemeProvider Theme="KindergartenTheme.Theme" />
```

## Primitives dùng trực tiếp (cấm wrapper)

`MudButton`, `MudTextField`, `MudSelect`, `MudDialog`, `MudDataGrid`, `IMudDialogInstance`, `ISnackbar`, `MudIconButton`, `MudChip`, `MudNavMenu`, `MudPaper`, `MudLayout`, `MudContainer`, `MudGrid`.

## data-testid cho Playwright

MudBlazor không expose `data-testid` trực tiếp; các component tự viết (`PageHeader`, `DataTable`) gắn `data-testid` thủ công; primitive dùng `aria-label` hoặc selector `.mud-*` class trong Playwright.
