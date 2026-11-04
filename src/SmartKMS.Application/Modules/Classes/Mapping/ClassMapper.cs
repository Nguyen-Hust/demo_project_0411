using SmartKMS.Application.Modules.Classes.Dtos;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Mapping;

/// <summary>
/// Map Class → DTO thủ công: StudentCount = 0 cho tới ticket 05 (xếp lớp);
/// detail lists rỗng vì ClassAssignment/ChildEnrollment chưa tồn tại.
/// MaxStudents và VacantSlots suy từ hằng số Class.MaxStudents (= 30, AD-3).
/// (Không dùng Riok.Mapperly ở đây: các trường hằng số/nội suy không phù hợp attribute mapping.)
/// </summary>
public static class ClassMapper
{
    public static ClassSummaryDto ToSummary(Class c) => new(
        c.Id,
        c.Name,
        c.AgeGroup.ToString(),
        c.AcademicYear,
        c.Room,
        c.Status.ToString(),
        StudentCount: 0,
        MaxStudents: Class.MaxStudents);

    public static ClassDetailDto ToDetail(Class c) => new(
        c.Id,
        c.Name,
        c.AgeGroup.ToString(),
        c.AcademicYear,
        c.Room,
        c.Status.ToString(),
        Teachers: [],
        Children: [],
        StudentCount: 0,
        MaxStudents: Class.MaxStudents,
        VacantSlots: Class.MaxStudents - 0);
}
