namespace SmartKMS.Domain.Common;

/// <summary>Value Object bất biến — equality theo các component (DDD).</summary>
public abstract class ValueObject
{
    protected abstract IEnumerable<object> GetEqualityComponents();

    public override bool Equals(object? obj)
    {
        if (obj is null || obj.GetType() != GetType())
            return false;

        return GetEqualityComponents().SequenceEqual(((ValueObject)obj).GetEqualityComponents());
    }

    public override int GetHashCode() =>
        GetEqualityComponents().Aggregate(17, (hash, component) => HashCode.Combine(hash, component));
}
