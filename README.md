# ISO Audit Assistant

## Hướng dẫn cài đặt và chạy (Manual Setup)

Bạn đang ở trong môi trường **GitHub Codespaces** (VS Code trên trình duyệt). Để chạy ứng dụng, bạn cần sử dụng **Terminal**.

### Bước 1: Mở Terminal
Nhìn lên thanh menu phía trên cùng, chọn **Terminal** -> **New Terminal**.
Một cửa sổ dòng lệnh sẽ hiện ra ở phía dưới màn hình.

### Bước 2: Cài đặt thư viện
Gõ lệnh sau vào Terminal và nhấn Enter:
```bash
npm install
```
Chờ một chút để nó tải các thư viện về (bạn sẽ thấy thư mục `node_modules` xuất hiện).

### Bước 3: Cấu hình API Key (Quan trọng)
Ứng dụng cần Key của Google Gemini để hoạt động.
1. Chuột phải vào khoảng trống ở thanh bên trái (nơi hiện danh sách file), chọn **New File**.
2. Đặt tên file là `.env`.
3. Mở file `.env` đó và dán nội dung sau (thay thế bằng Key của bạn):
```env
API_KEY=AIzaSy...KEY_CUA_BAN_O_DAY
```
*Lưu ý: Không chia sẻ file .env này cho người khác.*

### Bước 4: Chạy ứng dụng (Chế độ Test)
Gõ lệnh sau vào Terminal:
```bash
npm run dev
```
Sau khi chạy, bạn sẽ thấy dòng chữ `Local: http://localhost:5173/`. Giữ phím `Ctrl` và click vào link đó để mở web.

### Bước 5: Đưa lên mạng (Deploy/Publish)
Nếu bạn muốn tạo link web để gửi cho người khác:
1. Gõ lệnh build:
```bash
npm run build
```
2. Gõ lệnh deploy:
```bash
npm run deploy
```
Sau đó vào **Settings** của GitHub Repository -> **Pages** để lấy link web.
