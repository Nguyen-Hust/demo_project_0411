using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Modules.Classes.Commands.CloseClass;
using SmartKMS.Application.Modules.Classes.Commands.CreateClass;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.UnitTests.Classes;

public class CloseClassTests : IDisposable
{
    private readonly TestApplicationDbContext _db;
    private readonly CreateClassHandler _create;
    private readonly CloseClassHandler _close;

    public CloseClassTests()
    {
        var options = new DbContextOptionsBuilder<TestApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new TestApplicationDbContext(options);
        _create = new CreateClassHandler(_db);
        _close = new CloseClassHandler(_db);
    }

    public void Dispose() => _db.Dispose();

    private async Task<Guid> SeedAsync()
    {
        var r = await _create.Handle(new CreateClassCommand("Lớp Lá A", AgeGroup.La, "2025-2026", "Phòng 101"), CancellationToken.None);
        return r.Value;
    }

    [Fact]
    public async Task HappyPath_ClosesClass()
    {
        var id = await SeedAsync();

        var result = await _close.Handle(new CloseClassCommand(id), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var saved = await _db.Classes.SingleAsync(c => c.Id == id);
        Assert.Equal(ClassStatus.Closed, saved.Status);
    }

    [Fact]
    public async Task NotFound_Fails()
    {
        var result = await _close.Handle(new CloseClassCommand(Guid.NewGuid()), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains(result.Errors, e => e.Code == "Class.NotFound");
    }

    [Fact]
    public async Task AlreadyClosed_IsIdempotent()
    {
        var id = await SeedAsync();
        await _close.Handle(new CloseClassCommand(id), CancellationToken.None);

        var result = await _close.Handle(new CloseClassCommand(id), CancellationToken.None);

        Assert.True(result.IsSuccess);
    }
}
