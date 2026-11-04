# Riok.Mapperly 4 — notes

- Version pin: **4.3.1** (compile-time source generator, zero reflection).
- Dùng attribute `[Mapper]` + `[MapProperty]` khi tên khác.

```csharp
[Mapper]
public partial class ChildMapper
{
    public partial ChildListDto ToListDto(Child child);
}
```

- Package reference: `PrivateAssets="all" ExcludeAssets="runtime"` (chỉ cần ở compile time).
- Ưu điểm: không reflection/IL.Emit, Native AOT friendly, hiệu năng gần gán tay.
- Ưu tiên Mapperly hơn Mapster/AutoMapper theo ADD — không thêm mapper runtime khác.
