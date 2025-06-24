# Hệ thống Quản lý Mượn Đồ Dùng CLB - Backend

Đây là phần backend cho "Hệ thống Quản lý Mượn Đồ Dùng CLB", được xây dựng để hỗ trợ sinh viên và các câu lạc bộ trong việc quản lý và theo dõi việc mượn trả thiết bị một cách hiệu quả và minh bạch.

## Tính năng chính

*   **Xác thực Người dùng:** Đăng nhập/Đăng ký tài khoản an toàn cho sinh viên và quản trị viên.
*   **Quản lý Thiết bị (CRUD cho Admin):** Admin có thể thêm, xem, sửa, xóa thông tin thiết bị, bao gồm tên, mô tả, tổng số lượng, số lượng khả dụng, trạng thái (`available`, `maintenance`, `broken`, `unavailable`), và hình ảnh.
*   **Quản lý Yêu cầu Mượn:**
    *   **Sinh viên:** Xem danh sách thiết bị, gửi yêu cầu mượn (chọn thiết bị, số lượng, ngày mượn-trả dự kiến, ghi chú), xem lịch sử mượn, hủy yêu cầu đang chờ.
    *   **Admin:** Xem tất cả yêu cầu, duyệt/từ chối yêu cầu (gửi email thông báo), xác nhận sinh viên đã lấy thiết bị (cập nhật kho), xác nhận sinh viên đã trả thiết bị (cập nhật kho và trạng thái thiết bị).
*   **Hệ thống Thông báo Email:**
    *   Thông báo cho sinh viên khi yêu cầu được duyệt/từ chối.
    *   Nhắc nhở sinh viên khi thiết bị sắp đến hạn trả.
    *   Cảnh báo sinh viên (và có thể cả admin) khi thiết bị đã quá hạn trả.
    *   Xác nhận khi thiết bị đã được trả thành công.
*   **Giới hạn Mượn:**
    *   Giới hạn số lượng của một loại thiết bị cụ thể mà một người dùng có thể mượn cùng lúc.
    *   Giới hạn tổng số lượng thiết bị mà một người dùng có thể mượn cùng lúc.
*   **Thống kê (Admin):** Xem báo cáo về các thiết bị được mượn nhiều nhất trong tháng/năm.
*   **Thông tin Profile User:** Cho phép người dùng xem và cập nhật thông tin cá nhân cơ bản (tên, số điện thoại, avatar).

## Công nghệ sử dụng

*   **Nền tảng:** Node.js
*   **Framework Web:** Express.js
*   **Cơ sở dữ liệu chính:** MongoDB (với Mongoose ODM)
*   **Xác thực:** JSON Web Tokens (JWT)
*   **Mã hóa mật khẩu:** bcryptjs
*   **Gửi Email:** Nodemailer
*   **Lập lịch công việc (Cron Job):** node-schedule
*   **Biến môi trường:** dotenv
*   **Xử lý CORS:** cors
*   **(Công cụ phát triển):** Nodemon

## API Server Trực Tuyến  

Backend của ứng dụng này hiện đang được triển khai và hoạt động tại:

**`https://second-hand-club.onrender.com`**  

## Trải nghiệm Ứng dụng 

Bạn có thể trải nghiệm trực tiếp ứng dụng tại:

