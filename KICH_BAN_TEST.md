# Kịch bản test - Eye Clinic Pro Manager

## Chuẩn bị

### Bước 1: Tạo dữ liệu mẫu
```bash
cd EyeClinic
node scripts/generateTestData.js
```

### Bước 2: Khởi động app
```bash
npm run dev
```
Mở: http://localhost:3000 (dev) hoặc http://localhost:3001 (release)

### Bước 3: Nạp dữ liệu test (chọn 1 cách)

**Cách A – Nút trong app (khuyên dùng):**
1. Vào **Cài đặt** → tab **Sao lưu**
2. Bấm nút xanh **Nạp dữ liệu TEST**
3. Xác nhận → trang tự tải lại

**Cách B – Khôi phục file:**
1. **Cài đặt** → **Sao lưu** → **Khôi phục dữ liệu**
2. Chọn file `data/test-data.json`

**Cách C – Terminal (server đang chạy):**
```bash
node scripts/loadTestData.js
```
Sau đó **F5** trình duyệt.

---

## Map lỗi KH báo → Kịch bản test

| Lỗi KH mô tả | Kịch bản test |
|--------------|---------------|
| BN mẫu/ảo hiện lại, xóa rồi quay lại (backup/sync) | **TC-02**, **TC-08** |
| Máy chủ & client không nhất quán | **TC-08** (F5, tab khác) |
| Thiếu nút xóa ở Đo khúc xạ | **TC-02** |
| Gợi ý tròng: tăng OS thì OD cũng tăng | **TC-04**, **TC-05** (bước 5) |
| Gợi ý tròng cùng giá 2 mắt | **TC-05** |
| Mạng chập chờn – cảnh báo | Mở app → tắt server → xem banner vàng/đỏ trên đầu |
| Kết thúc ngày, BN cũ không hiện hôm sau | **TC-01**, **TC-09** |
| Cài đặt in không ra đúng | **TC-06** |
| Thống kê / Lịch sử in & Excel | **TC-07**, **TC-10** |
| Lịch sử BN nhiều – load chậm | **TC-10** (phân trang) |

---

## Danh sách dữ liệu mẫu

| STT | Tên BN | Trạng thái | Mục đích test |
|-----|--------|------------|---------------|
| 1 | Nguyen Van An - Cho do KX | Chờ đo khúc xạ | Tiếp tân, Khúc xạ chờ |
| 2 | Tran Thi Binh - Dang do | Đang đo | Khúc xạ đang đo |
| 3 | Le Van Cuong - Cho kham mat | Chờ khám | Khám mắt |
| 4 | Pham Thi Dung - Cho thanh toan | Chờ TT | Thu ngân – **2 mắt KHÁC độ** |
| 5 | Hoang Van Em - Cho thanh toan CUNG do | Chờ TT | Thu ngân – **2 mắt CÙNG độ** |
| 6 | Vo Thi Phuong - Da hoan thanh | Hoàn thành | Lịch sử, thống kê |
| 7 | CU - Hom qua cho do | Chờ đo (hôm qua) | **Không hiện hôm nay** |
| 8 | CU - Hom qua cho thanh toan | Chờ TT (hôm qua) | Auto hoàn thành EOD |

**Kho hàng:** 9 sản phẩm (tròng cặp cùng giá 280k, tròng khác giá, gọng, thuốc)

---

## Kịch bản test chi tiết

### TC-01: Lọc theo ngày (Tiếp tân)
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Vào **Tiếp tân** | Chỉ thấy BN **hôm nay** (6 BN), không thấy "CU - Hom qua" |
| 2 | Bật **Tất cả** | Thấy thêm 2 BN hôm qua |
| 3 | Tắt **Tất cả** | Quay lại chỉ BN hôm nay |

### TC-02: Nút xóa – Đo khúc xạ
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Vào **Đo khúc xạ** → tab Chờ đo | Thấy "Nguyen Van An" |
| 2 | Bấm icon **thùng rác** trên BN | Xác nhận → BN biến mất |
| 3 | F5 trang | BN **không hiện lại** |

### TC-03: Khúc xạ – Lưu & chuyển
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Chọn "Tran Thi Binh - Dang do" | Form khúc xạ mở |
| 2 | Nhập OD: SPH -2.00, OS: SPH -1.50 | |
| 3 | Bấm **Lưu & Chuyển Hóa Đơn** | BN sang Thu ngân |

