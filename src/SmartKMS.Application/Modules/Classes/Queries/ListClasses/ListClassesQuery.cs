using MediatR;
using SmartKMS.Application.Common.Models;
using SmartKMS.Application.Modules.Classes.Dtos;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Queries.ListClasses;

public sealed record ListClassesQuery(
    AgeGroup? AgeGroup,
    string? AcademicYear,
    ClassStatus? Status) : IRequest<Result<IReadOnlyList<ClassSummaryDto>>>;
