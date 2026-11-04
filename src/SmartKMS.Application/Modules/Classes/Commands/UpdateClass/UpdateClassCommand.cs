using MediatR;
using SmartKMS.Application.Common.Models;

namespace SmartKMS.Application.Modules.Classes.Commands.UpdateClass;

public sealed record UpdateClassCommand(
    Guid Id,
    string Name,
    string? Room) : IRequest<Result>;
