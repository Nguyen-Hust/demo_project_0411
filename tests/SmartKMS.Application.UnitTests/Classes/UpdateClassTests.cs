using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Modules.Classes.Commands.CreateClass;
using SmartKMS.Application.Modules.Classes.Commands.UpdateClass;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.UnitTests.Classes;

public class UpdateClassTests : IDisposable
{
    private readonly TestApplicationDbContext _db;
    private readonly CreateClassHandler _create;
    private readonly UpdateClassHandler _update;

    public UpdateClassTests()
    {
        var options = new DbContextOptionsBuilder<TestApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new TestApplicationDbContext(options);
        _create = new CreateClassHandler(_db);
        _update = new UpdateClassHandler(_db);
    }

    public void Dispose() => _db.Dispose();

    private async Task<Guid> SeedAsync(string name = "Lớp Lá A", AgeGroup group = AgeGroup.La, string year = "2025-2026") =>
        (await _create.Handle(new CreateClassCommand(name, group, year, "Phòng 101"), CancellationToken.None)).Value;

    [Fact]
    public async Task HappyPath_ChangesNameAndRoom()
    {
        var id = await SeedAsync();

        var result = await _update.Handle(new UpdateClassCommand(id, "Lớp Lá A1", "Phòng 102"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var saved = await _db.Classes.SingleAsync(c => c.Id == id);
        Assert.Equal("Lớp Lá A1", saved.Name);
        Assert.Equal("Phòng 102", saved.Room);
    }

    [Fact]
    public async Task KeepsAgeGroupAndYear()
    {
        var id = await SeedAsync();

        await _update.Handle(new UpdateClassCommand(id, "Lớp Lá A2", "Phòng 103"), CancellationToken.None);

        var saved = await _db.Classes.SingleAsync(c => c.Id == id);
        Assert.Equal(AgeGroup.La, saved.AgeGroup);
        Assert.Equal("2025-2026", saved.AcademicYear);
    }

    [Fact]
    public async Task NotFound_Fails()
    {
        var result = await _update.Handle(new UpdateClassCommand(Guid.NewGuid(), "X", "Y"), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains(result.Errors, e => e.Code == "Class.NotFound");
    }

    [Fact]
    public async Task DuplicateName_ExcludingSelf_Fails()
    {
        var id = await SeedAsync();
        await SeedAsync("Lớp Lá B", AgeGroup.La, "2025-2026");

        var result = await _update.Handle(new UpdateClassCommand(id, "Lớp Lá B", "Phòng 102"), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains(result.Errors, e => e.Code == "Class.DuplicateName");
    }

    [Fact]
    public async Task SameName_AsSelf_Succeeds()
    {
        var id = await SeedAsync();

        var result = await _update.Handle(new UpdateClassCommand(id, "Lớp Lá A", "Phòng 999"), CancellationToken.None);

        Assert.True(result.IsSuccess);
    }
}
