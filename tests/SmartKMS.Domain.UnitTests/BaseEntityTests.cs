using SmartKMS.Domain.Common;

namespace SmartKMS.Domain.UnitTests;

public class BaseEntityTests
{
    private sealed class TestEntity : BaseEntity;

    [Fact]
    public void NewEntity_HasNonEmptyId()
    {
        var entity = new TestEntity();
        Assert.NotEqual(Guid.Empty, entity.Id);
    }

    [Fact]
    public void AddDomainEvent_RaisesEvent_AndClearDomainEvents_RemovesIt()
    {
        var entity = new TestEntity();
        entity.AddDomainEvent(new TestDomainEvent());

        Assert.Single(entity.DomainEvents);

        entity.ClearDomainEvents();

        Assert.Empty(entity.DomainEvents);
    }

    private sealed record TestDomainEvent : IDomainEvent;
}
