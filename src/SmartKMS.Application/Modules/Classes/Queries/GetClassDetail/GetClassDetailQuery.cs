using MediatR;
using SmartKMS.Application.Common.Models;
using SmartKMS.Application.Modules.Classes.Dtos;

namespace SmartKMS.Application.Modules.Classes.Queries.GetClassDetail;

public sealed record GetClassDetailQuery(Guid Id) : IRequest<Result<ClassDetailDto>>;
