using MediatR;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Modules.Classes.Commands.CreateClass;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.UnitTests.Classes;

public class CreateClassTests : IDisposable
{
    private readonly TestApplicationDbContext _db;
    private readonly CreateClassHandler _handler;

    public CreateClassTests()
    {
        var options = new DbContextOptionsBuilder<TestApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new TestApplicationDbContext(options);
        _handler = new CreateClassHandler(_db);
    }

    public void Dispose() => _db.Dispose();

    private static CreateClassCommand Command(
        string name = "Lớp Lá A",
        AgeGroup ageGroup = AgeGroup.La,
        string year = "2025-2026",
        string? room = "Phòng 101") =>
        new(name, ageGroup, year, room);

    [Fact]
    public async Task HappyPath_PersistsActiveClass()
    {
        var result = await _handler.Handle(Command(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Value);

        var saved = await _db.Classes.SingleAsync(c => c.Id == result.Value);
        Assert.Equal("Lớp Lá A", saved.Name);
        Assert.Equal(AgeGroup.La, saved.AgeGroup);
        Assert.Equal("2025-2026", saved.AcademicYear);
        Assert.Equal("Phòng 101", saved.Room);
        Assert.Equal(ClassStatus.Active, saved.Status);
    }

    [Fact]
    public async Task DuplicateName_SameGroupAndYear_FailsValidation()
    {
        var first = await _handler.Handle(Command(), CancellationToken.None);
        Assert.True(first.IsSuccess);

        var second = await _handler.Handle(Command(room: "Phòng 202"), CancellationToken.None);

        Assert.True(second.IsFailure);
        Assert.Contains(second.Errors, e => e.Code == "Class.DuplicateName");
    }

    [Fact]
    public async Task SameName_DifferentGroupOrYear_Succeeds()
    {
        await _handler.Handle(Command(), CancellationToken.None);

        var diffGroup = await _handler.Handle(Command(ageGroup: AgeGroup.Mam, room: "Phòng 2"), CancellationToken.None);
        var diffYear = await _handler.Handle(Command(year: "2026-2027", room: "Phòng 3"), CancellationToken.None);

        Assert.True(diffGroup.IsSuccess);
        Assert.True(diffYear.IsSuccess);
    }
}
