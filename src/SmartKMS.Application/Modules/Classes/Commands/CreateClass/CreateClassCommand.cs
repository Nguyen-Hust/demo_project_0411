using MediatR;
using SmartKMS.Application.Common.Models;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.Modules.Classes.Commands.CreateClass;

public sealed record CreateClassCommand(
    string Name,
    AgeGroup AgeGroup,
    string AcademicYear,
    string? Room) : IRequest<Result<Guid>>;
