/* ============================================================
   ADMIN.JS — QUẢN TRỊ TOÀN DIỆN
   Duyệt tiền • Users • Tools/Ports • Config • Keys • History
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
  } catch(e) {
    console.error('Admin load error:', e);
  }
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(x => x.classList.toggle('active', x.dataset.atab === t));
  const map = {
    pending: 'adminPendingView',
    users: 'adminUsersView',
    tools: 'adminToolsView',
    keys: 'adminKeysView',
    history: 'adminHistoryView'
  };
  Object.values(map).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(map[t]);
  if (target) target.style.display = '';
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
    alert('✅ Đã duyệt! Số dư mới của user: ' + fmt(res.new_balance));
    await renderAdminPending();
    await renderAdminUsers();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi duyệt tiền'));
  }
}

async function rejectDeposit(id) {
  const reason = prompt('Lý do từ chối:', 'Không hợp lệ');
  if (reason === null) return;
  const s = getSession();
  const res = await api('deposit_reject', { email: s.email, password: s.password, id, reason: reason || 'Không hợp lệ' });
  if (res && res.success) {
    alert('❌ Đã từ chối');
    await renderAdminPending();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

/* ============================================================
   2. QUẢN LÝ USERS
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
      ? new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN')
      : '—';
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
          <button class="b4" onclick="adminAdjustBalance('${esc(u.email)}', ${balance})">💵 Cộng/Trừ tiền</button>
          ${!isAdm ? `<button class="b5" onclick="adminDeleteUser('${esc(u.email)}')">🗑 Xoá</button>` : ''}
        </div>
      </div>`;
  });
  el.innerHTML = html;
}

async function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?\nUser sẽ phải đăng nhập lại và khoá vào IP mới.')) return;
  const s = getSession();
  const res = await api('user_reset_ip', { email: s.email, password: s.password, user_email: email });
  if (res && res.success) {
    alert('✅ Đã reset IP cho ' + email);
    await renderAdminUsers();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

async function adminAdjustBalance(email, currentBal) {
  const val = prompt(`Số dư hiện tại: ${fmt(currentBal)}\n\nNhập số tiền muốn CỘNG (âm để trừ):`, '10000');
  if (val === null) return;
  const delta = Number(val);
  if (isNaN(delta)) return alert('Số không hợp lệ');
  const newBal = currentBal + delta;

  const s = getSession();
  const res = await api('user_update', {
    email: s.email,
    password: s.password,
    user_email: email,
    balance: newBal
  });
  if (res && res.success) {
    alert('✅ Đã cập nhật số dư: ' + fmt(newBal));
    await renderAdminUsers();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

async function adminDeleteUser(email) {
  if (!confirm('⚠️ XOÁ VĨNH VIỄN user ' + email + '?')) return;
  const s = getSession();
  const res = await api('user_delete', { email: s.email, password: s.password, user_email: email });
  if (res && res.success) {
    alert('✅ Đã xoá user');
    await renderAdminUsers();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

/* ============================================================
   3. QUẢN LÝ TOOLS / PORTS
   ============================================================ */
