# EyeClinic Pro — Design System (MASTER)

Nguồn chuẩn duy nhất cho giao diện. Mọi màn hình phải dùng các token/component dưới đây,
**không** tự chế màu, bo góc, cỡ nút, kiểu tab riêng.

**Sản phẩm:** phần mềm quản lý phòng khám mắt (tiếp tân → khúc xạ → khám → thu ngân → thống kê), dùng trên PC/laptop ở quầy, đôi khi tablet.
**Phong cách:** Clean clinical / data-dense dashboard. Phẳng, sáng, khoảng trắng có chủ đích, 1 màu thương hiệu (teal), màu ngữ nghĩa tiết chế.

## 1. Màu

| Vai trò | Tailwind | Dùng cho |
|---|---|---|
| Primary | `brand-600` (#0d9488), hover `brand-700` | Nút chính, tab/nav đang chọn, link, focus ring |
| Primary nhạt | `brand-50` / `brand-100` | Nền mục đang chọn, nền icon |
| Nền app | `slate-50` | Nền trang |
| Bề mặt | `white` + viền `slate-200` | Thẻ, modal, bảng |
| Bề mặt phụ | `slate-50` + viền `slate-200` (`.subtle-panel`) | Nhóm trường trong thẻ, ô thông tin |
| Chữ chính | `slate-900` | Tiêu đề, số liệu |
| Chữ phụ | `slate-600` / `slate-700` | Nội dung, nhãn |
| Chữ mờ | `slate-500` | Chú thích, header bảng (không nhạt hơn slate-400 cho chữ cần đọc) |
| Thành công | `emerald-600` / nền `emerald-50` | Hoàn thành, đã kết nối, tiền thu |
| Cảnh báo | `amber-600` / nền `amber-50` | Chờ, lưu ý |
| Nguy hiểm | `red-600` / nền `red-50` | Xóa, lỗi |
| Thông tin | `sky-600` / nền `sky-50` | Đang xử lý phụ, gợi ý |

**Màu nghiệp vụ cố định (giống nhau mọi nơi):**
- **Gọng kính = amber** (`Badge tone="frame"`, nền `amber-50`, chữ/icon `amber-700`)
- **Tròng kính = sky** (`Badge tone="lens"`, nền `sky-50`, chữ/icon `sky-700`)
- Mắt phải (OD) / Mắt trái (OS): không tô màu khác nhau, chỉ dùng nhãn chữ.

**Trạng thái bệnh nhân:** dùng `getPatientStatus(status).tone` với `<Badge tone=...>` (chờ = warning, đang xử lý = brand, chờ thanh toán = info, hoàn thành = success).

**Cấm:** gradient tím/hồng, neon, màu tùy hứng (purple, pink, indigo, violet, orange, yellow, green, blue, teal thô, cyan...) cho khối/nút/badge. Chỉ dùng: `brand`, `slate`, `emerald`, `amber`, `red`, `sky`. Không dùng `gray-*` — dùng `slate-*`. Gradient chỉ cho logo.

## 2. Chữ

- Font: Plus Jakarta Sans.
- Tiêu đề trang: `PageHeader` (text-2xl bold slate-900).
- Tiêu đề khu vực/thẻ: `.section-title` (text-base semibold) hoặc `Card title=...`.
- Nhãn trường: `.clinic-label` (text-sm medium slate-700). Chú thích: `.clinic-help` (text-xs slate-500).
- Nội dung: text-sm. Không dùng chữ < 12px (`text-[10px]`, `text-[9px]`) trên màn hình (bản in thì được).
- Số tiền / số liệu: `tabular-nums`, căn phải trong bảng.

## 3. Khoảng cách & bố cục (lưới 4/8px)

- Trang: `space-y-6` giữa các khối; lưới thẻ `gap-6` (ô số liệu `gap-4`).
- Padding thẻ: `p-5` (thẻ làm việc lớn `p-6`). Header thẻ: `.card-header`.
- Form: `gap-4` giữa các trường; nhóm trường bằng `.subtle-panel p-4`.
- Màn hình 2 cột (danh sách + chi tiết): cột trái `w-80 shrink-0`, cột phải `flex-1 min-w-0`, `gap-6`.
- Trang báo cáo (tổng quan, thống kê, cài đặt, lịch sử): `max-w-7xl mx-auto`. Màn hình làm việc (tiếp tân, khúc xạ, khám, thu ngân): full chiều rộng.

## 4. Bo góc & bóng

- Thẻ: `.clinic-card` (16px). Modal: `rounded-2xl`.
- Khối con trong thẻ: `rounded-lg` / `rounded-xl`.
- Nút, ô nhập: `rounded-lg`. Badge: `rounded-full`.
- Bóng: thẻ qua `.clinic-card`, modal `shadow-2xl`. Không tự chế bóng khác.

## 5. Component (`components/ui`, có `index.ts`)

| Component | Khi nào dùng |
|---|---|
| `PageHeader title subtitle icon actions` | Đầu MỌI trang |
| `Card title icon actions padding` / `.clinic-card` | Mọi khối nội dung |
| `Button variant size icon` | Mọi nút có chữ. `primary` = 1 hành động chính/màn hình; `outline` = phụ; `secondary`/`ghost` = ít quan trọng; `danger` = xóa (viền đỏ), `danger-solid` = xác nhận xóa. Size: md h-10 (mặc định), sm h-8, lg h-11 |
| `IconButton icon label tone` | Nút chỉ có icon (sửa/xóa/in/đóng). Luôn có `label`. Xóa dùng `tone="danger"` |
| `Badge tone dot` | Trạng thái, loại (frame/lens), nhãn nhỏ |
| `Tabs items value onChange` | Chuyển phần trong trang (gạch chân) |
| `Segmented items value onChange` | Chọn chế độ / bộ lọc |
| `Field label required help error` + `.clinic-input` | Mọi trường form. input/select/textarea đều dùng `.clinic-input` (h-10); ô nhỏ trong bảng/lưới `.clinic-input clinic-input-sm` |
| `Modal open onClose title footer size` | Mọi hộp thoại |
| `EmptyState icon title description` | Danh sách/bảng trống, chưa chọn mục |
| `StatCard` | Ô số liệu |
| `SearchInput` | Ô tìm kiếm |
| `.table-wrap` + `.clinic-table` (+ `td.num`/`th.num`) | Mọi bảng dữ liệu |
| `AlertBanner tone icon` | Thông báo trong trang |

## 6. Tương tác & truy cập

- Phần tử bấm được: `cursor-pointer`, hover rõ, focus ring (có sẵn trong component).
- Không làm dịch chuyển layout khi hover (không translate/scale thẻ).
- Chuyển động 150–200ms; `prefers-reduced-motion` đã xử lý global.
- Icon: chỉ Lucide; cỡ 16 (nút sm/badge), 18 (nút/tiêu đề), 20–22 (ô số liệu). Không emoji làm icon.
- Tương phản chữ ≥ 4.5:1.
- Lỗi form ngay dưới trường (`Field error`) + viền đỏ (`.clinic-input.is-invalid`).

## 7. Không đụng tới

- Bản in (`InvoicePrint`, `RefractionPrintSheet`, mọi khối `.print-area`, `.invoice-print`, style inline của bản in).
- Logic nghiệp vụ, state, handler, dữ liệu, văn bản nghiệp vụ, `window.print()` flow.
