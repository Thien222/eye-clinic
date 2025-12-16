# 🏥 PHÒNG KHÁM MẮT PRO MANAGER

## 🚀 KHỞI ĐỘNG NHANH

### Cách sử dụng đơn giản:

**Double-click vào file:** `start.bat`

✅ Xong! Server tự động khởi động và mở trình duyệt.

---

## 📁 CẤU TRÚC FILES

```
release/
├── start.bat                  ← ★ CHẠY FILE NÀY
├── HUONG_DAN_SU_DUNG.txt      ← Hướng dẫn chi tiết
├── server.js                  ← Server backend
├── database.json              ← Dữ liệu (tự động tạo)
├── bin/                       ← Node.js portable (đã tích hợp)
└── public/                    ← Giao diện web
```

---

## 🔧 YÊU CẦU HỆ THỐNG

- **Hệ điều hành:** Windows 10/11
- **RAM:** Tối thiểu 4GB
- **Trình duyệt:** Chrome, Edge, hoặc Firefox

**Lưu ý:** Không cần cài Node.js, đã tích hợp sẵn trong folder `bin/`

---

## 💡 SỬ DỤNG HÀNG NGÀY

### MÁY CHÍNH:

**Mở ứng dụng:**
- Double-click: `start.bat`
- Chờ trình duyệt tự động mở
- ✅ Bắt đầu làm việc!

**Đóng ứng dụng:**
- Đóng cửa sổ màn hình đen (Server)
- Hoặc nhấn `Ctrl+C` trong cửa sổ Server

### MÁY PHỤ (Kết nối qua mạng LAN):

**Bước 1: Lấy địa chỉ từ máy chính**
- Nhìn vào cửa sổ Server, tìm dòng:
  ```
  Network: http://192.168.x.x:3001
  ```
- Ghi nhớ địa chỉ này!

**Bước 2: Kết nối từ máy phụ**
- Mở trình duyệt
- Gõ địa chỉ Network (ví dụ: `http://192.168.1.100:3001`)
- ✅ Xong!

⚠️ **Quan trọng:** Tất cả máy phải cùng mạng WiFi/LAN!

---

## 🆘 XỬ LÝ LỖI

### Lỗi: "Port 3001 đang được sử dụng"
1. Đóng cửa sổ Server
2. Mở Task Manager (Ctrl+Shift+Esc)
3. Tìm "node.exe" → End Task
4. Chạy lại `start.bat`

### Lỗi: Máy phụ không kết nối được
1. Kiểm tra cùng WiFi/LAN
2. Kiểm tra địa chỉ IP đúng
3. Tạm tắt Firewall để test
4. Ping máy chính: `ping 192.168.x.x`

### Lỗi: Dữ liệu không đồng bộ
1. Đóng Server
2. Chạy lại `start.bat`
3. Đợi vài giây để đồng bộ

---

## 📦 TÍNH NĂNG MỚI (v1.1.0)

✨ **Nút chuyển bệnh nhân giữa 2 phòng**
- Khúc xạ ↔ Khám mắt

✨ **Sửa lỗi input tự nhảy khi nhập**
- Giờ nhập liên tục được: "12", "-2.5", etc.

✨ **Cải thiện kết nối nhiều máy**
- Auto-sync mỗi 5 giây

---

**Phiên bản:** 1.1.0  
**Ngày cập nhật:** 10/12/2025
