# Ubiquitous Language & DDD Glossary

| Term (VI) | Code Identifier (EN) | DDD Role | Core Invariant |
| :--- | :--- | :--- | :--- |
| Trẻ em / Học sinh | `Child` | Aggregate Root (Children) | Mỗi trẻ có `ChildCode` duy nhất; trạng thái đăng ký hợp lệ |
| Người đón được ủy quyền | `AuthorizedPickupPerson` | Entity (thuộc Child) | Chỉ người trong danh sách mới được đón trẻ |
| Đăng ký nhập học | `ChildEnrollment` | Entity | Liên kết 1 trẻ ↔ 1 lớp trong kỳ học |
| Nhân viên | `Staff` | Aggregate Root (Staff) | Mỗi nhân viên có bằng cấp (Qualification) |
| Giáo viên | `Teacher` | Role | Chỉ sửa nhật ký lớp mình phụ trách (AD-2 policy) |
| Năm học | `AcademicYear` | Entity | Khoảng thời gian tuyển sinh |
| Nhóm lớp | `ClassGroup` | Aggregate | Trẻ được phân vào đúng nhóm theo độ tuổi |
| Nhóm tuổi | `AgeGroup` | Value Object | 6-12m, 12-24m, 24-36m, Mầm, Chồi, Lá |
| Điểm danh ngày | `DailyAttendance` | Aggregate (Attendance) | Mỗi trẻ 1 bản ghi/ngày |
| Nhật ký đón | `DailyPickupLog` | Entity | Ghi lại người đón + thời gian bàn giao |
| Món ăn | `Dish` | Entity (Nutrition) | Thành phần dinh dưỡng |
| Thực đơn tuần | `WeeklyMenu` | Aggregate | Mỗi tuần 1 thực đơn |
| Tổng suất ăn | `MealOrderSummary` | Read Model | Chốt số suất/ngày cho nhà bếp |
| Lệnh (ghi) | `*Command` | CQRS Command | Thay đổi trạng thái; trả `Result<T>` |
| Truy vấn (đọc) | `*Query` | CQRS Query | Không đổi trạng thái; trả `Result<T>`/`PagedResult<T>` |

_Bổ sung thuật ngữ khi từng module (Children, Staff, Academics, Attendance, Nutrition) được khai thác ở Sprint 1+._