### TC-04: Thu ngân – OD/OS chọn RIÊNG (quan trọng)
**BN:** Pham Thi Dung (2 mắt khác độ: OD -2.00, OS -1.50)

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Vào **Thu ngân** → chọn BN | Thấy gợi ý OD và OS **tách riêng** |
| 2 | Ở mục **Tròng mắt trái (OS)** bấm **+** | Chỉ OS tăng, **OD không đổi** |
| 3 | Ở mục **Tròng mắt phải (OD)** bấm **+** | Chỉ OD tăng, **OS không đổi** |
| 4 | Kiểm tra giỏ hàng | 2 dòng riêng: `... (OD)` và `... (OS)` |

### TC-05: Thu ngân – Gợi ý cùng giá & cặp 2 mắt
**BN:** Hoang Van Em (2 mắt cùng độ -2.00)

| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Chọn BN | Thấy nhóm **Cặp tròng 2 mắt (cùng mã, cùng giá)** |
| 2 | Thấy nhóm giá **280.000 đ** | Chemi U2 Cap A/B cùng giá |
| 3 | Thấy nhóm giá **150.000 đ** và **650.000 đ** | Tròng cùng độ nhưng khác giá |
| 4 | Bấm **+ Thêm cặp 2 mắt (OD+OS)** | Giỏ có 2 tròng (1 OD + 1 OS) |
| 5 | Bấm **+** ở OD riêng | **Chỉ OD** tăng, OS không đổi |

### TC-06: Cài đặt & In
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | **Cài đặt** → Thông tin chung | Thấy "PHONG KHAM MAT TEST" |
| 2 | Sửa tiêu đề phiếu STT → **Lưu Cài Đặt** | Thông báo lưu OK |
| 3 | **Tiếp tân** → In phiếu BN mới | In ra tiêu đề **vừa sửa** |
| 4 | **Đo khúc xạ** → In phiếu | Header "PHONG KHAM MAT TEST" |
| 5 | **Thu ngân** → Thanh toán → In HĐ | Tiêu đề "HOA DON TEST" |

### TC-07: Thống kê – Xuất Excel
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Vào **Thống kê** → chọn **Tháng** | Có số liệu |
| 2 | Bấm **Xuất Excel** | Tải file `.xlsx` |
| 3 | Mở file Excel | 4 sheet: `Khuc xa`, `Hoa don`, `Trong kinh`, `Gong kinh` |

### TC-08: Đồng bộ / Dữ liệu cũ không quay lại
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Xóa 1 BN ở Tiếp tân | BN mất |
| 2 | F5 hoặc mở tab máy khác cùng mạng | BN **không hiện lại** |
| 3 | Khôi phục backup cũ (nếu test) | Chỉ khi chủ động restore |

### TC-09: Kết thúc ngày (EOD)
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Sau khi nạp data có BN hôm qua chưa xong | |
| 2 | F5 trang (hoặc mở app ngày mới) | BN "CU - Hom qua" **không** ở hàng chờ |
| 3 | Kiểm tra trạng thái BN hôm qua (bật Tất cả) | Đã chuyển **Hoàn thành** |

### TC-10: Lịch sử & phân trang
| Bước | Thao tác | Kết quả mong đợi |
|------|----------|------------------|
| 1 | Vào **Lịch sử** → Lịch sử Khúc xạ | Có BN đã đo |
| 2 | Lọc **Hôm nay** / **Tháng này** | Danh sách thay đổi đúng |
| 3 | Bấm **In bảng** | In ra bảng có cột OD/OS |

---

## Test nhanh 5 phút (smoke test)

```
1. npm run dev
2. Cài đặt → Nạp dữ liệu TEST
3. Tiếp tân: đếm BN hôm nay = 6
4. Khúc xạ: xóa 1 BN → F5 → không hiện lại
5. Thu ngân: chọn "Pham Thi Dung" → tăng OS → OD không đổi
6. Thu ngân: chọn "Hoang Van Em" → thấy cặp tròng cùng giá
7. Thống kê → Xuất Excel → mở 4 sheet
```

---

## Ghi chú

- **Không** chạy `scripts/seedData.js` cũ (100 BN mẫu) — dễ gây lỗi BN ảo.
- Trước khi test production: backup `release/database.json` hoặc `data/database.json`.
- Reset về trống: xóa `data/database.json` và restart server.
