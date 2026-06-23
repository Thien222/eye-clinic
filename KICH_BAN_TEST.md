# Kịch bản test đầy đủ — Eye Clinic Pro Manager

> **Cập nhật:** Dữ liệu mẫu tự động theo **ngày hôm nay** khi chạy `node scripts/generateTestData.js`

---

## Chuẩn bị (5 phút)

### Bước 1 — Tạo dữ liệu hôm nay
```bash
cd EyeClinic
node scripts/generateTestData.js
```

### Bước 2 — Khởi động app
```bash
npm run dev
```
Mở: http://localhost:5173 (dev) hoặc chạy `release/start.bat`

### Bước 3 — Nạp dữ liệu test
1. Vào **Cài đặt** → tab **Sao lưu**
2. Bấm **Nạp dữ liệu TEST** → Xác nhận → F5

**Hoặc terminal (server đang chạy):**
```bash
node scripts/loadTestData.js
```

---

## Dữ liệu mẫu hôm nay

| STT | Tên BN | Trạng thái | Mục đích |
|-----|--------|------------|----------|
| 1 | Nguyễn Văn An — Chờ đo KX | Chờ khúc xạ | Tiếp tân, xóa BN |
| 2 | Trần Thị Bình — Đang đo | Đang đo | Lưu & chuyển TT |
| 3 | Lê Văn Cường — Chờ khám mắt | Chờ khám | Phòng bác sĩ |
| 4 | Phạm Thị Dung — Chờ thanh toán | Chờ TT | **OD/OS khác độ** |
| 5 | Hoàng Văn Em — Chờ TT cùng độ | Chờ TT | **Cặp tròng cùng giá** |
| 6 | Võ Thị Phương — Đã hoàn thành | Xong | Lịch sử, thống kê, in phiếu KX |
| 7–8 | CŨ — Hôm qua | Chờ (hôm qua) | **Không hiện hôm nay** |

**Kho:** 9 SP (tròng cặp 280k, tròng khác giá, gọng, thuốc)  
**Hóa đơn:** 2 (1 hôm nay + 1 hôm qua)

---

## Kịch bản chi tiết

### TC-01: Lọc theo ngày (Tiếp tân)
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | Vào **Tiếp tân** | Thấy **6 BN hôm nay**, không thấy "CŨ — Hôm qua" |
| 2 | Bật **Tất cả** | Thấy thêm 2 BN hôm qua |
| 3 | Tắt **Tất cả** | Chỉ BN hôm nay |

### TC-02: Xóa BN ở Khúc xạ
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | **Đo khúc xạ** → Chờ đo → chọn Nguyễn Văn An | |
| 2 | Bấm **thùng rác** → Xác nhận | BN biến mất |
| 3 | F5 | BN **không hiện lại** |

### TC-03: Khúc xạ — Lưu & in phiếu (mẫu cũ A5)
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | Chọn **Trần Thị Bình — Đang đo** | Form khúc xạ mở |
| 2 | Nhập OD: -2.00, OS: -1.50 | |
| 3 | Bấm **In Phiếu Khúc Xạ** | Mẫu **print-a5**: bảng có cột **Độ cầu (SPH)**, **Độ loạn (CYL)**, header 2 cột trái/phải |
| 4 | So sánh với **Lịch sử** → In phiếu Võ Thị Phương | **Cùng một mẫu** (không khác layout) |

### TC-04: Thu ngân — OD/OS chọn RIÊNG
**BN:** Phạm Thị Dung (OD -2.00, OS -1.50)

| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | **Thu ngân** → chọn BN | Gợi ý OD và OS **tách riêng** |
| 2 | Bấm **+** ở OS | Chỉ OS tăng, OD **không đổi** |
| 3 | Bấm **+** ở OD | Chỉ OD tăng |
| 4 | Giỏ hàng | 2 dòng: `...(OD)` và `...(OS)` |

### TC-05: Thu ngân — Cặp tròng cùng giá
**BN:** Hoàng Văn Em (cùng độ -2.00)

| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | Chọn BN | Thấy **Cặp tròng 2 mắt (cùng mã, cùng giá)** |
| 2 | Thấy nhóm **280.000 đ** | Chemi U2 Cặp A/B |
| 3 | Bấm **+ Thêm cặp 2 mắt** | Giỏ có OD + OS |
| 4 | Bấm **+** OD riêng | Chỉ OD tăng |

### TC-06: Cài đặt → Phiếu chờ & Phiếu KX cập nhật ⭐
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | **Cài đặt** → Thông tin chung | Sửa tên PK thành `PHÒNG KHÁM MẮT TEST thiện` |
| 2 | Sửa Bác sĩ thành `BSCKII. Hứa Trung Kiên` | |
| 3 | Bấm **Lưu Cài Đặt** | Thông báo lưu OK |
| 4 | **Tiếp tân** → Thêm BN mới → In phiếu STT | Tiêu đề = tên PK **vừa sửa**, BS = tên **vừa sửa** |
| 5 | **Đo khúc xạ** → In phiếu | Header trái/phải hiện tên PK mới |
| 6 | **Lịch sử** → In phiếu Võ Thị Phương | Cùng header mới |

> **Lưu ý:** Sau khi Lưu, phiếu STT tự đồng bộ từ Thông tin chung. Muốn ghi chú riêng → sửa tab **Phiếu STT**.

### TC-07: Thống kê & Excel
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | **Thống kê** → Tháng | 4 thẻ trên **đọc rõ** (không mờ) |
| 2 | **Xuất Excel** | File `.xlsx` 4 sheet có dấu: Khúc xạ, Hóa đơn, Tròng kính, Gọng kính |

### TC-08: Đồng bộ — BN xóa không quay lại
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | Xóa BN ở Tiếp tân | BN mất |
| 2 | F5 / tab máy khác | BN không hiện lại |

### TC-09: Kết thúc ngày (EOD)
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | Nạp data (có BN hôm qua) → F5 | BN "CŨ" **không** ở hàng chờ hôm nay |
| 2 | Bật **Tất cả** ở Tiếp tân | BN hôm qua → trạng thái **Hoàn thành** |

### TC-10: Kho & Thu ngân — Tiếng Việt có dấu
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | **Thu ngân** → Quản lý kho → **Nhập mới** | Modal: Thêm hàng hóa, Tròng kính, Giá nhập… **có dấu** |
| 2 | Tab Tròng/Gọng/Thuốc | Tất cả nhãn có dấu |

### TC-11: Cảnh báo mạng
| # | Thao tác | Kết quả mong đợi |
|---|----------|------------------|
| 1 | Tắt server (`Ctrl+C` terminal server) | Banner vàng/đỏ **Mất kết nối** |
| 2 | Bật lại server | Banner biến mất |

---

## Smoke test 10 phút (checklist)

```
□ node scripts/generateTestData.js
□ npm run dev
□ Cài đặt → Nạp dữ liệu TEST → F5
□ Tiếp tân: 6 BN hôm nay
□ Khúc xạ: xóa 1 BN → F5 → không hiện lại
□ Khúc xạ: in phiếu → mẫu A5 bảng Độ cầu/Độ loạn
□ Cài đặt: đổi tên PK → Lưu → in phiếu STT → đúng tên mới
□ Thu ngân: Phạm Thị Dung → tăng OS, OD không đổi
□ Thu ngân: Hoàng Văn Em → cặp tròng cùng giá
□ Thống kê: chữ thẻ tổng quan đọc rõ + Xuất Excel
□ Lịch sử: in phiếu Võ Thị Phương = cùng mẫu Khúc xạ
```

---

## Ghi chú

- Chạy lại `generateTestData.js` mỗi ngày test để timestamp = **hôm nay**
- Không dùng `seedData.js` cũ (100 BN ảo)
- Backup trước khi nạp test: `data/database.json` hoặc nút Sao lưu
