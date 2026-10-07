<?php
/* ============================================================
   BONSICOLA TOOL — CONFIG DATABASE
   ============================================================
   
   Thông tin DB của bạn (đã cấu hình sẵn):
   - Database:  keckyxd_bonsicola
   - User:      keckyxd_admin
   - Password:  Minh@Tool2026#Xyz
   
   ⚠️ Nếu đổi mật khẩu user trong cPanel → sửa DB_PASS bên dưới
   ============================================================ */

/* ============================================================
   4 DÒNG QUAN TRỌNG — PHẢI KHỚP VỚI CPANEL
   ============================================================ */

define('DB_HOST', 'localhost');
define('DB_NAME', 'keckyxd_bonsicola');
define('DB_USER', 'keckyxd_admin');
define('DB_PASS', 'Minh@Tool2026#Xyz');

/* ============================================================
   ⚠️ KHÔNG SỬA TỪ ĐÂY TRỞ XUỐNG
   ============================================================ */

/* Tài khoản admin web mặc định */
define('ADMIN_EMAIL', 'leminhdz@gmail.com');
define('ADMIN_PASS', 'admin123');

/* Cấu hình hệ thống */
date_default_timezone_set('Asia/Ho_Chi_Minh');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);


/* ============================================================
   TEST KẾT NỐI — HIỆN KHI TRUY CẬP TRỰC TIẾP FILE NÀY
   ============================================================ */
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>Test DB - BONSICOLA</title>';
    echo '<style>
        *{box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);padding:20px;margin:0;min-height:100vh}
        .box{max-width:640px;margin:20px auto;background:#fff;border-radius:20px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
        h1{font-size:22px;margin:0 0 8px;color:#0f172a}
        .badge{display:inline-block;padding:6px 14px;border-radius:99px;font-size:12px;font-weight:800;margin-bottom:16px}
        .badge-ok{background:#dcfce7;color:#16a34a}
        .badge-err{background:#fee2e2;color:#dc2626}
        .badge-warn{background:#fef3c7;color:#d97706}
        .alert{padding:16px;border-radius:12px;margin:12px 0;font-size:14px;line-height:1.6}
        .alert-ok{background:#f0fdf4;border-left:5px solid #22c55e}
        .alert-err{background:#fef2f2;border-left:5px solid #ef4444}
        .alert-warn{background:#fffbeb;border-left:5px solid #f59e0b}
        .info-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #e2e8f0;font-size:14px}
        .info-row:last-child{border-bottom:none}
        .info-row b{color:#334155}
        .info-row code{background:#f1f5f9;padding:3px 10px;border-radius:6px;font-family:'Courier New',monospace;font-size:13px;color:#dc2626;word-break:break-all}
        .info-title{font-size:14px;font-weight:800;color:#0f172a;margin:20px 0 8px;padding-bottom:6px;border-bottom:2px solid #3b5bfd}
        h2{font-size:15px;color:#0f172a;margin:20px 0 10px;font-weight:800}
        ol{background:#fffbeb;padding:16px 16px 16px 40px;border-radius:12px;border-left:4px solid #f59e0b;line-height:2;font-size:14px;color:#334155}
        ol li{margin-bottom:4px}
        ol code{background:#fff;padding:2px 8px;border-radius:5px;font-family:monospace;font-size:12px;color:#dc2626;font-weight:700}
        .btn{display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#3b5bfd,#5b7cff);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:13px;margin:8px 4px;box-shadow:0 4px 12px rgba(59,91,253,.3);transition:transform .15s}
        .btn:hover{transform:translateY(-2px)}
        .btn-green{background:linear-gradient(135deg,#22c55e,#16a34a);box-shadow:0 4px 12px rgba(34,197,94,.3)}
        .footer{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8}
    </style></head><body><div class="box">';

    /* ============ THỬ KẾT NỐI ============ */
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

        /* Kiểm tra bảng users */
        $hasUsers = false;
        try {
            $check = $pdo->query("SHOW TABLES LIKE 'users'");
            $hasUsers = $check->rowCount() > 0;
        } catch (Exception $e) {}

        /* Đếm user */
        $userCount = 0;
        if ($hasUsers) {
            try {
                $r = $pdo->query("SELECT COUNT(*) AS c FROM users");
                $userCount = (int)$r->fetch()['c'];
            } catch (Exception $e) {}
        }

        /* ============ THÀNH CÔNG ============ */
        if ($hasUsers) {
            echo '<span class="badge badge-ok">✅ DATABASE OK</span>';
            echo '<h1>🎉 Kết nối thành công!</h1>';
            echo '<div class="alert alert-ok">Database đã kết nối và bảng đã sẵn sàng. Bạn có thể quay lại trang chủ để đăng nhập.</div>';
        } else {
            echo '<span class="badge badge-warn">⚠️ CẦN IMPORT SQL</span>';
            echo '<h1>Database kết nối OK</h1>';
            echo '<div class="alert alert-warn"><b>Nhưng chưa có bảng dữ liệu!</b><br>Bạn cần import file <code>install.sql</code> vào database.</div>';
        }

        /* ============ THÔNG TIN ============ */
        echo '<div class="info-title">📋 Thông tin kết nối</div>';
        echo '<div class="info-row"><b>DB_HOST</b> <code>' . htmlspecialchars(DB_HOST) . '</code></div>';
        echo '<div class="info-row"><b>DB_NAME</b> <code>' . htmlspecialchars(DB_NAME) . '</code></div>';
        echo '<div class="info-row"><b>DB_USER</b> <code>' . htmlspecialchars(DB_USER) . '</code></div>';
        echo '<div class="info-row"><b>DB_PASS</b> <code>' . htmlspecialchars(substr(DB_PASS, 0, 3) . '***' . substr(DB_PASS, -3)) . '</code></div>';
        echo '<div class="info-row"><b>Bảng users</b> <code style="color:' . ($hasUsers ? '#16a34a' : '#dc2626') . '">' . ($hasUsers ? '✅ Đã tồn tại' : '❌ Chưa có') . '</code></div>';

        if ($hasUsers) {
            echo '<div class="info-row"><b>Tổng users</b> <code style="color:#3b5bfd">' . $userCount . ' user</code></div>';
        }

        /* ============ NẾU CHƯA IMPORT SQL ============ */
        if (!$hasUsers) {
            echo '<h2>🔧 Cách import bảng dữ liệu:</h2>';
            echo '<ol>';
            echo '<li>Mở <b>cPanel</b> → <b>phpMyAdmin</b></li>';
            echo '<li>Cột bên trái → chọn database <code>' . DB_NAME . '</code></li>';
            echo '<li>Bấm tab <b>SQL</b> (trên cùng)</li>';
            echo '<li>Mở file <code>install.sql</code> trên máy → copy toàn bộ nội dung</li>';
            echo '<li>Dán vào ô SQL → bấm nút <b>Go</b> (hoặc <b>Thực hiện</b>)</li>';
            echo '<li>Quay lại đây và F5 để kiểm tra lại</li>';
            echo '</ol>';
        }

        /* ============ NÚT VỀ TRANG CHỦ ============ */
        echo '<div style="text-align:center;margin-top:20px">';
        echo '<a href="/" class="btn btn-green">🏠 VỀ TRANG CHỦ</a>';
        echo '</div>';

        echo '<div class="footer">BONSICOLA TOOL © ' . date('Y') . '</div>';
        echo '</div></body></html>';
        exit;

    } catch (PDOException $e) {
        /* ============ LỖI ============ */
        $code = $e->getCode();
        $msg = htmlspecialchars($e->getMessage());

        $configs = [
            1045 => [
                'icon' => '🔑',
                'title' => 'SAI MẬT KHẨU DATABASE',
                'reason' => 'Mật khẩu trong file <code>config.php</code> KHÔNG KHỚP với mật khẩu user <code>' . htmlspecialchars(DB_USER) . '</code> trong cPanel.',
                'steps' => [
                    'Vào <b>cPanel</b> → <b>MySQL® Databases</b>',
                    'Mục <b>Current Users</b> → tìm <code>' . DB_USER . '</code>',
                    'Bấm <b>Change Password</b> → nhập mật khẩu mới',
                    'Quay lại file <code>config.php</code>, sửa dòng <code>DB_PASS</code> cho khớp',
                    'F5 lại trang này'
                ]
            ],
            1049 => [
                'icon' => '🗄️',
                'title' => 'DATABASE KHÔNG TỒN TẠI',
                'reason' => 'Database <code>' . htmlspecialchars(DB_NAME) . '</code> chưa được tạo.',
                'steps' => [
                    'Vào <b>cPanel</b> → <b>MySQL® Databases</b>',
                    'Mục <b>Create New Database</b> → nhập <code>bonsicola</code>',
                    'Bấm <b>Create Database</b>',
                    'Sửa <code>DB_NAME</code> trong file config.php nếu cần',
                    'F5 lại trang này'
                ]
            ],
            1044 => [
                'icon' => '🚫',
                'title' => 'USER CHƯA ĐƯỢC GÁN QUYỀN',
                'reason' => 'User <code>' . htmlspecialchars(DB_USER) . '</code> chưa được gán vào database <code>' . htmlspecialchars(DB_NAME) . '</code>.',
                'steps' => [
                    'Vào <b>cPanel</b> → <b>MySQL® Databases</b>',
                    'Mục <b>Add User To Database</b>',
                    'Chọn User: <code>' . DB_USER . '</code> + Database: <code>' . DB_NAME . '</code>',
                    'Bấm <b>Add</b>',
                    'Tích <b>ALL PRIVILEGES</b> → bấm <b>Make Changes</b>',
                    'F5 lại trang này'
                ]
            ],
            2002 => [
                'icon' => '🌐',
                'title' => 'KHÔNG KẾT NỐI ĐƯỢC MYSQL',
                'reason' => 'Không tìm thấy MySQL server.',
                'steps' => [
                    'Kiểm tra <code>DB_HOST</code> trong config.php',
                    'Thử đổi thành <code>localhost</code>',
                    'Nếu vẫn lỗi → liên hệ nhà cung cấp hosting'
                ]
            ]
        ];

        $info = $configs[$code] ?? [
            'icon' => '❌',
            'title' => 'LỖI KẾT NỐI DATABASE',
            'reason' => 'Không xác định được nguyên nhân.',
            'steps' => [
                'Kiểm tra lại 4 dòng cấu hình DB',
                'Liên hệ nhà cung cấp hosting để được hỗ trợ'
            ]
        ];

        echo '<span class="badge badge-err">❌ LỖI DB ' . $code . '</span>';
        echo '<h1>' . $info['icon'] . ' ' . $info['title'] . '</h1>';

        echo '<div class="alert alert-err"><b>Nguyên nhân:</b><br>' . $info['reason'] . '</div>';

        echo '<details style="background:#f8fafc;padding:12px;border-radius:10px;margin:12px 0;font-size:13px">';
        echo '<summary style="cursor:pointer;font-weight:700;color:#dc2626">📋 Chi tiết lỗi gốc (bấm để xem)</summary>';
        echo '<div style="margin-top:10px;padding:10px;background:#fff;border-radius:6px;font-family:monospace;font-size:11px;color:#64748b;word-break:break-all">' . $msg . '</div>';
        echo '</details>';

        echo '<div class="info-title">📋 Config hiện tại</div>';
        echo '<div class="info-row"><b>DB_HOST</b> <code>' . htmlspecialchars(DB_HOST) . '</code></div>';
        echo '<div class="info-row"><b>DB_NAME</b> <code>' . htmlspecialchars(DB_NAME) . '</code></div>';
        echo '<div class="info-row"><b>DB_USER</b> <code>' . htmlspecialchars(DB_USER) . '</code></div>';
        echo '<div class="info-row"><b>DB_PASS</b> <code>' . htmlspecialchars(substr(DB_PASS, 0, 3) . '***' . substr(DB_PASS, -3)) . '</code></div>';

        echo '<h2>🔧 Cách sửa:</h2>';
        echo '<ol>';
        foreach ($info['steps'] as $step) {
            echo '<li>' . $step . '</li>';
        }
        echo '</ol>';

        echo '<div class="footer">Sau khi sửa → F5 lại trang này</div>';
        echo '</div></body></html>';
        exit;
    }
}


/* ============================================================
   HÀM DB() — DÙNG CHO API
   ============================================================ */
function db(){
    static $pdo = null;
    if($pdo) return $pdo;
    try{
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]
        );
        return $pdo;
    } catch(PDOException $e) {
        out([
            'error' => 'DB: ' . $e->getMessage(),
            'code' => $e->getCode(),
            'hint' => 'Mở /api/config.php để xem hướng dẫn sửa'
        ], 500);
    }
}

function out($data, $code = 200){
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
?>
