namespace SmartKMS.Domain.Modules.Classes;

/// <summary>
/// Khối nhóm tuổi của lớp học (spec mvp-core · GLOSSARY AgeGroup, nhánh cho Lớp).
/// Chỉ 3 giá trị Mầm/Chồi/Lá theo spec frozen; nhóm nhà trẻ bổ sung ở module tương ứng.
/// </summary>
public enum AgeGroup
{
    Mam,
    Choi,
    La
}
