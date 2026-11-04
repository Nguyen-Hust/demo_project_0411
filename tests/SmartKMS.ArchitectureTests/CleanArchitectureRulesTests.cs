using NetArchTest.Rules;
using SmartKMS.Domain.Common;

namespace SmartKMS.ArchitectureTests;

/// <summary>ADD §6.1: CI chặn PR vi phạm ranh giới Clean Architecture.</summary>
public class CleanArchitectureRulesTests
{
    private const string ApplicationNs = "SmartKMS.Application";
    private const string InfrastructureNs = "SmartKMS.Infrastructure";
    private const string WebNs = "SmartKMS.Web";

    [Fact]
    public void Domain_Should_Not_Have_Dependency_On_Other_Projects()
    {
        var result = Types.InAssembly(typeof(BaseEntity).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(ApplicationNs, InfrastructureNs, WebNs)
            .GetResult();

        Assert.True(result.IsSuccessful, result.FailingTypeNames is null
            ? "Architecture rule violated"
            : string.Join(", ", result.FailingTypeNames));
    }

    [Fact]
    public void Application_Should_Not_Depend_On_Infrastructure_Or_Web()
    {
        var result = Types.InAssembly(typeof(Application.DependencyInjection).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(InfrastructureNs, WebNs)
            .GetResult();

        Assert.True(result.IsSuccessful, result.FailingTypeNames is null
            ? "Architecture rule violated"
            : string.Join(", ", result.FailingTypeNames));
    }

    [Fact]
    public void Infrastructure_Should_Not_Depend_On_Web()
    {
        var result = Types.InAssembly(typeof(Infrastructure.Persistence.ApplicationDbContext).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(WebNs)
            .GetResult();

        Assert.True(result.IsSuccessful, result.FailingTypeNames is null
            ? "Architecture rule violated"
            : string.Join(", ", result.FailingTypeNames));
    }
}
