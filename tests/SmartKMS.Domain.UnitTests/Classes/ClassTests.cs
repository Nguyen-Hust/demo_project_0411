namespace SmartKMS.Domain.UnitTests.Classes;

public class ClassTests
{
    private static (Domain.Modules.Classes.Class Class, Domain.Modules.Classes.AgeGroup Group)
        NewClass()
    {
        const Domain.Modules.Classes.AgeGroup group = Domain.Modules.Classes.AgeGroup.La;
        var klass = Domain.Modules.Classes.Class.Create("Lớp Lá A", group, "2025-2026", "Phòng 101");
        return (klass, group);
    }

    [Fact]
    public void Create_SetsActiveStatus_WithDefaults()
    {
        var (klass, group) = NewClass();

        Assert.Equal("Lớp Lá A", klass.Name);
        Assert.Equal(group, klass.AgeGroup);
        Assert.Equal("2025-2026", klass.AcademicYear);
        Assert.Equal("Phòng 101", klass.Room);
        Assert.Equal(Domain.Modules.Classes.ClassStatus.Active, klass.Status);
        Assert.NotEqual(Guid.Empty, klass.Id);
    }

    [Fact]
    public void MaxStudents_Is30()
    {
        Assert.Equal(30, Domain.Modules.Classes.Class.MaxStudents);
    }

    [Fact]
    public void Close_SetsClosedStatus()
    {
        var (klass, _) = NewClass();

        klass.Close();

        Assert.Equal(Domain.Modules.Classes.ClassStatus.Closed, klass.Status);
    }

    [Fact]
    public void Close_IsIdempotent()
    {
        var (klass, _) = NewClass();
        klass.Close();

        klass.Close();

        Assert.Equal(Domain.Modules.Classes.ClassStatus.Closed, klass.Status);
    }

    [Fact]
    public void Rename_UpdatesNameAndRoom()
    {
        var (klass, _) = NewClass();

        klass.Rename("Lớp Lá A1", "Phòng 102");

        Assert.Equal("Lớp Lá A1", klass.Name);
        Assert.Equal("Phòng 102", klass.Room);
    }

    [Fact]
    public void Rename_KeepsAgeGroupAndYear()
    {
        var (klass, group) = NewClass();

        klass.Rename("Lớp Lá A2", "Phòng 103");

        Assert.Equal(group, klass.AgeGroup);
        Assert.Equal("2025-2026", klass.AcademicYear);
    }
}
