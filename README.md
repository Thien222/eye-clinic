# Eye Clinic Pro Manager

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Platform-Windows-green.svg" alt="Platform">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
</p>

> **Phần mềm quản lý phòng khám mắt chuyên nghiệp** - Hỗ trợ đa máy trạm, đồng bộ dữ liệu thời gian thực.

---

##  Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Tính năng](#-tính-năng)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [Hướng dẫn sử dụng](#-hướng-dẫn-sử-dụng)
- [Kết nối máy phụ](#-kết-nối-máy-phụ-qua-mạng-lan)
- [Xử lý sự cố](#-xử-lý-sự-cố)
- [Cập nhật phiên bản](#-cập-nhật-phiên-bản)

---

##  Giới thiệu

**Eye Clinic Pro Manager** là phần mềm quản lý phòng khám mắt toàn diện, được thiết kế để tối ưu hóa quy trình làm việc của các phòng khám nhãn khoa. Phần mềm hỗ trợ:

-  Quản lý bệnh nhân từ tiếp nhận đến thanh toán
-  Đo khúc xạ và khám mắt chuyên sâu
-  Quản lý kho hàng và hóa đơn
-  Đồng bộ dữ liệu đa máy trạm qua mạng LAN

---

##  Tính năng

| Module | Mô tả |
|--------|-------|
| **Tiếp nhận** | Đăng ký bệnh nhân, in phiếu số thứ tự |
|  **Khúc xạ** | Đo thị lực, xác định độ cận/viễn/loạn |
|  **Khám mắt** | Khám tổng quát, ghi chẩn đoán |
|  **Hóa đơn** | Tạo hóa đơn, gợi ý sản phẩm phù hợp |
|  **Kho hàng** | Quản lý tồn kho, nhập xuất hàng |
|  **Báo cáo** | Thống kê doanh thu, lượt khám |

###  Tính năng mới (v1.1.0)

-  Nút chuyển bệnh nhân giữa phòng Khúc xạ ↔ Khám mắt
-  Sửa lỗi input tự nhảy khi nhập liệu
-  Cải thiện kết nối đa máy, auto-sync mỗi 5 giây

---

##  Yêu cầu hệ thống

| Yêu cầu | Chi tiết |
|---------|----------|
| **Hệ điều hành** | Windows 10/11 |
| **RAM** | Tối thiểu 4GB |
| **Trình duyệt** | Chrome, Edge, hoặc Firefox |
| **Mạng** | LAN/WiFi (nếu dùng nhiều máy) |

>  **Không cần cài đặt Node.js** - Đã tích hợp sẵn trong thư mục `release/bin/`

---

##  Hướng dẫn cài đặt

### Bước 1: Tải về

```bash
git clone https://github.com/Thien222/eye-clinic.git
```

Hoặc tải file ZIP từ [Releases](https://github.com/Thien222/eye-clinic/releases)

### Bước 2: Giải nén

Giải nén vào thư mục mong muốn (ví dụ: `D:\PhongKhamMat\`)

### Bước 3: Cấu trúc thư mục

```
release/
├── start.bat                  ←  CHẠY FILE NÀY
├── HUONG_DAN_SU_DUNG.txt      ← Hướng dẫn chi tiết
├── server.js                  ← Server backend
├── database.json              ← Dữ liệu (tự động tạo)
├── bin/                       ← Node.js portable
└── public/                    ← Giao diện web
```

---

##  Hướng dẫn sử dụng

### Khởi động ứng dụng (Máy chính)

```
 Mở thư mục: release/
 Double-click: start.bat
```

 Server tự động khởi động  
 Trình duyệt tự động mở  
 Sẵn sàng sử dụng!

>  **QUAN TRỌNG:** Không tắt cửa sổ màn hình đen (Server đang chạy)

### Tắt ứng dụng

- **Cách 1:** Đóng cửa sổ màn hình đen (Server)
- **Cách 2:** Nhấn `Ctrl + C` trong cửa sổ Server

---

## 🔗 Kết nối máy phụ (Qua mạng LAN)

### Bước 1: Trên MÁY CHÍNH

1. Chạy file `start.bat`
2. Nhìn vào cửa sổ Server, tìm dòng:

```
╔═══════════════════════════════════════════╗
║  Network: http://192.168.x.x:3001         ║
╚═══════════════════════════════════════════╝
```

3. **Ghi nhớ** địa chỉ IP này!

### Bước 2: Trên MÁY PHỤ

1. Mở trình duyệt (Chrome, Edge, Firefox...)
2. Gõ vào thanh địa chỉ:

```
http://192.168.x.x:3001
```

*(Thay `x.x` bằng số IP từ máy chính)*

3. Nhấn Enter →  **Xong!**

###  Lưu ý quan trọng

-  Tất cả máy phải **CÙNG MẠNG WiFi/LAN**
-  Không tắt cửa sổ Server trên máy chính
-  Có thể kết nối **NHIỀU máy phụ** cùng lúc
-  Dữ liệu tự động đồng bộ mỗi 5 giây

---

##  Xử lý sự cố

###  Lỗi: "Port 3001 đang được sử dụng"

```
Giải pháp:
1. Đóng cửa sổ Server (nếu đang chạy)
2. Mở Task Manager (Ctrl+Shift+Esc)
3. Tìm "node.exe" → End Task
4. Chạy lại start.bat
```

###  Lỗi: Máy phụ không kết nối được

```
Kiểm tra:
1. Có cùng mạng WiFi/LAN không?
2. Địa chỉ IP có đúng không?
3. Firewall có đang chặn không?

Test nhanh (trên máy phụ):
> Mở CMD
> Gõ: ping 192.168.x.x
> Nếu có phản hồi = Mạng OK

Nếu vẫn lỗi:
> Tạm tắt Windows Firewall để test
> Nếu OK → Cấu hình Firewall cho phép Node.js
```

###  Lỗi: Dữ liệu không đồng bộ

```
Giải pháp:
1. Tắt tất cả máy phụ
2. Đóng Server trên máy chính
3. Chạy lại start.bat
4. Mở lại máy phụ
```

---

##  Quy trình làm việc hàng ngày

###  Buổi SÁNG (Bắt đầu)

```
1. Bật máy chính
2. Double-click: start.bat
3. Chờ trình duyệt mở
4. Đăng nhập (nếu có)
5. Bắt đầu làm việc!

(Các máy phụ mở http://192.168.x.x:3001)
```

###  Buổi TỐI (Kết thúc)

```
1. Đóng tất cả trình duyệt
2. Đóng cửa sổ Server (màn hình đen)
   hoặc nhấn Ctrl+C trong cửa sổ Server
3. Tắt máy
```

---

##  Cập nhật phiên bản

### Backup dữ liệu

```
 Copy file: release/database.json
 Lưu vào nơi an toàn
```

### Cập nhật

```
1. Tải phiên bản mới
2. Giải nén vào thư mục mới
3. Copy file database.json cũ vào thư mục release/ mới
4. Chạy start.bat
```

---

<p align="center">
  <b> CHÚC BẠN SỬ DỤNG THÀNH CÔNG! </b>
</p>

<p align="center">
  <i>Phiên bản: 1.1.0 | Cập nhật: 16/12/2025</i>
</p>
