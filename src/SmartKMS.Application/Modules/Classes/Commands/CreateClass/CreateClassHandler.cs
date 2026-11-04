using MediatR;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Application.Common.Models;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Commands.CreateClass;

public sealed class CreateClassHandler(IApplicationDbContext db) : IRequestHandler<CreateClassCommand, Result<Guid>>
{
    private const string DuplicateCode = "Class.DuplicateName";

    public async Task<Result<Guid>> Handle(CreateClassCommand request, CancellationToken cancellationToken)
    {
        var duplicate = await db.Set<Class>()
            .AsNoTracking()
            .AnyAsync(c =>
                    c.Name == request.Name &&
                    c.AgeGroup == request.AgeGroup &&
                    c.AcademicYear == request.AcademicYear,
                cancellationToken);

        if (duplicate)
            return Result.Failure<Guid>(Error.Validation(DuplicateCode, "Tên lớp đã tồn tại trong cùng khối và năm học"));

        var klass = Class.Create(request.Name, request.AgeGroup, request.AcademicYear, request.Room);
        db.Set<Class>().Add(klass);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success(klass.Id);
    }
}
