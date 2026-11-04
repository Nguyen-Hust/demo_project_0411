# Issue tracker

Issues được quản lý ở **GitHub Issues** của repo `Nguyen-Hust/demo_project_0411` (dùng `gh` CLI).

- `to-tickets` / `to-spec` gọi `gh issue create` để tạo issue.
- Mỗi feature (`work/<slug>/`) liên kết các ticket bằng số issue.
- PA flag: **off** — PR *không* được dùng làm bề mặt tiếp nhận yêu cầu; yêu cầu mới phải qua issue.

## Lệnh tham chiếu

```bash
gh issue list --repo Nguyen-Hust/demo_project_0411
gh issue create --repo Nguyen-Hust/demo_project_0411 --title "..." --body "..."
```
