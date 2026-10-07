/* ============================================================
   ADMIN.JS — HOÀN CHỈNH 100%
   Duyệt tiền • Users • Tools • Cấu hình (Ảnh/QR/Logo/Nhạc) • Keys
   ============================================================ */

/* ==================== MỞ ADMIN PANEL ==================== */
async function openAdmin() {
  const s = getSession();
  if (!s) { alert('Chưa đăng nhập'); return; }
  const u = s.user;
  const isAdmin = (s.email === ADMIN_EMAIL) || (u && u.is_admin == 1);
  if (!isAdmin) { alert('Không có quyền Admin!'); return; }

  ['adminPendingView','adminUsersView','adminToolsView','adminKeysView','adminHistoryView']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">⏳ Đang tải...</p>';
    });

  openModal('adminPanel');

  try {
    await Promise.all([
      renderAdminPending(),
      renderAdminUsers(),
      renderAdminTools(),
      renderAdminKeys(),
      renderAdminHistory()
    ]);
  } catch(e) { console.error('Admin load error:', e); }
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(x => x.classList.toggle('active', x.dataset.atab === t));
  const map = {
    pending: 'adminPendingView', users: 'adminUsersView', tools: 'adminToolsView',
    keys: 'adminKeysView', history: 'adminHistoryView'
  };
  Object.values(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(map[t]);
  if (target) target.style.display = '';
}

/* ============================================================
   NÉN ẢNH TRƯỚC KHI UPLOAD — FIX LỖI "string did not match"
   ============================================================ */
function fileToBase64(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    if (!file.type.startsWith('image/')) {
      alert('⚠️ File không phải ảnh!');
      return resolve('');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let result = canvas.toDataURL('image/jpeg', quality);

        if (result.length > 1024 * 1024) result = canvas.toDataURL('image/jpeg', 0.6);
        if (result.length > 1024 * 1024) {
          const c2 = document.createElement('canvas');
          c2.width = Math.round(w * 0.6);
          c2.height = Math.round(h * 0.6);
          c2.getContext('2d').drawImage(img, 0, 0, c2.width, c2.height);
          result = c2.toDataURL('image/jpeg', 0.7);
        }
        console.log('📸 Nén ảnh:', file.name, '→', Math.round(result.length/1024) + 'KB');
        resolve(result);
      };
      img.onerror = () => { alert('❌ Không đọc được file ảnh!'); resolve(''); };
      img.src = e.target.result;
    };
    reader.onerror = () => { alert('❌ Lỗi đọc file!'); resolve(''); };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   1. DUYỆT TIỀN
   ============================================================ */