async function renderAdminTools() {
  const el = document.getElementById('adminToolsView'); if (!el) return;
  const ports = window.CONFIG.ports || [];

  let html = `
    <div class="adm-section">
      <h4>➕ Thêm Game / Tool mới</h4>
      <label style="font-size:12px;font-weight:700">Tên tool *</label>
      <input class="adm-input" id="ntName" placeholder="VD: Sunwin Tài Xỉu">
      
      <label style="font-size:12px;font-weight:700">Danh mục *</label>
      <select class="adm-input" id="ntCat">
        <option value="taixiu">🎲 Tài Xỉu</option>
        <option value="sicbo">🎰 Sicbo</option>
        <option value="baccarat">🃏 Baccarat</option>
      </select>
      
      <label style="font-size:12px;font-weight:700">Loại *</label>
      <select class="adm-input" id="ntKind">
        <option value="view">👁 View (vào game + panel AI)</option>
        <option value="panel">📊 Panel (chỉ panel AI, không vào game)</option>
        <option value="baccarat">🃏 Baccarat (đặc biệt)</option>
      </select>
      
      <label style="font-size:12px;font-weight:700">URL Game</label>
      <input class="adm-input" id="ntGameUrl" placeholder="https://... (để trống nếu kind=panel)">
      
      <label style="font-size:12px;font-weight:700">API URL * (để phân tích)</label>
      <input class="adm-input" id="ntApiUrl" placeholder="https://api.../sessions">
      
      <label style="font-size:12px;font-weight:700">Thứ tự (sort)</label>
      <input class="adm-input" id="ntSort" type="number" value="99">
      
      <label style="font-size:12px;font-weight:700">Ảnh đại diện</label>
      <input type="file" id="ntImage" accept="image/*" class="adm-input" style="padding:6px">
      
      <div style="display:flex;gap:14px;margin:10px 0;flex-wrap:wrap">
        <label style="font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="ntHot"> 🔥 HOT
        </label>
        <label style="font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="ntNew"> ✨ NEW
        </label>
        <label style="font-size:12px;font-weight:700;display:flex;align-items:center;gap:5px">
          <input type="checkbox" id="ntVip" checked> 👑 VIP
        </label>
      </div>
      
      <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a)" onclick="addNewTool()">➕ THÊM TOOL</button>
    </div>

    <div class="adm-section" style="border-color:#fecdd3">
      <h4>⚙️ Cấu hình chung Site</h4>
      
      <label style="font-size:12px;font-weight:700">Tên Site</label>
      <input class="adm-input" id="cfgSiteName" value="${esc(window.CONFIG.site_name || '')}">
      
      <label style="font-size:12px;font-weight:700">Mô tả</label>
      <input class="adm-input" id="cfgSiteDesc" value="${esc(window.CONFIG.site_desc || '')}">
      
      <label style="font-size:12px;font-weight:700">Chữ chạy (Marquee)</label>
      <input class="adm-input" id="cfgMarquee" value="${esc(window.CONFIG.marquee || '')}">
      
      <label style="font-size:12px;font-weight:700">Tên ngân hàng</label>
      <input class="adm-input" id="cfgBankName" value="${esc((window.CONFIG.bank && window.CONFIG.bank.name) || '')}">
      
      <label style="font-size:12px;font-weight:700">Số tài khoản</label>
      <input class="adm-input" id="cfgBankAcc" value="${esc((window.CONFIG.bank && window.CONFIG.bank.account) || '')}">
      
      <label style="font-size:12px;font-weight:700">Chủ tài khoản</label>
      <input class="adm-input" id="cfgBankOwner" value="${esc((window.CONFIG.bank && window.CONFIG.bank.owner) || '')}">
      
      <label style="font-size:12px;font-weight:700">Ảnh QR ngân hàng</label>
      <input type="file" id="cfgQRFile" accept="image/*" class="adm-input" style="padding:6px">
      ${(window.CONFIG.bank && window.CONFIG.bank.qr) ? `<div style="text-align:center;margin-top:6px"><img src="${window.CONFIG.bank.qr}" style="max-width:120px;border-radius:8px;border:1px solid #e2e8f0"></div>` : ''}
      
      <label style="font-size:12px;font-weight:700;display:block;margin-top:10px">Logo / Avatar mặc định</label>
      <input type="file" id="cfgLogoFile" accept="image/*" class="adm-input" style="padding:6px">
      ${window.CONFIG.logo ? `<div style="text-align:center;margin-top:6px"><img src="${window.CONFIG.logo}" style="max-width:80px;border-radius:50%;border:2px solid #e2e8f0"></div>` : ''}
      
      <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);margin-top:10px" onclick="saveSiteConfig()">💾 LƯU CẤU HÌNH</button>
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
              ${img
                ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fa-solid fa-cube\\' style=\\'color:#a855f7\\'></i>'">`
                : `<i class="fa-solid fa-cube" style="color:#a855f7"></i>`}
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

async function addNewTool() {
  const name = (document.getElementById('ntName') || {}).value?.trim();
  const cat = (document.getElementById('ntCat') || {}).value || 'taixiu';
  const kind = (document.getElementById('ntKind') || {}).value || 'view';
  const gameUrl = (document.getElementById('ntGameUrl') || {}).value?.trim() || '';
  const apiUrl = (document.getElementById('ntApiUrl') || {}).value?.trim() || '';
  const sort = parseInt((document.getElementById('ntSort') || {}).value) || 99;

  if (!name) return alert('⚠️ Nhập tên tool!');
  if (!apiUrl && kind !== 'view') return alert('⚠️ Nhập API URL!');

  let image = '';
  const f = document.getElementById('ntImage').files[0];
  if (f) image = await fileToBase64(f);

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
    alert('❌ ' + ((res && res.error) || 'Lỗi lưu lên server'));
    window.CONFIG.ports.pop();
  }
}

