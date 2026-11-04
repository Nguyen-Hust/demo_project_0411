using SmartKMS.Application.Modules.Classes.Dtos;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Web.Components.Pages.Classes;

public sealed record ClassFormResult(string Name, AgeGroup AgeGroup, string AcademicYear, string? Room);