*   **Link Frontend:** [https://quan-ly-do-cu-user.onrender.com/] (Trang User)
*   **Link Frontend:** [https://quan-ly-do-cu-admin.onrender.com/] (Trang Admin)
*   **Tài khoản Demo:**
    *   👩‍🎓Student: `hoanvu2k5@gmail.com` / `Hoanvu@1234`
    *   👨‍💼Admin: `admin.new@test.com` / `adminpassword`

## Cài đặt và Chạy dự án (Hướng dẫn cho Local Development)

1.  **Clone repository:**
    ```bash
    git clone https://github.com/mhoanbedev/second_hand_club.git
    cd club-equipment-management
    ```
2.  **Cài đặt dependencies:**
    ```bash
    npm install
    ```
3.  **Cấu hình môi trường:**
    *   Tạo file `.env` ở thư mục gốc của dự án.
    *   Nội dung từ file `.env` và thêm:
        ```ini
        PORT=5001 # Hoặc port bạn muốn
        MONGO_URI=mongodb://localhost:27017/clubEquipmentDB # MongoDB Compass sẽ tự tạo database 'clubEquipmentDB' nếu chưa có.
        JWT_SECRET=YOUR_VERY_STRONG_AND_UNIQUE_JWT_SECRET_KEY # <--- QUAN TRỌNG: Tự tạo chuỗi bảo mật riêng!
        NODE_ENV=development # Hoặc production khi deploy

        # Cấu hình Email (Ví dụ với Gmail)
        EMAIL_HOST=smtp.gmail.com
        EMAIL_PORT=587 # hoặc 465 nếu dùng SSL
        EMAIL_USER=your-actual-email@gmail.com  # <--- Email dùng để gửi
        EMAIL_PASS=your-gmail-app-password-if-2fa-enabled # <--- Nếu Gmail có 2FA, hãy tạo mật khẩu ứng dụng
        EMAIL_FROM_NAME="Ban Quản Lý Thiết Bị CLB" # Tên hiển thị khi gửi mail
        EMAIL_FROM_ADDRESS=your-actual-email@gmail.com # <--- Email hiển thị ở trường "From", nên giống EMAIL_USER
        ```
     *   **QUAN TRỌNG:** Đảm bảo bạn đã thay thế các giá trị placeholder bằng thông tin thực tế của bạn. **Không bao giờ commit file `.env` thật lên GitHub.**
4.  **Đảm bảo MongoDB Server đang chạy** trên máy của bạn hoặc có thể truy cập được.
5.  **Khởi chạy Backend Server:**
    *   Chế độ development (tự động reload):
        ```bash
        npm run dev
        ```
    *   Chế độ production:
        ```bash
        npm start
        ```
    Server sẽ chạy trên cổng được định nghĩa trong `PORT`.

## Triển khai (Deployment)

Ứng dụng backend này đã được triển khai trên các nền tảng Render:
*   **Nền tảng Hosting Backend:** Render (Free Tier)
*   **API Base URL (Ví dụ):** `https://second-hand-club.onrender.com`
*   **Cơ sở dữ liệu chính:** MongoDB Atlas (M0 Free Tier)
*   **Phiên bản Node.js trên Server (Render):** 20.19.0 

## API Endpoints (Một số API chính)

Sử dụng Base URL sau để kiểm tra : https://second-hand-club.onrender.com

*   **Xác thực & Người dùng (`/api/users`):**
    *   `POST /register`: Đăng ký người dùng mới.
    *   `POST /login`: Đăng nhập.
    *   `GET /me`: Lấy thông tin người dùng hiện tại (cần token).
    *   `PUT /profile`: Cập nhật thông tin profile (cần token).
*   **Thiết bị (`/api/equipment`):**
    *   `POST /`: (Admin) Tạo thiết bị mới.
    *   `GET /`: Lấy danh sách tất cả thiết bị.
    *   `GET /:id`: Lấy chi tiết một thiết bị.
    *   `PUT /:id`: (Admin) Cập nhật một thiết bị.
    *   `DELETE /:id`: (Admin) Xóa một thiết bị.
    *   `GET /stats/most-borrowed`: (Admin) Thống kê thiết bị mượn nhiều.
*   **Yêu cầu Mượn (`/api/borrow`):**
    *   `POST /`: (User) Tạo yêu cầu mượn mới.
    *   `GET /my-history`: (User) Lấy lịch sử mượn của bản thân.
    *   `PUT /cancel/:id`: (User) Hủy yêu cầu (`pending`).
    *   `GET /admin/all`: (Admin) Lấy tất cả yêu cầu.
    *   `GET /admin/:requestId`: (Admin) Lấy chi tiết yêu cầu.
    *   `PUT /admin/manage/:requestId`: (Admin) Duyệt/Từ chối yêu cầu.
    *   `PUT /admin/confirm-borrowed/:requestId`: (Admin) Xác nhận đã cho mượn.
    *   `PUT /admin/confirm-return/:requestId`: (Admin) Xác nhận đã trả.

### Chi tiết một số API quan trọng

#### 1. Tạo Yêu cầu Mượn Mới
*   **Endpoint:** `POST /api/borrow`
*   **Mô tả:** Sinh viên tạo một yêu cầu mượn thiết bị mới.
*   **Xác thực:** Yêu cầu Bearer Token (JWT).
*   **Request Body (application/json):**
    ```json
    {
      "equipmentId": "objectId (Bắt buộc) - ID của thiết bị muốn mượn",
      "quantityBorrowed": "Number (Bắt buộc, >0) - Số lượng muốn mượn",
      "borrowDate": "String (Bắt buộc, dạng YYYY-MM-DD) - Ngày dự kiến mượn",
      "expectedReturnDate": "String (Bắt buộc, dạng YYYY-MM-DD) - Ngày dự kiến trả",
      "notes": "String (Tùy chọn) - Ghi chú thêm"
    }
    ```
*   **Response Thành Công (201 Created):**
    ```json
    // Chi tiết của BorrowRequest vừa tạo, đã populate user và equipment
    {
      "_id": "objectId",
      "user": { "_id": "userId", "username": "...", "email": "...", "phoneNumber": "...", "avatarUrl": "..." },
      "equipment": { "_id": "equipId", "name": "...", "description": "...", "imageUrl": "..." },
      "quantityBorrowed": 1,
      "borrowDate": "DateISOString",
      "expectedReturnDate": "DateISOString",
      "status": "pending",
      // ... các trường khác
    }
    ```
*   **Response Lỗi:**
    *   `400 Bad Request`: Thiếu thông tin, ngày không hợp lệ, vượt quá giới hạn mượn, thiết bị không đủ số lượng/không có sẵn.
    *   `401 Unauthorized`: Token không hợp lệ hoặc không có.
    *   `404 Not Found`: Thiết bị không tìm thấy.

#### 2. Admin Duyệt/Từ chối Yêu cầu
*   **Endpoint:** `PUT /api/borrow/admin/manage/:requestId`
*   **Mô tả:** Admin duyệt hoặc từ chối một yêu cầu mượn đang chờ.
*   **Xác thực:** Yêu cầu Bearer Token (JWT) của Admin.
*   **Request Body (application/json):**
    ```json
    {
      "status": "String (Bắt buộc) - 'approved' hoặc 'rejected'",
      "adminNotes": "String (Tùy chọn) - Ghi chú của admin (ví dụ: lý do từ chối)"
    }
    ```
*   **Response Thành Công (200 OK):**
    ```json
    // Chi tiết của BorrowRequest đã cập nhật trạng thái
    {
      // ... (tương tự response tạo yêu cầu, với status đã đổi)
    }
    ```

## Hướng phát triển tiếp theo

*   Hoàn thiện giao diện người dùng (Frontend).
*   Thêm tính năng tìm kiếm, lọc, sắp xếp nâng cao cho danh sách thiết bị và yêu cầu mượn.
*   Triển khai thông báo real-time (ví dụ: dùng Socket.IO) khi có cập nhật trạng thái yêu cầu.
*   Xây dựng giao diện Admin chi tiết hơn.
*   Tối ưu hóa hiệu suất và bảo mật.
*   Viết Unit Test và Integration Test.

---

## 💡 Thảo luận thêm & Liên hệ

Cảm ơn bạn đã xem xét dự án "Hệ thống Quản lý Mượn Đồ Dùng CLB - Backend". Tôi rất sẵn lòng thảo luận thêm về các khía cạnh kỹ thuật, các quyết định thiết kế, và những bài học kinh nghiệm trong quá trình xây dựng dự án này.

Nếu có bất kỳ câu hỏi hoặc góp ý nào, xin vui lòng liên hệ:

*   **Tên:** Vũ Minh Hoàn
*   **Email:** `Hoanvu2k5@gmail.com`
*   **Facebook:** `https://www.facebook.com/Hoannidalee`

Trân trọng,
Vũ Minh Hoàn.
