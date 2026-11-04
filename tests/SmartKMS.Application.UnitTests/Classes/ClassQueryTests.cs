using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Modules.Classes.Commands.CreateClass;
using SmartKMS.Application.Modules.Classes.Queries.GetClassDetail;
using SmartKMS.Application.Modules.Classes.Queries.ListClasses;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.UnitTests.Classes;

public class ClassQueryTests : IDisposable
{
    private readonly TestApplicationDbContext _db;
    private readonly CreateClassHandler _create;
    private readonly ListClassesHandler _list;
    private readonly GetClassDetailHandler _detail;

    public ClassQueryTests()
    {
        var options = new DbContextOptionsBuilder<TestApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new TestApplicationDbContext(options);
        _create = new CreateClassHandler(_db);
        _list = new ListClassesHandler(_db);
        _detail = new GetClassDetailHandler(_db);
    }

    public void Dispose() => _db.Dispose();

    private async Task SeedAsync(
        string name, AgeGroup group, string year, string room)
    {
        var r = await _create.Handle(new CreateClassCommand(name, group, year, room), CancellationToken.None);
        Assert.True(r.IsSuccess);
    }

    [Fact]
    public async Task List_NoFilter_ReturnsAll()
    {
        await SeedAsync("Lớp Lá A", AgeGroup.La, "2025-2026", "101");
        await SeedAsync("Lớp Mầm A", AgeGroup.Mam, "2026-2027", "102");

        var result = await _list.Handle(new ListClassesQuery(null, null, null), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value.Count);
    }

    [Fact]
    public async Task List_FilterByAgeGroup()
    {
        await SeedAsync("Lớp Lá A", AgeGroup.La, "2025-2026", "101");
        await SeedAsync("Lớp Mầm A", AgeGroup.Mam, "2026-2027", "102");

        var result = await _list.Handle(new ListClassesQuery(AgeGroup.La, null, null), CancellationToken.None);

        Assert.Single(result.Value);
        Assert.Equal("Lớp Lá A", result.Value[0].Name);
    }

    [Fact]
    public async Task List_FilterByYear()
    {
        await SeedAsync("Lớp Lá A", AgeGroup.La, "2025-2026", "101");
        await SeedAsync("Lớp Lá B", AgeGroup.La, "2026-2027", "102");

        var result = await _list.Handle(new ListClassesQuery(null, "2026-2027", null), CancellationToken.None);

        Assert.Single(result.Value);
        Assert.Equal("Lớp Lá B", result.Value[0].Name);
    }

    [Fact]
    public async Task List_FilterByStatus_Closed()
    {
        var r = await _create.Handle(new CreateClassCommand("Lớp Lá A", AgeGroup.La, "2025-2026", "101"), CancellationToken.None);
        var closed = await _db.Classes.SingleAsync(c => c.Id == r.Value);
        closed.Close();
        await _db.SaveChangesAsync();
        await SeedAsync("Lớp Lá B", AgeGroup.La, "2026-2027", "102");

        var result = await _list.Handle(new ListClassesQuery(null, null, ClassStatus.Closed), CancellationToken.None);

        Assert.Single(result.Value);
        Assert.Equal(ClassStatus.Closed.ToString(), result.Value[0].Status);
    }

    [Fact]
    public async Task List_Empty_ReturnsEmpty()
    {
        var result = await _list.Handle(new ListClassesQuery(null, null, null), CancellationToken.None);
        Assert.Empty(result.Value);
    }

    [Fact]
    public async Task Detail_HappyPath_VacantSlots30_EmptyLists()
    {
        var id = (await _create.Handle(new CreateClassCommand("Lớp Lá A", AgeGroup.La, "2025-2026", "101"), CancellationToken.None)).Value;

        var result = await _detail.Handle(new GetClassDetailQuery(id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("Lớp Lá A", result.Value.Name);
        Assert.Equal(30, result.Value.VacantSlots);
        Assert.Equal(0, result.Value.StudentCount);
        Assert.Empty(result.Value.Teachers);
        Assert.Empty(result.Value.Children);
    }

    [Fact]
    public async Task Detail_NotFound_Fails()
    {
        var result = await _detail.Handle(new GetClassDetailQuery(Guid.NewGuid()), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains(result.Errors, e => e.Code == "Class.NotFound");
    }
}
