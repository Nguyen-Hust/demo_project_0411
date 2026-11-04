# Decisions: mvp-core

## Goal

Hoàn thiện bản MVP hệ thống quản lý trường mầm non "Mầm Chồi Lá" (Giai đoạn 1: quản lý Lớp học, Giáo viên, Học sinh; phân công 3 giáo viên/lớp; xếp học sinh vào lớp; dashboard cơ bản).

## Scope

- in: Quản lý Lớp học (khối Mầm/Chồi/Lá, sĩ số tối đa 30), Quản lý Giáo viên, Quản lý Học sinh, phân công giáo viên vào lớp (3 GV/lớp, vai trò chủ nhiệm/hỗ trợ), xếp học sinh vào lớp, dashboard cảnh báo nghiệp vụ.
- out: (chốt sau grilling — sơ bộ: Xác thực & phân quyền, Điểm danh, Học phí, Thực đơn, Sức khỏe, Nhật ký lớp, Thông báo phụ huynh, Báo cáo nâng cao, Quản lý năm học tự động)

## Decisions

### [D-01] MVP chưa có auth
- Timestamp: 2026-11-04T16:30:00Z
- Door Type: One-Way (định hình phạm vi toàn bộ MVP)
- Context: Tài liệu khách hàng mục 4 xếp "Xác thực & phân quyền" vào Giai đoạn 2
- Decided: MVP chạy với một vai trò quản trị duy nhất; không có đăng nhập, không phân quyền. Auth + vai trò để Giai đoạn 2.
- Supersedes: None
- Why: Đúng lộ trình GĐ1 của khách hàng, giảm ~30-40% phạm vi so với phương án auth cơ bản; toàn bộ nghiệp vụ GĐ1 là CRUD quản trị nên một vai trò là đủ.
- Cost-if-wrong: Nếu khách hàng muốn giáo viên tự thao tác ngay GĐ1, phải bổ sung thêm cả module auth khi đã xây xong MVP — tốn 1 vòng refactor.

### [D-02] Quy tắc 3 giáo viên: chặn thứ 4, cho phép 1-3
- Timestamp: 2026-11-04T16:30:00Z
- Door Type: One-Way (bất biến miền cốt lõi)
- Context: overview 1.md mục 2 — "mỗi lớp học gắn với đúng 3 giáo viên"
- Decided: Hệ thống chặn xếp giáo viên thứ 4 vào một lớp; lớp được phép tồn tại với 1–3 giáo viên; trạng thái thiếu (<3) hoặc thừa (không thể xảy ra do chặn) hiển thị cảnh báo trên dashboard.
- Supersedes: None
- Why: Phản ánh đúng thực tế vận hành (lớp mới chưa đủ GV, GV nghỉ giữa năm) đồng thời giữ nguyên ràng buộc cốt lõi; cảnh báo đảm bảo lớp thiếu GV không bị bỏ quên.
- Cost-if-wrong: Nếu khách hàng muốn chặn cứng "chưa đủ 3 GV thì không lập lớp", cần thêm guard tại tạo lớp — chi phí thấp, chỉ là thắt chặt thêm một guard đã có.

### [D-03] Soft-close toàn bộ vòng đời
- Timestamp: 2026-11-04T16:30:00Z
- Door Type: One-Way (ảnh hưởng lược đồ dữ liệu & mọi màn CRUD)
- Context: overview 1.md mục 3 — "Xóa (hoặc đóng)", "Xóa (ngừng công tác)", "Xóa (thôi học)"
- Decided: Không có xóa cứng trong MVP. Đóng lớp / ngừng công tác / thôi học đều là chuyển trạng thái (soft-close), đối tượng vẫn hiện diện trong danh sách qua bộ lọc trạng thái.
- Supersedes: None
- Why: Lớp, GV, HS đều có lịch sử liên kết (phân công, xếp lớp, chuyển lớp); xóa cứng làm mất dữ liệu thống kê. Soft-close giữ toàn vẹn lịch sử với chi phí thấp (thêm enum trạng thái + filter).
- Cost-if-wrong: Nếu khách hàng cần dọn dữ liệu nhập sai, sẽ thiếu cơ chế xóa — cần bổ sung ở vòng sau; chấp nhận được vì không mất dữ liệu.

### [D-04] Một trường duy nhất
- Timestamp: 2026-11-04T16:40:00Z
- Door Type: One-Way (ảnh hưởng mọi bảng dữ liệu)
- Context: overview 1.md mục 5 — "nếu hệ thống chỉ phục vụ 1 trường, có thể bỏ qua thực thể này"
- Decided: Hệ thống phục vụ một trường duy nhất; bỏ thực thể Trường khỏi mô hình dữ liệu MVP.
- Supersedes: None
- Why: Khách hàng là một trường cụ thể; giữ mô hình gọn, đúng gợi ý của tài liệu. Khi cần đa trường mới thêm tầng tổ chức sau.
- Cost-if-wrong: Nếu khách hàng mở thêm cơ sở trong tương lai gần, phải thêm trường_id vào toàn bộ thực thể — chi phí trung bình, chấp nhận được vì là mở rộng có dự kiến.

