namespace SmartKMS.Domain.Exceptions;

/// <summary>Lỗi bất biến nghiệp vụ bị vi phạm ngay trong Domain (ADD §3.3).</summary>
public class DomainException(string message) : Exception(message)
{
}