async function renderAdminPending() {
  const s = getSession(); if (!s) return;
  const el = document.getElementById('adminPendingView'); if (!el) return;

  const res = await api('deposit_pending', { email: s.email, password: s.password });
  const deps = (res && res.success) ? (res.deposits || []) : [];

  if (!deps.length) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:30px">🎉 Không có yêu cầu nào chờ duyệt</p>';
    const b = document.getElementById('pendBadge');
    if (b) b.style.display = 'none';
    return;
  }

  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Có <b style="color:#dc2626">${deps.length}</b> yêu cầu chờ duyệt</p>`;
  deps.forEach(d => {
    const time = new Date(Number(d.created_at)).toLocaleString('vi-VN');
    html += `
      <div class="adm-row" style="border:2px solid #fde68a;background:#fffbeb">
        <div><b>${esc(d.email)}</b>${d.user_name ? ' — ' + esc(d.user_name) : ''}</div>
        <div style="font-size:16px;color:#dc2626;font-weight:800;margin:4px 0">💵 ${fmt(d.amount)}</div>
        <div class="info">🌐 IP: <code>${esc(d.ip||'—')}</code></div>
        <div class="info">📝 ${esc(d.note||'(không có ghi chú)')}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">🕐 ${time}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);flex:1;margin:0" onclick="approveDeposit('${d.id}')">✅ DUYỆT</button>
          <button class="adm-btn" style="background:linear-gradient(135deg,#ef4444,#dc2626);flex:1;margin:0" onclick="rejectDeposit('${d.id}')">❌ TỪ CHỐI</button>
        </div>
      </div>`;
  });
  el.innerHTML = html;

  const badge = document.getElementById('pendBadge');
  if (badge) { badge.textContent = deps.length; badge.style.display = deps.length ? 'inline-block' : 'none'; }
}

async function approveDeposit(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt?')) return;
  const s = getSession();
  const res = await api('deposit_approve', { email: s.email, password: s.password, id });
  if (res && res.success) {
    alert('✅ Đã duyệt! Số dư mới: ' + fmt(res.new_balance));
    await renderAdminPending();
    await renderAdminUsers();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi duyệt tiền'));
}

async function rejectDeposit(id) {
  const reason = prompt('Lý do từ chối:', 'Không hợp lệ');
  if (reason === null) return;
  const s = getSession();
  const res = await api('deposit_reject', { email: s.email, password: s.password, id, reason: reason || 'Không hợp lệ' });
  if (res && res.success) {
    alert('❌ Đã từ chối');
    await renderAdminPending();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
}

/* ============================================================
   2. QUẢN LÝ USERS + CẤP TIỀN QUA SERVER
   ============================================================ */
async function renderAdminUsers() {
  const s = getSession(); if (!s) return;
  const el = document.getElementById('adminUsersView'); if (!el) return;

  const res = await api('user_list', { email: s.email, password: s.password });
  const list = (res && res.success) ? (res.users || []) : [];

  if (!list.length) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Không có user</p>';
    return;
  }

  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Tổng: <b>${list.length}</b> user</p>`;

  list.forEach(u => {
    const exp = u.key_expiry && Number(u.key_expiry) > 0
      ? new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : '—';
    const isAdm = u.is_admin == 1;
    const balance = Number(u.balance) || 0;

    html += `
      <div class="adm-row">
        <div class="r1">
          <b>${esc(u.name || 'Không tên')}</b>
          <span class="badge ${isAdm ? 'badge-admin' : 'badge-vip'}">${isAdm ? '👑 ADMIN' : '👤 USER'}</span>
        </div>
        <div class="info">📧 ${esc(u.email)}</div>
        <div class="info">🌐 IP: <code>${esc(u.ip || '—')}</code></div>
        <div class="info">💰 Số dư: <b style="color:#16a34a">${fmt(balance)}</b></div>
        <div class="info">⏰ Hạn VIP: ${exp}</div>
        <div class="acts">
          <button class="b3" onclick="adminResetIP('${esc(u.email)}')">🔄 Reset IP</button>
          <button class="b4" onclick="adminAdjustBalance('${esc(u.email)}', ${balance})">💵 Cấp tiền</button>
          ${!isAdm ? `<button class="b5" onclick="adminDeleteUser('${esc(u.email)}')">🗑 Xoá</button>` : ''}
        </div>
      </div>`;
  });
  el.innerHTML = html;
}

async function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?\nUser sẽ phải đăng nhập lại và khoá vào IP mới.')) return;
  const s = getSession();
  const res = await api('user_reset_ip', {
    email: s.email, password: s.password,
    target_email: email
  });
  if (res && res.success) {
    alert('✅ Đã reset IP cho ' + email);
    await renderAdminUsers();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi reset IP'));
}

/* CẤP TIỀN — GỌI SERVER ĐỂ LƯU DB */
async function adminAdjustBalance(email, currentBal) {
  const input = prompt(
    `👤 User: ${email}\n💰 Số dư hiện tại: ${fmt(currentBal)}\n\n` +
    `Nhập số tiền muốn CẤP (dùng dấu - để trừ):\n` +
    `VD: 50000 (cộng 50k) hoặc -20000 (trừ 20k)`,
    '10000'
  );
  if (input === null) return;

  const delta = Number(input);
  if (isNaN(delta) || delta === 0) {
    return alert('⚠️ Số không hợp lệ!');
  }

  const newBal = currentBal + delta;
  if (newBal < 0) {
    return alert('⚠️ Số dư sẽ âm sau khi trừ! Huỷ thao tác.');
  }

  if (!confirm(
    `XÁC NHẬN CẤP TIỀN\n\n` +
    `👤 User: ${email}\n` +
    `💰 Số dư cũ: ${fmt(currentBal)}\n` +
    `➕ Thay đổi: ${delta > 0 ? '+' : ''}${fmt(delta)}\n` +
    `💰 Số dư mới: ${fmt(newBal)}`
  )) return;

  const s = getSession();

  /* Gọi API update_balance — Backend cần xử lý action này */
  const res = await api('admin_set_balance', {
    email: s.email, password: s.password,
    target_email: email,
    amount: delta,
    new_balance: newBal
  });

  /* Nếu API chưa có → thử fallback qua user_update */
  if (!res || !res.success) {
    const res2 = await api('user_update', {
      email: s.email, password: s.password,
      target_email: email,
      balance: newBal
    });

    if (res2 && res2.success) {
      alert('✅ ĐÃ CẤP TIỀN!\n\n👤 ' + email + '\n💰 Số dư mới: ' + fmt(newBal) + '\n\n⚠️ User cần đăng nhập lại để thấy số dư mới.');
      await renderAdminUsers();
      return;
    }
    alert('❌ ' + ((res2 && res2.error) || (res && res.error) || 'Lỗi server'));
    return;
  }

  alert('✅ ĐÃ CẤP TIỀN!\n\n👤 ' + email + '\n💰 Số dư mới: ' + fmt(res.new_balance || newBal));
  await renderAdminUsers();
}

