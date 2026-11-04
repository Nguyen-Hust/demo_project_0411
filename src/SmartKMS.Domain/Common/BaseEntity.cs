namespace SmartKMS.Domain.Common;

/// <summary>
/// Nền tảng cho mọi entity. ID là Guid (ADD §3.3).
/// Domain events dùng cho Outbox Pattern (ADD §4.4) ở wave có persistence.
/// </summary>
public abstract class BaseEntity
{
    private readonly List<IDomainEvent> _domainEvents = [];

    public Guid Id { get; protected set; } = Guid.NewGuid();

    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    public void AddDomainEvent(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}
