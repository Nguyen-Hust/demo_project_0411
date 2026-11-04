using MediatR;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Application.Common.Models;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Commands.CloseClass;

public sealed class CloseClassHandler(IApplicationDbContext db) : IRequestHandler<CloseClassCommand, Result>
{
    public async Task<Result> Handle(CloseClassCommand request, CancellationToken cancellationToken)
    {
        var klass = await db.Set<Class>().FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);
        if (klass is null)
            return Result.Failure(Error.NotFound("Class.NotFound", "Không tìm thấy lớp học"));

        klass.Close();
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
