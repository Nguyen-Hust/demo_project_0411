using FluentValidation;

namespace SmartKMS.Application.Modules.Classes.Commands.CreateClass;

/// <summary>AD-3: business rules ở validator, chạy qua ValidationBehavior (trước Handler).</summary>
public sealed class CreateClassValidator : AbstractValidator<CreateClassCommand>
{
    public CreateClassValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên lớp là bắt buộc")
            .MaximumLength(100).WithMessage("Tên lớp tối đa 100 ký tự");
        RuleFor(x => x.AcademicYear)
            .NotEmpty().WithMessage("Năm học là bắt buộc")
            .Matches(@"^\d{4}-\d{4}$").WithMessage("Năm học phải có dạng YYYY-YYYY");
        RuleFor(x => x.Room)
            .MaximumLength(50).WithMessage("Phòng tối đa 50 ký tự");
    }
}
