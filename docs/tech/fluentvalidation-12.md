# FluentValidation 12 — notes

- Version pin: **12.2.0** + `FluentValidation.DependencyInjectionExtensions` 12.2.0.
- Đăng ký tự động: `services.AddValidatorsFromAssembly(Assembly.GetExecutingAssembly())` (Application).
- Chạy qua `ValidationBehavior` trong pipeline MediatR (trước Handler).

```csharp
public sealed class CreateChildValidator : AbstractValidator<CreateChildCommand>
{
    public CreateChildValidator()
    {
        RuleFor(x => x.ChildCode).NotEmpty().MaximumLength(20);
        RuleFor(x => x.FirstName).NotEmpty();
        RuleFor(x => x.DateOfBirth).LessThan(DateOnly.FromDateTime(DateTime.Today));
    }
}
```

- Behavior trả `Result<T>` failure (`Error.Validation(...)`) thay vì throw khi TResponse là `Result`/`Result<T>`.
- CẤM DataAnnotations (`[Required]`, `[MaxLength]`) trên Domain entity — validation nghiệp vụ nằm ở đây, cấu trúc DB nằm ở `IEntityTypeConfiguration`.
