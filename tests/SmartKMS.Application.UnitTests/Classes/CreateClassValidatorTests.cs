using FluentValidation;
using SmartKMS.Application.Modules.Classes.Commands.CreateClass;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Application.UnitTests.Classes;

public class CreateClassValidatorTests
{
    private readonly CreateClassValidator _validator = new();

    private static CreateClassCommand Command(
        string? name = "Lớp Lá A",
        AgeGroup ageGroup = AgeGroup.La,
        string? year = "2025-2026",
        string? room = "Phòng 101") =>
        new(name!, ageGroup, year!, room);

    [Fact]
    public async Task Valid_Command_Passes()
    {
        var result = await _validator.ValidateAsync(Command());
        Assert.True(result.IsValid);
    }

    [Fact]
    public async Task MissingName_Fails()
    {
        var result = await _validator.ValidateAsync(Command(name: ""));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "Name");
    }

    [Fact]
    public async Task MissingAcademicYear_Fails()
    {
        var result = await _validator.ValidateAsync(Command(year: ""));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "AcademicYear");
    }

    [Theory]
    [InlineData("2025")]
    [InlineData("2025-26")]
    [InlineData("25-2026")]
    [InlineData("abcd-efgh")]
    public async Task InvalidAcademicYearFormat_Fails(string year)
    {
        var result = await _validator.ValidateAsync(Command(year: year));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "AcademicYear");
    }

    [Fact]
    public async Task RoomExceeding50_Fails()
    {
        var result = await _validator.ValidateAsync(Command(room: new string('x', 51)));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == "Room");
    }

    [Fact]
    public async Task RoomNull_Passes()
    {
        var result = await _validator.ValidateAsync(Command(room: null));
        Assert.True(result.IsValid);
    }
}
