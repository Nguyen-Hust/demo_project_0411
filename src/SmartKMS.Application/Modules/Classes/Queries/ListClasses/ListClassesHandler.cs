using MediatR;
using Microsoft.EntityFrameworkCore;
using SmartKMS.Application.Common.Interfaces;
using SmartKMS.Application.Common.Models;
using SmartKMS.Application.Modules.Classes.Dtos;
using SmartKMS.Application.Modules.Classes.Mapping;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Queries.ListClasses;

public sealed class ListClassesHandler(IApplicationDbContext db) : IRequestHandler<ListClassesQuery, Result<IReadOnlyList<ClassSummaryDto>>>
{
    public async Task<Result<IReadOnlyList<ClassSummaryDto>>> Handle(ListClassesQuery request, CancellationToken cancellationToken)
    {
        var query = db.Set<Class>().AsNoTracking();

        if (request.AgeGroup is not null)
            query = query.Where(c => c.AgeGroup == request.AgeGroup);
        if (!string.IsNullOrWhiteSpace(request.AcademicYear))
            query = query.Where(c => c.AcademicYear == request.AcademicYear);
        if (request.Status is not null)
            query = query.Where(c => c.Status == request.Status);

        var dtos = await query
            .OrderBy(c => c.Name)
            .Select(c => ClassMapper.ToSummary(c))
            .ToListAsync(cancellationToken);

        return Result.Success<IReadOnlyList<ClassSummaryDto>>(dtos);
    }
}
