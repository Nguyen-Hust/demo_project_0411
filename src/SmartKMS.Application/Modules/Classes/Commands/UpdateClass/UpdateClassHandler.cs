using MediatR;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Application.Common.Models;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Commands.UpdateClass;

public sealed class UpdateClassHandler(IApplicationDbContext db) : IRequestHandler<UpdateClassCommand, Result>
{
    public async Task<Result> Handle(UpdateClassCommand request, CancellationToken cancellationToken)
    {
        var klass = await db.Set<Class>().FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);
        if (klass is null)
            return Result.Failure(Error.NotFound("Class.NotFound", "Không tìm thấy lớp học"));

        var duplicate = await db.Set<Class>()
            .AsNoTracking()
            .AnyAsync(c =>
                    c.Id != request.Id &&
                    c.Name == request.Name &&
                    c.AgeGroup == klass.AgeGroup &&
                    c.AcademicYear == klass.AcademicYear,
                cancellationToken);

        if (duplicate)
            return Result.Failure(Error.Validation("Class.DuplicateName", "Tên lớp đã tồn tại trong cùng khối và năm học"));

        klass.Rename(request.Name, request.Room);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
