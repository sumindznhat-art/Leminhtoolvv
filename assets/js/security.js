/* ============================================================
   SECURITY.JS v4 — CHỈ CHECK IP TỰ ĐỘNG
   Không chặn gì, không hiện gì, chạy ngầm hoàn toàn
   ============================================================ */

(function(){
  'use strict';

  /* ============ 1. CHECK IP TỰ ĐỘNG KHI LOAD ============ */
  async function autoCheckIP() {
    try {
      // Kiểm tra session hiện tại
      const sessRaw = localStorage.getItem('bonsicola_session');
      if (!sessRaw) return;

      const sess = JSON.parse(sessRaw);
      if (!sess || !sess.email) return;

      // Lấy IP hiện tại
      const currentIP = await fetchIP();
      if (!currentIP) return;

      // So sánh với IP trong session
      const sessionIP = sess.user && sess.user.ip;
      if (sessionIP && sessionIP !== currentIP) {
        // IP thay đổi → ghi nhận nhưng KHÔNG đăng xuất
        // Chỉ log ngầm (không hiện cho user)
        console.debug('[IP-CHANGE]', sessionIP, '→', currentIP);
      }

      // Lưu IP hiện tại vào session
      sess.currentIP = currentIP;
      sess.lastCheckIP = Date.now();
      localStorage.setItem('bonsicola_session', JSON.stringify(sess));

    } catch(e) {
      // Bỏ qua lỗi ngầm
    }
  }

  /* ============ 2. LẤY IP PUBLIC ============ */
  async function fetchIP() {
    const apis = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://ipapi.co/json/'
    ];

    for (const url of apis) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const ip = data.ip || data.query || data.IPv4;
        if (ip && typeof ip === 'string' && ip.length > 3) return ip;
      } catch(e) {
        continue;
      }
    }
    return null;
  }

  /* ============ 3. CHECK ĐỊNH KỲ MỖI 5 PHÚT ============ */
  let checkInterval = null;

  function startAutoCheck() {
    // Check ngay lần đầu (sau 2s để không ảnh hưởng load trang)
    setTimeout(autoCheckIP, 2000);

    // Check định kỳ
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(autoCheckIP, 5 * 60 * 1000); // 5 phút
  }

  /* ============ 4. KHỞI ĐỘNG ============ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAutoCheck);
  } else {
    startAutoCheck();
  }

  /* ============ 5. EXPOSE (ngầm, không quảng cáo) ============ */
  window.IPGuard = {
    check: autoCheckIP,
    getIP: fetchIP,
    lastCheck: () => {
      try {
        const s = localStorage.getItem('bonsicola_session');
        if (!s) return null;
        return JSON.parse(s).lastCheckIP || null;
      } catch(e) { return null; }
    }
  };

})();