async function editTool(idx) {
  const t = window.CONFIG.ports[idx];
  if (!t) return;

  const name = prompt('Tên tool:', t.name);
  if (name === null) return;
  const gameUrl = prompt('URL Game:', t.game_url || '');
  if (gameUrl === null) return;
  const apiUrl = prompt('API URL:', t.api_url || '');
  if (apiUrl === null) return;
  const sortStr = prompt('Thứ tự (sort):', t.sort || 99);
  if (sortStr === null) return;

  const oldVals = { name: t.name, game_url: t.game_url, api_url: t.api_url, sort: t.sort };
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
    Object.assign(t, oldVals);
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
   4. LƯU CẤU HÌNH SITE + BANK + LOGO
   ============================================================ */
async function saveSiteConfig() {
  const get = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  window.CONFIG.site_name = get('cfgSiteName') || 'TOOL BONSICOLA';
  window.CONFIG.site_desc = get('cfgSiteDesc');
  window.CONFIG.marquee = get('cfgMarquee');

  window.CONFIG.bank = window.CONFIG.bank || {};
  window.CONFIG.bank.name = get('cfgBankName');
  window.CONFIG.bank.account = get('cfgBankAcc');
  window.CONFIG.bank.owner = get('cfgBankOwner');

  // Upload QR
  const qrF = document.getElementById('cfgQRFile')?.files[0];
  if (qrF) {
    const qr = await fileToBase64(qrF);
    if (qr) window.CONFIG.bank.qr = qr;
  }

  // Upload Logo
  const logoF = document.getElementById('cfgLogoFile')?.files[0];
  if (logoF) {
    const logo = await fileToBase64(logoF);
    if (logo) window.CONFIG.logo = logo;
  }

  const res = await saveRemoteConfig();
  if (res && res.success) {
    alert('✅ Đã lưu cấu hình!');
    if (typeof applyLoginBranding === 'function') applyLoginBranding();
    if (typeof buildBankInfo === 'function') buildBankInfo();
    renderAdminTools();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi lưu cấu hình'));
  }
}

/* ============================================================
   5. QUẢN LÝ KEYS
   ============================================================ */
async function renderAdminKeys() {
  const s = getSession(); if (!s) return;
  const el = document.getElementById('adminKeysView'); if (!el) return;

  const res = await api('key_list', { email: s.email, password: s.password });
  const keys = (res && res.success) ? (res.keys || []) : [];

  let html = `
    <div class="adm-section">
      <h4>🔑 Tạo Key mới</h4>
      <label style="font-size:12px;font-weight:700">Số ngày</label>
      <input class="adm-input" id="keyDays" type="number" value="30" min="1">
      <label style="font-size:12px;font-weight:700">Số lượng</label>
      <input class="adm-input" id="keyQty" type="number" value="1" min="1" max="100">
      <label style="font-size:12px;font-weight:700">Ghi chú</label>
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
          ${k.used_at ? `<div class="info" style="font-size:11px;color:#94a3b8">🕐 ${new Date(Number(k.used_at)).toLocaleString('vi-VN')}</div>` : ''}
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
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi tạo key'));
  }
}

async function adminDelKey(code) {
  if (!confirm('Xoá key ' + code + '?')) return;
  const s = getSession();
  const res = await api('key_delete', { email: s.email, password: s.password, code });
  if (res && res.success) {
    alert('✅ Đã xoá');
    renderAdminKeys();
  } else {
    alert('❌ ' + ((res && res.error) || 'Lỗi'));
  }
}

/* ============================================================
   6. LỊCH SỬ
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

  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Hiển thị <b>${Math.min(hist.length, 100)}</b> / ${hist.length} giao dịch</p>`;

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
   7. HELPERS
   ============================================================ */
function fileToBase64(file) {
  return new Promise((resolve) => {
    if (!file) return resolve('');
    if (file.size > 3 * 1024 * 1024) {
      alert('⚠️ Ảnh quá lớn (max 3MB). Vui lòng nén lại!');
      return resolve('');
    }
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   8. EXPOSE TO WINDOW
   ============================================================ */
window.openAdmin = openAdmin;
window.switchAdminTab = switchAdminTab;

// Pending
window.renderAdminPending = renderAdminPending;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;

// Users
window.renderAdminUsers = renderAdminUsers;
window.adminResetIP = adminResetIP;
window.adminAdjustBalance = adminAdjustBalance;
window.adminDeleteUser = adminDeleteUser;

// Tools / Ports
window.renderAdminTools = renderAdminTools;
window.addNewTool = addNewTool;
window.editTool = editTool;
window.toggleTool = toggleTool;
window.deleteTool = deleteTool;
window.saveSiteConfig = saveSiteConfig;

// Keys
window.renderAdminKeys = renderAdminKeys;
window.adminGenKeys = adminGenKeys;
window.adminDelKey = adminDelKey;

// History
window.renderAdminHistory = renderAdminHistory;

// Helper
window.fileToBase64 = fileToBase64;
