using MudBlazor;

namespace SmartKMS.Web.Theme;

/// <summary>
/// MudTheme từ design tokens của template GĐ1 (docs/design-system/MASTER.md).
/// Sửa token: cập nhật đồng thời ở đây + MASTER.md + .workspace/DESIGN-PREVIEW.html.
/// </summary>
public static class KindergartenTheme
{
    public static readonly MudTheme Theme = new()
    {
        PaletteLight = new PaletteLight
        {
            Primary = "#f97316",
            Secondary = "#fef3e8",
            Tertiary = "#fde68a",
            Background = "#fdf9f5",
            Surface = "#ffffff",
            AppbarBackground = "#fdf9f5",
            DrawerBackground = "#ffffff",
            TextPrimary = "#231c0d",
            TextSecondary = "#8a7055",
            Error = "#ef4444",
            Success = "#4ade80",
            Warning = "#fbbf24",
            Info = "#60a5fa",
            LinesDefault = "rgba(140, 100, 40, 0.12)",
            Divider = "rgba(140, 100, 40, 0.12)",
            OverlayLight = "rgba(140, 100, 40, 0.12)",
            White = "#ffffff",
            Black = "#231c0d",
        },
        Typography = new Typography
        {
            Default = new DefaultTypography
            {
                FontFamily = ["Plus Jakarta Sans", "system-ui", "sans-serif"],
                FontSize = "15px",
            },
            H1 = new H1Typography { FontFamily = ["Nunito", "sans-serif"], FontWeight = "700", LineHeight = "1.5" },
            H2 = new H2Typography { FontFamily = ["Nunito", "sans-serif"], FontWeight = "700", LineHeight = "1.5" },
            H3 = new H3Typography { FontFamily = ["Nunito", "sans-serif"], FontWeight = "600", LineHeight = "1.5" },
            H4 = new H4Typography { FontFamily = ["Nunito", "sans-serif"], FontWeight = "600", LineHeight = "1.5" },
        },
        LayoutProperties = new LayoutProperties
        {
            DefaultBorderRadius = "14px",
        },
    };
}
