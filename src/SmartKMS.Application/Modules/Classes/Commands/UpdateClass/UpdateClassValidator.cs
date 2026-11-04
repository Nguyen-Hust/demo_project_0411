using FluentValidation;

namespace SmartKMS.Application.Modules.Classes.Commands.UpdateClass;

public sealed class UpdateClassValidator : AbstractValidator<UpdateClassCommand>
{
    public UpdateClassValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Tên lớp là bắt buộc")
            .MaximumLength(100).WithMessage("Tên lớp tối đa 100 ký tự");
        RuleFor(x => x.Room)
            .MaximumLength(50).WithMessage("Phòng tối đa 50 ký tự");
    }
}