async function adminDeleteUser(email) {
  if (!confirm('⚠️ XOÁ VĨNH VIỄN user ' + email + '?\nKhông thể hoàn tác!')) return;
  const s = getSession();
  const res = await api('user_delete', {
    email: s.email, password: s.password,
    target_email: email
  });
  if (res && res.success) {
    alert('✅ Đã xoá user');
    await renderAdminUsers();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi xoá user'));
}

/* ============================================================
   3. TOOLS + CẤU HÌNH (Ảnh/QR/Logo/Nhạc)
   ============================================================ */
async function renderAdminTools() {
  const el = document.getElementById('adminToolsView'); if (!el) return;
  const ports = window.CONFIG.ports || [];
  const bank = window.CONFIG.bank || {};
  const logo = window.CONFIG.logo || '';
  const avatar = window.CONFIG.avatar || '';
  const musicUrl = window.CONFIG.music_url || '';

  let html = `
    <div class="adm-section" style="border-color:#93c5fd;background:#eff6ff">
      <h4>⚙️ CẤU HÌNH CHUNG</h4>

      <label style="font-size:11px;font-weight:700">🌐 API Base URL</label>
      <input class="adm-input" id="cfgApiBase" value="${esc(window.CONFIG.API_BASE || '/api')}" placeholder="VD: /api">

      <label style="font-size:11px;font-weight:700">📝 Tên Site</label>
      <input class="adm-input" id="cfgSiteName" value="${esc(window.CONFIG.site_name || '')}">

      <label style="font-size:11px;font-weight:700">📄 Mô tả</label>
      <input class="adm-input" id="cfgSiteDesc" value="${esc(window.CONFIG.site_desc || '')}">

      <label style="font-size:11px;font-weight:700">📢 Chữ chạy (Marquee)</label>
      <input class="adm-input" id="cfgMarquee" value="${esc(window.CONFIG.marquee || '')}">

      <label style="font-size:11px;font-weight:700">© Footer</label>
      <input class="adm-input" id="cfgFooter" value="${esc(window.CONFIG.footer || '')}">

      <!-- LOGO -->
      <div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">
        <div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">🖼️ ẢNH LOGO</div>
        <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
          <div style="width:70px;height:70px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #cbd5e1;flex-shrink:0;font-size:28px">
            ${logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:cover">` : '🎀'}
          </div>
          <div style="flex:1;min-width:180px">
            <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">📤 Upload file</label>
            <input type="file" id="cfgLogoFile" accept="image/*" class="adm-input" style="padding:5px;margin-bottom:5px;font-size:11px">
            <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 Hoặc dán URL ảnh</label>
            <input class="adm-input" id="cfgLogoUrl" value="${logo && !logo.startsWith('data:') ? esc(logo) : ''}" placeholder="https://.../logo.png" style="font-size:11px">
            <button class="adm-btn" style="padding:5px;font-size:10px;margin-top:5px;background:#ef4444" onclick="clearLogo()">🗑 Xoá logo</button>
          </div>
        </div>
      </div>

      <!-- AVATAR -->
      <div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">
        <div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">👤 AVATAR MẶC ĐỊNH</div>
        <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
          <div style="width:70px;height:70px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #cbd5e1;flex-shrink:0;font-size:28px">
            ${avatar ? `<img src="${avatar}" style="width:100%;height:100%;object-fit:cover">` : '🎀'}
          </div>
          <div style="flex:1;min-width:180px">
            <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">📤 Upload file</label>
            <input type="file" id="cfgAvatarFile" accept="image/*" class="adm-input" style="padding:5px;margin-bottom:5px;font-size:11px">
            <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 Hoặc dán URL ảnh</label>
            <input class="adm-input" id="cfgAvatarUrl" value="${avatar && !avatar.startsWith('data:') ? esc(avatar) : ''}" placeholder="https://.../avatar.png" style="font-size:11px">
            <button class="adm-btn" style="padding:5px;font-size:10px;margin-top:5px;background:#ef4444" onclick="clearAvatar()">🗑 Xoá avatar</button>
          </div>
        </div>
      </div>

      <!-- NHẠC -->
      <div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">
        <div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">🎵 NHẠC NỀN</div>
        <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 URL file nhạc (.mp3)</label>
        <input class="adm-input" id="cfgMusicUrl" value="${esc(musicUrl)}" placeholder="https://.../music.mp3">
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="adm-btn" style="padding:8px;font-size:11px;background:linear-gradient(135deg,#10b981,#059669);flex:1;margin:0" onclick="testMusic()">▶️ Nghe thử</button>
          <button class="adm-btn" style="padding:8px;font-size:11px;background:#f59e0b;flex:1;margin:0" onclick="stopMusic()">⏸ Dừng</button>
          <button class="adm-btn" style="padding:8px;font-size:11px;background:#ef4444;flex:1;margin:0" onclick="clearMusic()">🗑 Xoá</button>
        </div>
        <div id="musicStatus" style="font-size:11px;color:#64748b;margin-top:6px;text-align:center"></div>
      </div>

      <!-- NGÂN HÀNG + QR -->
      <div style="background:#fff;border-radius:10px;padding:10px;margin-top:10px;border:1px solid #bfdbfe">
        <div style="font-size:12px;font-weight:800;color:#1e40af;margin-bottom:8px">🏦 NGÂN HÀNG + QR</div>
        <label style="font-size:11px;font-weight:700">Tên ngân hàng</label>
        <input class="adm-input" id="cfgBankName" value="${esc(bank.name || '')}">
        <label style="font-size:11px;font-weight:700">Số tài khoản</label>
        <input class="adm-input" id="cfgBankAcc" value="${esc(bank.account || '')}">
        <label style="font-size:11px;font-weight:700">Chủ tài khoản</label>
        <input class="adm-input" id="cfgBankOwner" value="${esc(bank.owner || '')}">

        <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-top:8px">
          <div style="width:90px;height:90px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;border:2px solid #cbd5e1;flex-shrink:0;font-size:28px">
            ${bank.qr ? `<img src="${bank.qr}" style="width:100%;height:100%;object-fit:contain">` : '📱'}
          </div>
          <div style="flex:1;min-width:180px">
            <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">📤 Upload ảnh QR</label>
            <input type="file" id="cfgQRFile" accept="image/*" class="adm-input" style="padding:5px;margin-bottom:5px;font-size:11px">
            <label style="font-size:10px;font-weight:700;display:block;margin-bottom:3px">🔗 Hoặc dán URL QR</label>
            <input class="adm-input" id="cfgQRUrl" value="${bank.qr && !bank.qr.startsWith('data:') ? esc(bank.qr) : ''}" placeholder="https://.../qr.png" style="font-size:11px">
            <button class="adm-btn" style="padding:5px;font-size:10px;margin-top:5px;background:#ef4444" onclick="clearQR()">🗑 Xoá QR</button>
          </div>
        </div>
      </div>

      <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);margin-top:12px;padding:14px;font-size:14px" onclick="saveSiteConfig()">💾 LƯU TOÀN BỘ CẤU HÌNH</button>
    </div>

    <!-- THÊM TOOL -->
    <div class="adm-section">
      <h4>➕ THÊM GAME / TOOL MỚI</h4>
      <label style="font-size:11px;font-weight:700">Tên tool *</label>
      <input class="adm-input" id="ntName" placeholder="VD: Sunwin Tài Xỉu">
      
      <label style="font-size:11px;font-weight:700">Danh mục *</label>
      <select class="adm-input" id="ntCat">
        <option value="taixiu">🎲 Tài Xỉu</option>
        <option value="sicbo">🎰 Sicbo</option>
        <option value="baccarat">🃏 Baccarat</option>
      </select>
      
      <label style="font-size:11px;font-weight:700">Loại *</label>
      <select class="adm-input" id="ntKind">
        <option value="view">👁 View (vào game + panel)</option>
        <option value="panel">📊 Panel (chỉ panel AI)</option>
        <option value="baccarat">🃏 Baccarat</option>
      </select>
      
      <label style="font-size:11px;font-weight:700">URL Game</label>
      <input class="adm-input" id="ntGameUrl" placeholder="https://...">
      
      <label style="font-size:11px;font-weight:700">API URL *</label>
      <input class="adm-input" id="ntApiUrl" placeholder="https://.../sessions">
      
      <label style="font-size:11px;font-weight:700">Thứ tự</label>
      <input class="adm-input" id="ntSort" type="number" value="99">
      
      <label style="font-size:11px;font-weight:700">Ảnh đại diện</label>
      <input type="file" id="ntImage" accept="image/*" class="adm-input" style="padding:5px">
      
      <div style="display:flex;gap:14px;margin:10px 0;flex-wrap:wrap">
        <label style="font-size:12px;font-weight:700"><input type="checkbox" id="ntHot"> 🔥 HOT</label>
        <label style="font-size:12px;font-weight:700"><input type="checkbox" id="ntNew"> ✨ NEW</label>
        <label style="font-size:12px;font-weight:700"><input type="checkbox" id="ntVip" checked> 👑 VIP</label>
      </div>
      
      <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="addNewTool()">➕ THÊM TOOL</button>
    </div>

    <p style="text-align:center;font-size:12px;color:#64748b;margin:14px 0 8px">📦 Tổng: <b>${ports.length}</b> tool</p>
  `;

  if (!ports.length) {
    html += '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có tool nào</p>';
  } else {
    ports.forEach((t, i) => {
      const img = getToolImage(t);
      const badges = [];
      if (t.hot == 1) badges.push('🔥');
      if (t.is_new == 1) badges.push('✨');
      if (t.vip == 1) badges.push('👑');
      if (t.maintenance == 1) badges.push('🚧');
      if (!t.enabled) badges.push('❌');

      html += `
        <div class="adm-row" style="${t.maintenance == 1 ? 'opacity:.65' : ''}">
          <div style="display:flex;gap:10px;align-items:center">
            <div style="width:44px;height:44px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
              ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover">` : `<i class="fa-solid fa-cube" style="color:#a855f7"></i>`}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:800;font-size:13px">${esc(t.name)} ${badges.join(' ')}</div>
              <div class="info" style="font-size:11px">📁 ${esc(t.cat || '')} • ${esc(t.kind || '')} • sort: ${t.sort || 0}</div>
            </div>
          </div>
          <div class="acts">
            <button class="b2" onclick="editTool(${i})">✏️ Sửa</button>
            <button class="b3" onclick="toggleTool(${i},'enabled')">${t.enabled ? '🚫 Tắt' : '✅ Bật'}</button>
            <button class="b4" onclick="toggleTool(${i},'maintenance')">${t.maintenance ? '🔧 Mở' : '🚧 Bảo trì'}</button>
            <button class="b5" onclick="deleteTool(${i})">🗑 Xoá</button>
          </div>
        </div>`;
    });
  }
  el.innerHTML = html;
}

/* ============================================================
   LƯU CẤU HÌNH (bao gồm nhạc, ảnh)
   ============================================================ */
async function saveSiteConfig() {
  const val = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const apiBase = val('cfgApiBase');
  if (apiBase) window.CONFIG.API_BASE = apiBase;

  window.CONFIG.site_name = val('cfgSiteName') || 'TOOL MINHIOS';
  window.CONFIG.site_desc = val('cfgSiteDesc');
  window.CONFIG.marquee = val('cfgMarquee');
  window.CONFIG.footer = val('cfgFooter');

  /* Logo */
  const logoFile = document.getElementById('cfgLogoFile').files[0];
  if (logoFile) {
    console.log('⏳ Đang nén logo...');
    const b64 = await fileToBase64(logoFile, 300, 0.85);
    if (b64) window.CONFIG.logo = b64;
  } else {
    const logoUrl = val('cfgLogoUrl');
    if (logoUrl) window.CONFIG.logo = logoUrl;
  }

  /* Avatar */
  const avatarFile = document.getElementById('cfgAvatarFile').files[0];
  if (avatarFile) {
    console.log('⏳ Đang nén avatar...');
    const b64 = await fileToBase64(avatarFile, 300, 0.85);
    if (b64) window.CONFIG.avatar = b64;
  } else {
    const avatarUrl = val('cfgAvatarUrl');
    if (avatarUrl) window.CONFIG.avatar = avatarUrl;
  }

  /* Nhạc */
  window.CONFIG.music_url = val('cfgMusicUrl');

  /* Bank */
  window.CONFIG.bank = window.CONFIG.bank || {};
  window.CONFIG.bank.name = val('cfgBankName');
  window.CONFIG.bank.account = val('cfgBankAcc');
  window.CONFIG.bank.owner = val('cfgBankOwner');

  /* QR */
  const qrFile = document.getElementById('cfgQRFile').files[0];
  if (qrFile) {
    console.log('⏳ Đang nén QR...');
    const b64 = await fileToBase64(qrFile, 600, 0.85);
    if (b64) window.CONFIG.bank.qr = b64;
  } else {
    const qrUrl = val('cfgQRUrl');
    if (qrUrl) window.CONFIG.bank.qr = qrUrl;
  }

  /* Kiểm tra kích thước config */
  const sizeKB = Math.round(JSON.stringify(window.CONFIG).length / 1024);
  console.log('📦 Config size:', sizeKB + 'KB');
  if (sizeKB > 1500) {
    return alert('⚠️ Config quá lớn (' + sizeKB + 'KB). Vui lòng dùng ảnh nhỏ hơn hoặc dán URL thay vì upload!');
  }

  /* Gửi lên server */
  try {
    const res = await saveRemoteConfig();
    if (res && res.success) {
      alert('✅ ĐÃ LƯU TOÀN BỘ CẤU HÌNH!');
      if (typeof applyLoginBranding === 'function') applyLoginBranding();
      if (typeof buildBankInfo === 'function') buildBankInfo();
      if (typeof applyMusic === 'function') applyMusic();
      if (typeof applyDefaultAvatar === 'function') applyDefaultAvatar();
      renderAdminTools();
    } else {
      alert('❌ ' + ((res && res.error) || 'Lỗi lưu cấu hình'));
    }
  } catch(e) {
    alert('❌ Lỗi: ' + e.message);
  }
}

/* ============================================================
   XOÁ ẢNH / NHẠC
   ============================================================ */
async function clearLogo() {
  if (!confirm('Xoá logo?')) return;
  window.CONFIG.logo = '';
  const res = await saveRemoteConfig();
  if (res && res.success) {
    if (typeof applyLoginBranding === 'function') applyLoginBranding();
    renderAdminTools();
    alert('✅ Đã xoá logo');
  }
}

async function clearAvatar() {
  if (!confirm('Xoá avatar?')) return;
  window.CONFIG.avatar = '';
  const res = await saveRemoteConfig();
  if (res && res.success) {
    if (typeof applyDefaultAvatar === 'function') applyDefaultAvatar();
    renderAdminTools();
    alert('✅ Đã xoá avatar');
  }
}

async function clearQR() {
  if (!confirm('Xoá QR?')) return;
  window.CONFIG.bank = window.CONFIG.bank || {};
  window.CONFIG.bank.qr = '';
  const res = await saveRemoteConfig();
  if (res && res.success) {
    if (typeof buildBankInfo === 'function') buildBankInfo();
    renderAdminTools();
    alert('✅ Đã xoá QR');
  }
}

async function clearMusic() {
  if (!confirm('Xoá nhạc nền?')) return;
  stopMusic();
  window.CONFIG.music_url = '';
  const res = await saveRemoteConfig();
  if (res && res.success) {
    if (typeof applyMusic === 'function') applyMusic();
    renderAdminTools();
    alert('✅ Đã xoá nhạc');
  }
}

/* ============================================================
   TEST NHẠC — NGHE THỬ
   ============================================================ */
let _testAudio = null;

function testMusic() {
  const url = (document.getElementById('cfgMusicUrl') || {}).value?.trim();
  if (!url) return alert('⚠️ Chưa nhập URL nhạc!');

  const status = document.getElementById('musicStatus');
  if (status) status.textContent = '⏳ Đang tải nhạc...';

  /* Dừng nhạc cũ */
  if (_testAudio) {
    _testAudio.pause();
    _testAudio = null;
  }

  _testAudio = new Audio(url);
  _testAudio.volume = 0.5;
  _testAudio.loop = true;

  _testAudio.oncanplay = () => {
    if (status) status.textContent = '✅ Nhạc hợp lệ! Đang phát thử...';
  };

  _testAudio.onerror = () => {
    if (status) status.textContent = '❌ Không tải được nhạc!';
    alert('❌ Không phát được nhạc!\n\n' +
          'URL: ' + url + '\n\n' +
          'Kiểm tra:\n' +
          '• URL có đúng file .mp3 không?\n' +
          '• Link có cho phép truy cập không?\n' +
          '• Đã bật CORS chưa?');
  };

  _testAudio.play()
    .then(() => {
      if (status) status.textContent = '▶️ Đang phát nhạc thử...';
      /* Tự dừng sau 20s */
      setTimeout(() => {
        if (_testAudio) {
          _testAudio.pause();
          if (status) status.textContent = '⏸ Đã dừng test nhạc';
        }
      }, 20000);
    })
    .catch(e => {
      if (status) status.textContent = '❌ Lỗi phát nhạc';
      alert('❌ Không phát được nhạc!\n' + e.message);
    });
}

function stopMusic() {
  if (_testAudio) {
    _testAudio.pause();
    _testAudio.currentTime = 0;
    _testAudio = null;
  }
  const status = document.getElementById('musicStatus');
  if (status) status.textContent = '⏸ Đã dừng';
}

/* ============================================================
   TOOLS CRUD
   ============================================================ */
async function addNewTool() {
  const name = (document.getElementById('ntName') || {}).value?.trim();
  const cat = (document.getElementById('ntCat') || {}).value || 'taixiu';
  const kind = (document.getElementById('ntKind') || {}).value || 'view';
  const gameUrl = (document.getElementById('ntGameUrl') || {}).value?.trim() || '';
  const apiUrl = (document.getElementById('ntApiUrl') || {}).value?.trim() || '';
  const sort = parseInt((document.getElementById('ntSort') || {}).value) || 99;

  if (!name) return alert('⚠️ Nhập tên tool!');

  let image = '';
  const f = document.getElementById('ntImage').files[0];
  if (f) image = await fileToBase64(f, 200, 0.85);

  const slug = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

  const newTool = {
    name, slug, cat, kind,
    game_url: gameUrl,
    api_url: apiUrl,
    tables_api: '',
    image,
    hot: document.getElementById('ntHot').checked ? 1 : 0,
    vip: document.getElementById('ntVip').checked ? 1 : 0,
    is_new: document.getElementById('ntNew').checked ? 1 : 0,
    enabled: 1,
    maintenance: 0,
    sort
  };

  window.CONFIG.ports = window.CONFIG.ports || [];
  window.CONFIG.ports.push(newTool);

  const res = await saveRemoteConfig();
  if (res && res.success) {
    alert('✅ Đã thêm tool: ' + name);
    renderAdminTools();
    if (typeof buildCatTabs === 'function') buildCatTabs();
    if (typeof buildPorts === 'function') buildPorts();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
    window.CONFIG.ports.pop();
  }
}

async function editTool(idx) {
  const t = window.CONFIG.ports[idx];
  if (!t) return;
  const name = prompt('Tên tool:', t.name); if (name === null) return;
  const gameUrl = prompt('URL Game:', t.game_url || ''); if (gameUrl === null) return;
  const apiUrl = prompt('API URL:', t.api_url || ''); if (apiUrl === null) return;
  const sortStr = prompt('Thứ tự:', t.sort || 99); if (sortStr === null) return;

  const old = { name: t.name, game_url: t.game_url, api_url: t.api_url, sort: t.sort };
  t.name = name.trim() || t.name;
  t.game_url = gameUrl.trim();
  t.api_url = apiUrl.trim();
  t.sort = parseInt(sortStr) || 99;

  const res = await saveRemoteConfig();
  if (res && res.success) {
    alert('✅ Đã sửa: ' + t.name);
    renderAdminTools();
    if (typeof buildPorts === 'function') buildPorts();
  } else {
    Object.assign(t, old);
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

async function toggleTool(idx, field) {
  const t = window.CONFIG.ports[idx];
  if (!t) return;
  t[field] = t[field] ? 0 : 1;
  const res = await saveRemoteConfig();
  if (res && res.success) {
    renderAdminTools();
    if (typeof buildCatTabs === 'function') buildCatTabs();
    if (typeof buildPorts === 'function') buildPorts();
  } else {
    t[field] = t[field] ? 0 : 1;
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

async function deleteTool(idx) {
  const t = window.CONFIG.ports[idx];
  if (!t) return;
  if (!confirm('🗑 Xoá tool "' + t.name + '"?')) return;
  const removed = window.CONFIG.ports.splice(idx, 1)[0];
  const res = await saveRemoteConfig();
  if (res && res.success) {
    alert('✅ Đã xoá: ' + removed.name);
    renderAdminTools();
    if (typeof buildCatTabs === 'function') buildCatTabs();
    if (typeof buildPorts === 'function') buildPorts();
  } else {
    window.CONFIG.ports.splice(idx, 0, removed);
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

/* ============================================================
   4. KEYS
   ============================================================ */
async function renderAdminKeys() {
  const s = getSession(); if (!s) return;
  const el = document.getElementById('adminKeysView'); if (!el) return;

  const res = await api('key_list', { email: s.email, password: s.password });
  const keys = (res && res.success) ? (res.keys || []) : [];

  let html = `
    <div class="adm-section">
      <h4>🔑 Tạo Key mới</h4>
      <label style="font-size:11px;font-weight:700">Số ngày</label>
      <input class="adm-input" id="keyDays" type="number" value="30" min="1">
      <label style="font-size:11px;font-weight:700">Số lượng</label>
      <input class="adm-input" id="keyQty" type="number" value="1" min="1" max="100">
      <label style="font-size:11px;font-weight:700">Ghi chú</label>
      <input class="adm-input" id="keyNote" placeholder="VD: Tặng khách VIP">
      <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="adminGenKeys()">➕ TẠO KEY</button>
    </div>
    <p style="text-align:center;font-size:12px;color:#64748b;margin:14px 0 8px">📦 Tổng: <b>${keys.length}</b> key</p>
  `;

  if (!keys.length) {
    html += '<p style="text-align:center;color:#94a3b8">Chưa có key nào</p>';
  } else {
    keys.forEach(k => {
      const used = k.used == 1;
      html += `
        <div class="adm-row" style="border-left:3px solid ${used ? '#ef4444' : '#22c55e'}">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <b style="font-family:monospace;color:#0284c7;font-size:13px;word-break:break-all">${esc(k.code)}</b>
            <span style="font-size:11px;font-weight:800;color:${used ? '#ef4444' : '#16a34a'}">${used ? '🔴 ĐÃ DÙNG' : '🟢 CHƯA DÙNG'}</span>
          </div>
          <div class="info">⏱ ${k.days} ngày</div>
          ${k.used_by ? `<div class="info">👤 ${esc(k.used_by)}</div>` : ''}
          <div class="acts">
            <button class="b5" onclick="adminDelKey('${esc(k.code)}')">🗑 Xoá</button>
          </div>
        </div>`;
    });
  }
  el.innerHTML = html;
}

async function adminGenKeys() {
  const days = parseInt(document.getElementById('keyDays').value) || 30;
  const qty = Math.min(100, Math.max(1, parseInt(document.getElementById('keyQty').value) || 1));
  const note = document.getElementById('keyNote').value.trim();
  if (!confirm(`Tạo ${qty} key loại ${days} ngày?`)) return;
  const s = getSession();
  const res = await api('key_create', { email: s.email, password: s.password, days, qty, note });
  if (res && res.success) {
    alert('✅ Đã tạo ' + (res.keys || []).length + ' key:\n\n' + (res.keys || []).join('\n'));
    renderAdminKeys();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
}

async function adminDelKey(code) {
  if (!confirm('Xoá key ' + code + '?')) return;
  const s = getSession();
  const res = await api('key_delete', { email: s.email, password: s.password, code });
  if (res && res.success) {
    alert('✅ Đã xoá');
    renderAdminKeys();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi'));
}

/* ============================================================
   5. LỊCH SỬ
   ============================================================ */
async function renderAdminHistory() {
  const s = getSession(); if (!s) return;
  const el = document.getElementById('adminHistoryView'); if (!el) return;

  const res = await api('history', { email: s.email, password: s.password });
  const hist = (res && res.success) ? (res.history || []) : [];

  if (!hist.length) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có giao dịch</p>';
    return;
  }

  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Hiển thị ${Math.min(hist.length, 100)} / ${hist.length}</p>`;
  hist.slice(0, 100).forEach(h => {
    const amt = Number(h.amount) || 0;
    const color = amt > 0 ? '#16a34a' : (amt < 0 ? '#dc2626' : '#3b5bfd');
    const sign = amt > 0 ? '+' : '';
    const time = new Date(Number(h.at)).toLocaleString('vi-VN');
    html += `
      <div class="adm-row" style="border-left:3px solid ${color}">
        <div><b>${esc((h.type || '').toUpperCase())}</b> — ${esc(h.note || '')}</div>
        ${amt ? `<div style="font-size:12px">Số tiền: <b style="color:${color}">${sign}${fmt(amt)}</b></div>` : ''}
        <div style="font-size:11px;color:#94a3b8">🕐 ${time}</div>
      </div>`;
  });
  el.innerHTML = html;
}

/* ============================================================
   EXPOSE
   ============================================================ */
window.openAdmin = openAdmin;
window.switchAdminTab = switchAdminTab;
window.renderAdminPending = renderAdminPending;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.renderAdminUsers = renderAdminUsers;
window.adminResetIP = adminResetIP;
window.adminAdjustBalance = adminAdjustBalance;
window.adminDeleteUser = adminDeleteUser;
window.renderAdminTools = renderAdminTools;
window.addNewTool = addNewTool;
window.editTool = editTool;
window.toggleTool = toggleTool;
window.deleteTool = deleteTool;
window.saveSiteConfig = saveSiteConfig;
window.clearLogo = clearLogo;
window.clearAvatar = clearAvatar;
window.clearQR = clearQR;
window.clearMusic = clearMusic;
window.testMusic = testMusic;
window.stopMusic = stopMusic;
window.renderAdminKeys = renderAdminKeys;
window.adminGenKeys = adminGenKeys;
window.adminDelKey = adminDelKey;
window.renderAdminHistory = renderAdminHistory;
window.fileToBase64 = fileToBase64;
