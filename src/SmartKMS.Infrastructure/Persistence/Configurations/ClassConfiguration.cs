using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartKMS.Domain.Modules.Classes;

namespace SmartKMS.Infrastructure.Persistence.Configurations;

/// <summary>
/// AD-1/ADD §5.3: DB config ở IEntityTypeConfiguration, cấm DataAnnotations.
/// snake_case (UseSnakeCaseNamingConvention), unique (tên, khối, năm học).
/// </summary>
public sealed class ClassConfiguration : IEntityTypeConfiguration<Class>
{
    public void Configure(EntityTypeBuilder<Class> builder)
    {
        builder.ToTable("classes");

        builder.HasKey(c => c.Id).HasName("pk_classes");

        builder.Property(c => c.Name).IsRequired().HasMaxLength(100);
        builder.Property(c => c.AcademicYear).IsRequired().HasMaxLength(9);
        builder.Property(c => c.Room).HasMaxLength(50).IsRequired(false);

        builder.Property(c => c.AgeGroup)
            .HasConversion<string>()
            .IsRequired()
            .HasMaxLength(16);
        builder.Property(c => c.Status)
            .HasConversion<string>()
            .IsRequired()
            .HasMaxLength(16);

        builder.HasIndex(c => new { c.Name, c.AgeGroup, c.AcademicYear })
            .IsUnique()
            .HasDatabaseName("uq_classes_name_agegroup_year");
    }
}
