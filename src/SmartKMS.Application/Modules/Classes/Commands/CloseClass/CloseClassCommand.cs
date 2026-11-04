using MediatR;
using SmartKMS.Application.Common.Models;

namespace SmartKMS.Application.Modules.Classes.Commands.CloseClass;

public sealed record CloseClassCommand(Guid Id) : IRequest<Result>;
