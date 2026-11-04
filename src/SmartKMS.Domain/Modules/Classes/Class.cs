using SmartKMS.Domain.Common;

namespace SmartKMS.Domain.Modules.Classes;

/// <summary>
/// Aggregate Root (Classes) — spec mvp-core. Sĩ số tối đa cố định 30 (AD-3);
/// thuộc đúng một khối và một năm học; vòng đời soft-close (D-03).
/// </summary>
public class Class : BaseEntity
{
    /// <summary>Sĩ số tối đa cố định — REQ-1 "Must not": không được phép khác 30.</summary>
    public const int MaxStudents = 30;

    private Class() { } // EF Core materialization

    private Class(string name, AgeGroup ageGroup, string academicYear, string room)
    {
        Name = name;
        AgeGroup = ageGroup;
        AcademicYear = academicYear;
        Room = room;
        Status = ClassStatus.Active;
    }

    public string Name { get; private set; } = string.Empty;
    public AgeGroup AgeGroup { get; private set; }
    public string AcademicYear { get; private set; } = string.Empty;
    public string? Room { get; private set; }
    public ClassStatus Status { get; private set; }

    public static Class Create(string name, AgeGroup ageGroup, string academicYear, string? room) =>
        new(name, ageGroup, academicYear, room ?? string.Empty);

    /// <summary>AC-4: chỉ đổi tên/phòng; khối và năm học là bất biến trong slice này.</summary>
    public void Rename(string name, string? room)
    {
        Name = name;
        Room = room ?? string.Empty;
    }

    /// <summary>AC-5: soft-close, idempotent — đóng lớp đã đóng không đổi trạng thái.</summary>
    public void Close() => Status = ClassStatus.Closed;
}
