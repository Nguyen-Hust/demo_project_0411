using MediatR;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Application.Common.Models;
using SmartKMS.Application.Modules.Classes.Dtos;
using SmartKMS.Application.Modules.Classes.Mapping;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Queries.GetClassDetail;

public sealed class GetClassDetailHandler(IApplicationDbContext db) : IRequestHandler<GetClassDetailQuery, Result<ClassDetailDto>>
{
    public async Task<Result<ClassDetailDto>> Handle(GetClassDetailQuery request, CancellationToken cancellationToken)
    {
        var klass = await db.Set<Class>()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (klass is null)
            return Result.Failure<ClassDetailDto>(Error.NotFound("Class.NotFound", "Không tìm thấy lớp học"));

        return Result.Success(ClassMapper.ToDetail(klass));
    }
}
