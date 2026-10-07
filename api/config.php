<?php
/* ============================================================
   BONSICOLA TOOL - CONFIG DATABASE
   ============================================================
   
   ⚠️ HƯỚNG DẪN SỬA:
   
   Bước 1: Vào cPanel → MySQL® Databases
   Bước 2: Tạo Database mới
           → Hệ thống tạo tên: toolkiemlua_bonsicola
   Bước 3: Tạo User Database
           → Hệ thống tạo tên: toolkiemlua_admin
   Bước 4: Add User To Database → chọn ALL PRIVILEGES
   Bước 5: Điền 4 thông tin vào bên dưới
   
   ============================================================ */

/* ============================================================
   ⚠️ SỬA 4 DÒNG NÀY — THAY BẰNG THÔNG TIN CỦA BẠN
   ============================================================ */

/* DB_HOST: Luôn là 'localhost' */
define('DB_HOST', 'localhost');

/* DB_NAME: Tên database có prefix username cPanel
   VD: 'toolkiemlua_bonsicola' */
define('DB_NAME', 'toolkiemlua_bonsicola');

/* DB_USER: Tên user database có prefix username cPanel
   VD: 'toolkiemlua_admin' */
define('DB_USER', 'toolkiemlua_admin');

/* DB_PASS: Mật khẩu của user database (ĐÃ TẠO TRONG CPANEL)
   ⚠️ PHẢI KHỚP 100% VỚI MẬT KHẨU TRONG CPANEL */
define('DB_PASS', 'Minh@2026Tool');

/* ============================================================
   ⚠️ KHÔNG SỬA TỪ ĐÂY TRỞ XUỐNG
   ============================================================ */

/* Tài khoản admin mặc định */
define('ADMIN_EMAIL', 'leminhdz@gmail.com');
define('ADMIN_PASS', 'admin123');

/* Cấu hình hệ thống */
date_default_timezone_set('Asia/Ho_Chi_Minh');

/* CORS + JSON headers */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

/* Xử lý preflight request */
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* Bật hiển thị lỗi (tắt khi chạy production ổn định) */
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

/* ============================================================
   KIỂM TRA KẾT NỐI DATABASE NGAY KHI LOAD FILE
   ============================================================
   Nếu DB kết nối lỗi → trả về JSON báo lỗi rõ ràng
   ============================================================ */
function checkDatabaseConnection() {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 5
            ]
        );
        return ['ok' => true, 'pdo' => $pdo];
    } catch (PDOException $e) {
        $code = $e->getCode();
        $msg = $e->getMessage();
        
        $hint = '';
        $user_msg = '';
        
        if ($code == 1045) {
            $user_msg = 'Sai mật khẩu hoặc chưa gán quyền cho user database';
            $hint = 'Vào cPanel → MySQL Databases → Change Password cho user "' . DB_USER . '" → Cập nhật DB_PASS trong file này';
        } elseif ($code == 1049) {
            $user_msg = 'Database không tồn tại';
            $hint = 'Vào cPanel → MySQL Databases → Kiểm tra DB "' . DB_NAME . '" đã được tạo chưa';
        } elseif ($code == 1044) {
            $user_msg = 'User chưa được gán quyền vào database';
            $hint = 'Vào cPanel → MySQL Databases → Add User To Database → chọn ALL PRIVILEGES';
        } elseif ($code == 2002) {
            $user_msg = 'Không kết nối được MySQL server';
            $hint = 'Kiểm tra DB_HOST (thường là "localhost")';
        } else {
            $user_msg = 'Lỗi kết nối database';
            $hint = 'Kiểm tra lại DB_HOST, DB_NAME, DB_USER, DB_PASS';
        }
        
        return [
            'ok' => false,
            'error' => $msg,
            'code' => $code,
            'user_msg' => $user_msg,
            'hint' => $hint,
            'config' => [
                'DB_HOST' => DB_HOST,
                'DB_NAME' => DB_NAME,
                'DB_USER' => DB_USER,
                'DB_PASS' => substr(DB_PASS, 0, 3) . '***' . substr(DB_PASS, -2)
            ]
        ];
    }
}

/* ============================================================
   AUTO CHECK KHI TRUY CẬP TRỰC TIẾP FILE NÀY
   ============================================================ */
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    $check = checkDatabaseConnection();
    if ($check['ok']) {
        echo json_encode([
            'success' => true,
            'message' => '✅ Kết nối database thành công!',
            'config' => [
                'DB_HOST' => DB_HOST,
                'DB_NAME' => DB_NAME,
                'DB_USER' => DB_USER,
                'DB_PASS' => substr(DB_PASS, 0, 3) . '***' . substr(DB_PASS, -2)
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $check['error'],
            'code' => $check['code'],
            'user_msg' => $check['user_msg'],
            'hint' => $check['hint'],
            'config' => $check['config']
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    exit;
}
