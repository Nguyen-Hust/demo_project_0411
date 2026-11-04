namespace SmartKMS.Application.Modules.Classes.Dtos;

public sealed record ClassSummaryDto(
    Guid Id,
    string Name,
    string AgeGroup,
    string AcademicYear,
    string? Room,
    string Status,
    int StudentCount,
    int MaxStudents);
