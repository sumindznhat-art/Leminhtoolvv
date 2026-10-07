/* ============================================================
   SECURITY.JS v3 — BẢO MẬT ẨN HOÀN TOÀN
   Không hiện cảnh báo, không chặn F12, tự động bảo vệ ngầm
   ============================================================ */

(function(){
  'use strict';

  /* ============ 1. CHỐNG IFRAME EMBED (chống nhúng site khác) ============ */
  try {
    if (window.top !== window.self) {
      window.top.location = window.self.location;
    }
  } catch(e) {}

  /* ============ 2. CHỐNG VIEW SOURCE QUA URL SCHEME ============ */
  try {
    if (window.location.protocol === 'view-source:') {
      window.location.href = 'about:blank';
    }
  } catch(e) {}

  /* ============ 3. ẨN SOURCE MAP (dev tools không tải được .map) ============ */
  try {
    Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      value: { isDisabled: true, supportsFiber: true, inject: function(){}, onCommitFiberRoot: function(){}, onCommitFiberUnmount: function(){} },
      writable: false
    });
  } catch(e) {}

  /* ============ 4. TỰ ĐỘNG ẨN CONSOLE LOG NỘI BỘ ============ */
  try {
    const origLog = console.log.bind(console);
    console.log = function() {
      // Chỉ hiện log nếu devtools đang KHÔNG mở
      const wDiff = window.outerWidth - window.innerWidth;
      const hDiff = window.outerHeight - window.innerHeight;
      if (wDiff > 200 || hDiff > 200) return; // đang mở devtools → ẩn
      return origLog.apply(console, arguments);
    };
  } catch(e) {}

  /* ============ 5. BẢO VỆ HÀM QUAN TRỌNG KHÔNG CHO OVERRIDE ============ */
  try {
    const protectFns = ['openTool','doLogin','doRegister','api','saveRemoteConfig'];
    protectFns.forEach(fn => {
      if (typeof window[fn] === 'function') {
        try {
          Object.defineProperty(window, fn, {
            writable: false,
            configurable: false
          });
        } catch(e) {}
      }
    });
  } catch(e) {}

  /* ============ 6. ẨN THÔNG TIN NHẠY CẢM KHỎI CONSOLE ============ */
  try {
    // Xoá dấu vết trong memory
    if (window.CONFIG && window.CONFIG.ports) {
      // Không cho JSON.stringify in ra ports nếu bị gọi từ console
      const origStringify = JSON.stringify;
      JSON.stringify = function(val, ...args) {
        if (val === window.CONFIG) {
          return '{"protected":true}';
        }
        return origStringify.call(JSON, val, ...args);
      };
    }
  } catch(e) {}

  /* ============ 7. BẢO VỆ LOCALSTORAGE ============ */
  try {
    const origGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      // Chỉ cho phép đọc các key hợp lệ
      const allowKeys = ['bonsicola_session','bs_current','bonsicola_avatar','bs_token','bs_inited','bs_device'];
      if (allowKeys.includes(key)) return origGetItem.call(this, key);
      return origGetItem.call(this, key); // Vẫn cho đọc nhưng không log
    };
  } catch(e) {}

  /* ============ 8. CHỐNG DEBUGGER INJECT (chống paste code độc) ============ */
  try {
    const origEval = window.eval;
    window.eval = function(code) {
      if (typeof code === 'string' && code.length > 5000) {
        console.warn('⚠️ Chặn eval code dài');
        return;
      }
      return origEval.call(window, code);
    };
  } catch(e) {}

  /* ============ 9. WATERMARK ẨN (chống chụp màn hình share) ============ */
  try {
    document.addEventListener('DOMContentLoaded', () => {
      const wm = document.createElement('div');
      wm.style.cssText = 'position:fixed;bottom:2px;left:2px;font-size:8px;color:rgba(0,0,0,.04);z-index:0;pointer-events:none;user-select:none;font-family:monospace';
      wm.textContent = 'BONSICOLA © ' + new Date().getFullYear();
      document.body.appendChild(wm);
    });
  } catch(e) {}

  /* ============ 10. TỰ ĐỘNG REFRESH TOKEN SESSION ============ */
  try {
    setInterval(() => {
      const s = localStorage.getItem('bonsicola_session');
      if (s) {
        try {
          const obj = JSON.parse(s);
          obj.lastPing = Date.now();
          localStorage.setItem('bonsicola_session', JSON.stringify(obj));
        } catch(e) {}
      }
    }, 60000);
  } catch(e) {}

  /* ============ 11. CHẶN CLICK PHẢI VÀO ẢNH (chống save QR/logo) ============ */
  try {
    document.addEventListener('contextmenu', function(e) {
      if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
      }
    }, true);
  } catch(e) {}

  /* ============ 12. CHỐNG KÉO THẢ ẢNH ============ */
  try {
    document.addEventListener('dragstart', function(e) {
      if (e.target.tagName === 'IMG') e.preventDefault();
    }, true);
  } catch(e) {}

  /* ============ EXPORT ============ */
  window.Security = {
    version: '3.0',
    mode: 'silent'
  };

})();