### [D-05] Chủ nhiệm: 1 GV tối đa 1 lớp
- Timestamp: 2026-11-04T16:40:00Z
- Door Type: One-Way (bất biến miền)
- Context: overview 1.md mục 2 ràng buộc 3 — "nên phân biệt vai trò: 1 Giáo viên chủ nhiệm (chính), 2 Giáo viên hỗ trợ"
- Decided: Mỗi lớp có đúng 1 giáo viên chủ nhiệm (khi đủ 3 GV); một giáo viên được chủ nhiệm tối đa 1 lớp, được hỗ trợ nhiều lớp. Hệ thống chặn vi phạm (2 chủ nhiệm trong 1 lớp; 1 GV chủ nhiệm 2 lớp).
- Supersedes: None
- Why: Ý nghĩa "chủ nhiệm" chỉ rõ ràng khi duy nhất; đồng thời vẫn linh hoạt cho trường thiếu GV vì GV được phép hỗ trợ nhiều lớp và lớp được phép chưa đủ 3 GV (D-02).
- Cost-if-wrong: Nếu trường nhỏ buộc một GV chủ nhiệm 2 lớp, hệ thống sẽ chặn và cần nới lỏng rule — chỉ là gỡ một guard.

### [D-06] Chuyển lớp thủ công, lên khối để GĐ4
- Timestamp: 2026-11-04T16:40:00Z
- Door Type: One-Way (phạm vi)
- Context: overview 1.md mục 3.3 — "Chuyển lớp / lên khối ... có lưu lịch sử"; mục 4 — "Quản lý năm học" thuộc mở rộng (GĐ4)
- Decided: MVP hỗ trợ chuyển lớp giữa năm (thủ công, ghi lịch sử lớp đã học, chặn khi lớp đích đủ 30). Nghiệp vụ "lên khối" cuối năm học và quản lý năm học để Giai đoạn 4.
- Supersedes: None
- Why: Lên khối tự động kéo theo quản lý năm học + chốt dữ liệu — đúng là nội dung GĐ4 theo lộ trình tài liệu. Chuyển lớp thủ công đủ đáp ứng điều chỉnh giữa năm.
- Cost-if-wrong: Nếu khách hàng kỳ vọng "lên khối" ngay ở MVP, cần vòng bổ sung sau khi đã có quản lý năm học; rủi ro thấp vì chuyển lớp thủ công vẫn làm được lên khối theo cách tay.

### [D-07] Năm học là thuộc tính đơn giản
- Timestamp: 2026-11-04T16:50:00Z
- Door Type: Two-Way (có thể nâng cấp thành thực thể khi tới GĐ4)
- Context: overview 1.md mục 5 — PhanCongGiaoVien "kèm vai trò và năm học"
- Decided: Năm học là trường dữ liệu trên Lớp và trên phân công giáo viên (chuỗi dạng "2025-2026"), ghi khi tạo. Không có thực thể/danh mục năm học trong MVP; lọc danh sách theo giá trị năm học.
- Supersedes: None
- Why: Quản lý niên khóa (chốt dữ liệu, chuyển khối) đã hoãn sang GĐ4 (D-06); thực thể riêng lúc này là dư thừa. Nâng cấp sau là Two-Way door chi phí thấp.
- Cost-if-wrong: Dữ liệu năm học nhập tay có thể không đồng nhất (định dạng); giảm thiểu bằng dropdown/validation, chấp nhận được trong MVP.

### [D-08] Ngưỡng "gần đầy" = 28/30
- Timestamp: 2026-11-04T16:50:00Z
- Door Type: Two-Way (hằng số cấu hình dễ đổi)
- Context: overview 1.md mục 3.4 — cảnh báo "lớp gần đầy/đã đầy"
- Decided: Lớp có sĩ số 28–29/30 hiển thị cảnh báo "gần đầy"; đủ 30 hiển thị "đã đầy". Ngưỡng là hằng số cấu hình, không hardcode rải rác.
- Supersedes: None
- Why: Chuẩn mực vận hành mầm non, cho trường thời gian tuyển sinh bù; Two-Way door — đổi một hằng số là xong.
- Cost-if-wrong: Gần như không có; cùng lắm dashboard ồn hơn hoặc im hơn mong muốn.

### [D-09] Độ tuổi lệch khối: cảnh báo, không chặn
- Timestamp: 2026-11-04T16:50:00Z
- Door Type: One-Way (hành vi xếp lớp)
- Context: overview 1.md mục 3.3 — "Xếp học sinh vào lớp phù hợp với khối tuổi"
- Decided: Khi xếp HS vào lớp không khớp độ tuổi khối (Mầm 3-4 / Chồi 4-5 / Lá 5-6 theo năm sinh), hệ thống hiển thị cảnh báo nhưng vẫn cho phép xếp. Sĩ số 30 vẫn là chặn cứng.
- Supersedes: None
- Why: Thực tế mầm non có ngoại lệ (trẻ sinh sát ranh giới, yêu cầu phụ huynh); chặn cứng gây kẹt vận hành trong khi không có rủi ro an toàn.
- Cost-if-wrong: Nếu khách hàng muốn chặn cứng, chỉ cần thắt thêm guard tại xếp lớp — chi phí thấp.

## Convention rulings (Two-Way door, không cần hỏi — BA áp chuẩn)

- **RULING-C1** Xếp lớp khi còn 1 chỗ trống và 2 người cùng thao tác: kiểm tra sĩ số tại thời điểm lưu trong cùng giao dịch; người đến sau nhận lỗi "lớp đã đủ 30". (Dev dùng transaction/guard — không phải câu hỏi business.)
- **RULING-C2** UI states màn danh sách: loading / empty / error tuân theo chuẩn MudBlazor hiện có; không có yêu cầu riêng trong MVP.
- **RULING-C3** Tìm kiếm & lọc: danh sách GV lọc theo trạng thái, lớp, khối; danh sách HS lọc theo lớp, khối, trạng thái — theo đúng mục 3.2/3.3 của tài liệu, không thêm tiêu chí mới.
