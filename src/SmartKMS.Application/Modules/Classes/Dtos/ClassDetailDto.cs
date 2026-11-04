namespace SmartKMS.Application.Modules.Classes.Dtos;

public sealed record ClassDetailDto(
    Guid Id,
    string Name,
    string AgeGroup,
    string AcademicYear,
    string? Room,
    string Status,
    IReadOnlyCollection<Guid> Teachers,
    IReadOnlyCollection<Guid> Children,
    int StudentCount,
    int MaxStudents,
    int VacantSlots);
