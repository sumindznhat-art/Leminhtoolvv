/* ============================================================
   APP.JS — HOÀN CHỈNH
   Load config • Render ports • Load music • Avatar • Branding
   ============================================================ */

let _currentCat = 'all';

/* ==================== KHỞI ĐỘNG ==================== */
document.addEventListener('DOMContentLoaded', async () => {
  await loadRemoteConfig();

  const s = getSession();
  if (s && s.user) {
    enterApp();
  } else {
    applyLoginBranding();
    applyMusic();
    const ls = document.getElementById('login-screen');
    if (ls) ls.style.display = '';
  }

  ['loginEmail','loginPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });
  ['regName','regEmail','regPass','regPass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  });

  document.addEventListener('click', function once() {
    const audio = document.getElementById('bgMusic');
    if (audio && audio.src && audio.paused && window.CONFIG.music_url) {
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }
    document.removeEventListener('click', once);
  }, { once: true });

  startClock();
});

/* ============================================================
   LOAD CONFIG
   ============================================================ */
async function loadRemoteConfig() {
  try {
    const res = await api('config_get');
    if (res && res.success && res.config) {
      const remote = res.config;
      const safeKeys = ['API_BASE','site_name','site_desc','marquee','footer','support_link','logo','avatar','music_url'];
      safeKeys.forEach(k => {
        if (remote[k] !== undefined && remote[k] !== '') window.CONFIG[k] = remote[k];
      });
      if (remote.bank) window.CONFIG.bank = Object.assign({}, window.CONFIG.bank, remote.bank);
      if (Array.isArray(remote.packages) && remote.packages.length) window.CONFIG.packages = remote.packages;
      if (Array.isArray(remote.ports) && remote.ports.length > 0) window.CONFIG.ports = remote.ports;
    }
  } catch (e) { console.warn('Load remote config fail', e); }
}

async function saveRemoteConfig() {
  const s = getSession();
  if (!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('config_save', { email: s.email, password: s.password, config: window.CONFIG });
}

/* ============================================================
   BRANDING
   ============================================================ */
function applyLoginBranding() {
  const title = document.getElementById('loginSiteName');
  if (title && window.CONFIG.site_name) title.textContent = window.CONFIG.site_name;
  const sub = document.getElementById('subText');
  if (sub && window.CONFIG.site_desc) sub.textContent = window.CONFIG.site_desc;
  const marquee = document.getElementById('marqueeText');
  if (marquee && window.CONFIG.marquee) marquee.textContent = window.CONFIG.marquee;
  const brand = document.getElementById('hdrBrand');
  if (brand && window.CONFIG.site_name) brand.textContent = window.CONFIG.site_name;
  const footer = document.querySelector('.login-footer');
  if (footer && window.CONFIG.footer) footer.textContent = window.CONFIG.footer;
  const dFoot = document.querySelector('.drawer-foot');
  if (dFoot && window.CONFIG.footer) dFoot.textContent = window.CONFIG.footer;

  /* Logo hiện trên trang login */
  if (window.CONFIG.logo) {
    const lg = document.getElementById('loginAvatarImg');
    if (lg) lg.src = window.CONFIG.logo;
  }
}

/* ============================================================
   MUSIC
   ============================================================ */
function applyMusic() {
  const audio = document.getElementById('bgMusic');
  if (!audio) return;
  if (window.CONFIG.music_url) {
    audio.src = window.CONFIG.music_url;
    audio.loop = true;
    audio.volume = 0.5;
  } else {
    audio.removeAttribute('src');
    try { audio.load(); } catch(e) {}
  }
}

/* ============================================================
   AVATAR MẶC ĐỊNH
   ============================================================ */
function applyDefaultAvatar() {
  const s = getSession();
  if (!s || !s.user) return;
  const u = s.user;
  const av = u.avatar || getAvatarFromStorage() || window.CONFIG.avatar || DEFAULT_AVATAR;
  applyAvatarEverywhere(av);
}

/* ============================================================
   VÀO APP
   ============================================================ */
async function enterApp() {
  const ls = document.getElementById('login-screen'); if (ls) ls.style.display = 'none';
  const app = document.getElementById('app'); if (app) app.style.display = 'flex';

  const s = getSession();
  if (!s) { doLogout(); return; }
  let u = s.user;

  try {
    const res = await api('get_user', { email: s.email, password: s.password });
    if (res && res.success && res.user) {
      u = res.user;
      if (s.email.toLowerCase() === ADMIN_EMAIL) u.is_admin = 1;
      refreshUser(u);
    }
  } catch (e) {}

  if (!u) { doLogout(); return; }

  const isAdmin = (u.email === ADMIN_EMAIL) || (u.is_admin == 1);
  const float = document.getElementById('adminFloat');
  const diAdm = document.getElementById('diAdmin');
  if (float) float.style.display = isAdmin ? 'flex' : 'none';
  if (diAdm) diAdm.style.display = isAdmin ? '' : 'none';

  const av = u.avatar || getAvatarFromStorage() || window.CONFIG.avatar || DEFAULT_AVATAR;
  applyAvatarEverywhere(av);

  const dn = document.getElementById('drawerName'); if (dn) dn.textContent = u.name || 'User';
  const de = document.getElementById('drawerEmail'); if (de) de.textContent = u.email;

  if (isAdmin) {
    try {
      const res = await api('deposit_pending', { email: s.email, password: s.password });
      const cnt = res && res.success ? (res.deposits || []).length : 0;
      const b = document.getElementById('pendBadge');
      if (b) { b.textContent = cnt; b.style.display = cnt ? 'inline-block' : 'none'; }
    } catch (e) {}
  }

  applyLoginBranding();
  applyMusic();
  buildBankInfo();
  buildPackages();
  buildCatTabs();
  buildPorts();
  renderAll();
  showPage('home');
}

/* ============================================================
   ĐIỀU HƯỚNG
   ============================================================ */
function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  const el = document.getElementById('page-' + p);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === p));
  const c = document.getElementById('appContent');
  if (c) c.scrollTop = 0;
  if (p === 'deposit' || p === 'vip' || p === 'profile') renderAll();
}

/* ============================================================
   ĐỒNG HỒ
   ============================================================ */
function startClock() {
  setInterval(() => {
    const d = new Date();
    const t = d.toLocaleTimeString('vi-VN', { hour12: false });
    const dt = d.toLocaleDateString('vi-VN');
    const a = document.getElementById('liveClock'); if (a) a.textContent = t;
    const b = document.getElementById('liveDate'); if (b) b.textContent = dt;
  }, 1000);
}

/* ============================================================
   RENDER CHUNG
   ============================================================ */
function renderAll() {
  const s = getSession();
  if (!s || !s.user) return;
  const u = s.user;

  const bal = fmt(u.balance || 0);
  ['hdrBalance','curBalance','depBalance','vipBalance','profBalance'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = bal;
  });

  const pn = document.getElementById('profName');       if (pn) pn.textContent = u.name || 'User';
  const pr = document.getElementById('profRole');       if (pr) pr.textContent = (u.is_admin == 1 || u.email === ADMIN_EMAIL) ? 'ADMIN' : 'THÀNH VIÊN';
  const pj = document.getElementById('profJoined');     if (pj) pj.textContent = u.created_at ? new Date(Number(u.created_at)).toLocaleDateString('vi-VN') : '—';
  const pl = document.getElementById('profLastLogin');  if (pl) pl.textContent = u.last_login ? new Date(Number(u.last_login)).toLocaleString('vi-VN') : '—';
  const pi = document.getElementById('profIP');         if (pi) pi.textContent = u.ip || '—';

  const hasVip = Number(u.key_expiry) > Date.now();
  const cp = document.getElementById('curPackage');     if (cp) cp.textContent = hasVip ? 'VIP' : 'Chưa có';
  const ve = document.getElementById('vipExpiry');      if (ve) ve.textContent = hasVip ? new Date(Number(u.key_expiry)).toLocaleString('vi-VN') : 'Chưa kích hoạt';
  const ds = document.getElementById('depStatus');      if (ds) ds.textContent = hasVip ? 'VIP đến ' + new Date(Number(u.key_expiry)).toLocaleDateString('vi-VN') : 'Chưa có key';
}

/* ============================================================
   BANK INFO
   ============================================================ */
function buildBankInfo() {
  const el = document.getElementById('bankInfo');
  if (!el) return;
  const b = window.CONFIG.bank || {};
  el.innerHTML = `
    <div class="section-title">Thông tin chuyển khoản</div>
    <div class="pay-method" style="cursor:default">
      <div class="pay-icon"><i class="fa-solid fa-building-columns"></i></div>
      <div class="pay-info">
        <div class="name">${esc(b.name || '—')}</div>
        <div class="desc">STK: <b>${esc(b.account || '—')}</b> — ${esc(b.owner || '—')}</div>
      </div>
    </div>
    ${b.qr ? `<div class="bank-qr"><img src="${b.qr}" alt="QR"><div class="hint">📱 Quét mã QR để chuyển khoản</div></div>` : ''}
  `;
}

/* ============================================================
   PACKAGES
   ============================================================ */
function buildPackages() {
  const el = document.getElementById('pkgList');
  if (!el) return;
  const pkgs = window.CONFIG.packages || [];
  el.innerHTML = pkgs.map(p => `
    <div class="pay-method" onclick="buyPackage('${p.id}')">
      <div class="pay-icon yellow"><i class="fa-solid fa-crown"></i></div>
      <div class="pay-info">
        <div class="name">${esc(p.name)}</div>
        <div class="desc">${p.days} ngày • <b>${fmt(p.price)}</b></div>
      </div>
      <i class="fa-solid fa-chevron-right pay-arrow"></i>
    </div>
  `).join('');
}

async function buyPackage(id) {
  const pkg = (window.CONFIG.packages || []).find(x => x.id === id);
  if (!pkg) return;
  const s = getSession();
  if (!s) return alert('Vui lòng đăng nhập lại!');
  const u = s.user;
  if ((u.balance || 0) < pkg.price) { alert('Số dư không đủ! Vui lòng nạp thêm.'); showPage('deposit'); return; }
  if (!confirm('Mua ' + pkg.name + ' với giá ' + fmt(pkg.price) + '?')) return;

  const res = await apiBuyPackage(pkg.days, pkg.price);
  if (res && res.success) {
    alert('✅ Mua thành công!');
    await apiGetUser();
    renderAll();
  } else alert('❌ ' + ((res && res.error) || 'Lỗi mua gói'));
}

/* ============================================================
   CATEGORY TABS
   ============================================================ */
function buildCatTabs() {
  const el = document.getElementById('catTabs');
  if (!el) return;
  const ports = window.CONFIG.ports || [];

  const cats = {
    all: ports.filter(p => p.enabled).length,
    taixiu: ports.filter(p => p.enabled && p.cat === 'taixiu').length,
    sicbo: ports.filter(p => p.enabled && p.cat === 'sicbo').length,
    baccarat: ports.filter(p => p.enabled && p.cat === 'baccarat').length,
    hot: ports.filter(p => p.enabled && p.hot == 1).length
  };

  const tabs = [
    { key: 'all', label: '🎯 Tất cả', count: cats.all },
    { key: 'taixiu', label: '🎲 Tài Xỉu', count: cats.taixiu },
    { key: 'sicbo', label: '🎰 Sicbo', count: cats.sicbo },
    { key: 'baccarat', label: '🃏 Baccarat', count: cats.baccarat },
    { key: 'hot', label: '🔥 HOT', count: cats.hot }
  ];

  el.innerHTML = tabs.map(t => `
    <button class="cat-tab ${t.key === _currentCat ? 'active' : ''}" data-cat="${t.key}" onclick="switchCat('${t.key}')">
      ${t.label} <span style="opacity:.7;font-size:10px">(${t.count})</span>
    </button>
  `).join('');
}

function switchCat(cat) {
  _currentCat = cat;
  document.querySelectorAll('.cat-tab').forEach(x => x.classList.toggle('active', x.dataset.cat === cat));
  buildPorts();
}

/* ============================================================
   RENDER PORTS
   ============================================================ */
function buildPorts() {
  const el = document.getElementById('toolList');
  if (!el) return;
  const ports = window.CONFIG.ports || [];

  let list = ports.filter(p => p.enabled);
  if (_currentCat !== 'all') {
    if (_currentCat === 'hot') list = list.filter(p => p.hot == 1);
    else list = list.filter(p => p.cat === _currentCat);
  }

  list.sort((a, b) => (a.sort || 0) - (b.sort || 0));

  const tc = document.getElementById('toolCount');
  if (tc) tc.textContent = list.length;

  if (!list.length) {
    el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px 20px">Không có tool nào trong mục này</p>';
    return;
  }

  const s = getSession();
  const u = s ? s.user : null;
  const hasVip = u ? (Number(u.key_expiry) > Date.now() || u.is_admin == 1 || u.email === ADMIN_EMAIL) : false;

  el.innerHTML = list.map(t => {
    const img = getToolImage(t);
    const badges = [];
    if (t.hot == 1) badges.push('<span class="tool-badge-hot">🔥 HOT</span>');
    if (t.is_new == 1) badges.push('<span class="tool-badge-new">✨ NEW</span>');
    if (t.maintenance == 1) badges.push('<span class="tool-badge-maint">🚧 BẢO TRÌ</span>');

    const canOpen = hasVip || t.vip == 0;
    const statusClass = canOpen && !t.maintenance ? 'ok' : '';
    const statusText = t.maintenance ? 'Bảo trì' : (canOpen ? 'Đã mở' : 'Cần VIP');
    const kindIcon = t.kind === 'panel' ? 'fa-chart-line' : (t.kind === 'baccarat' ? 'fa-diamond' : 'fa-gamepad');

    return `
      <div class="tool-card ${t.maintenance ? 'disabled' : ''}" onclick="openTool('${t.slug}')">
        <div class="tool-head">
          <div class="tool-logo">
            ${img ? `<img src="${img}" alt="${esc(t.name)}" onerror="this.style.display='none';this.parentNode.innerHTML='<i class=\\'fa-solid fa-${kindIcon}\\' style=\\'color:#a855f7;font-size:22px\\'></i>'">` : `<i class="fa-solid fa-${kindIcon}" style="color:#a855f7;font-size:22px"></i>`}
          </div>
          <div class="tool-info">
            <div class="tool-name-row">
              <div class="tool-name">${esc(t.name)}</div>
              ${badges.join('')}
            </div>
            <div class="tool-desc">
              ${t.kind === 'panel' ? '📊 Chỉ panel AI (không cần vào game)' :
                t.kind === 'baccarat' ? '🃏 Baccarat AI - Phân tích cầu' :
                '🎮 Vào game trực tiếp'}
            </div>
          </div>
        </div>
        <div class="tool-footer">
          <div class="vip-req ${statusClass}">
            <span class="dot"></span> ${statusText}
          </div>
          <button class="tool-btn ${canOpen && !t.maintenance ? 'unlocked' : ''}">
            ${t.maintenance ? '<i class="fa-solid fa-hammer"></i> BẢO TRÌ' :
              (canOpen ? '<i class="fa-solid fa-play"></i> MỞ TOOL' : '<i class="fa-solid fa-lock"></i> MỞ KHOÁ')}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   NẠP TIỀN
   ============================================================ */
function openDepositModal() {
  const a = document.getElementById('depAmount'); if (a) a.value = '';
  const n = document.getElementById('depNote');   if (n) n.value = '';
  openModal('depositModal');
}

/* ============================================================
   LỊCH SỬ
   ============================================================ */
async function openHistoryDeposit() {
  const s = getSession();
  if (!s) return;
  const res = await api('history', { email: s.email, password: s.password });
  const hist = (res && res.success) ? (res.history || []) : [];
  const deps = hist.filter(h => h.type === 'deposit' || h.type === 'auto-buy');

  let html = deps.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có giao dịch</p>';
  deps.forEach(d => {
    const amt = Number(d.amount) || 0;
    const color = amt > 0 ? '#16a34a' : '#dc2626';
    const sign = amt > 0 ? '+' : '';
    html += `<div style="border-left:3px solid ${color};padding:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px">
      <div style="font-weight:700;color:${color}">${sign}${fmt(amt)}</div>
      <div style="font-size:12px;color:#64748b">${esc(d.note || '')}</div>
      <div style="font-size:11px;color:#94a3b8">${new Date(Number(d.at)).toLocaleString('vi-VN')}</div>
    </div>`;
  });
  const t = document.getElementById('histTitle'); if (t) t.textContent = 'Lịch sử nạp tiền';
  const c = document.getElementById('histContent'); if (c) c.innerHTML = html;
  openModal('historyModal');
}

async function openHistoryKey() {
  const s = getSession();
  if (!s) return;
  const res = await api('history', { email: s.email, password: s.password });
  const hist = (res && res.success) ? (res.history || []) : [];
  const keys = hist.filter(h => h.type === 'key' || h.type === 'buy');

  let html = keys.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có lịch sử</p>';
  keys.forEach(h => {
    html += `<div style="border-left:3px solid #8b5cf6;padding:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px">
      <div style="font-weight:700">${esc(h.note || h.type)}</div>
      <div style="font-size:12px;color:#64748b">${h.amount ? (h.amount > 0 ? '+' : '') + fmt(h.amount) : ''}</div>
      <div style="font-size:11px;color:#94a3b8">${new Date(Number(h.at)).toLocaleString('vi-VN')}</div>
    </div>`;
  });
  const t = document.getElementById('histTitle'); if (t) t.textContent = 'Lịch sử mua key';
  const c = document.getElementById('histContent'); if (c) c.innerHTML = html;
  openModal('historyModal');
}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('show'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('show'); }

function openKeyModal() {
  const ki = document.getElementById('keyInput'); if (ki) ki.value = '';
  const ke = document.getElementById('keyErr');   if (ke) ke.textContent = '';
  openModal('keyModal');
}

function openAvatarModal() {
  const st = document.getElementById('avStatus'); if (st) st.textContent = '';
  const inp = document.getElementById('avBase64Input'); if (inp) inp.value = '';
  openModal('avatarModal');
}

function saveAvatar() {
  const val = document.getElementById('avBase64Input').value.trim();
  const status = document.getElementById('avStatus');
  if (!val) { if (status) status.textContent = 'Chưa có dữ liệu'; return; }
  const src = val.startsWith('data:') ? val : 'data:image/png;base64,' + val;
  setAvatarToStorage(src);
  applyAvatarEverywhere(src);
  if (status) status.textContent = '✅ Đã lưu';
  setTimeout(() => closeModal('avatarModal'), 800);
}

function resetAvatar() {
  setAvatarToStorage('');
  applyAvatarEverywhere(window.CONFIG.avatar || DEFAULT_AVATAR);
  const status = document.getElementById('avStatus');
  if (status) status.textContent = '✅ Đã reset';
}

/* ============================================================
   DRAWER
   ============================================================ */
function openDrawer() {
  const d = document.getElementById('drawer'); if (d) d.classList.add('show');
  const m = document.getElementById('drawerMask'); if (m) m.classList.add('show');
}
function closeDrawer() {
  const d = document.getElementById('drawer'); if (d) d.classList.remove('show');
  const m = document.getElementById('drawerMask'); if (m) m.classList.remove('show');
}

/* ============================================================
   MUSIC BUTTON
   ============================================================ */
let _musicOn = false;
function toggleMusic() {
  const audio = document.getElementById('bgMusic');
  const btn = document.getElementById('musicBtn');
  if (!audio || !window.CONFIG.music_url) {
    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    return alert('Chưa cấu hình nhạc nền!');
  }
  if (_musicOn) {
    audio.pause();
    _musicOn = false;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  } else {
    audio.volume = 0.5;
    audio.play().catch(() => {});
    _musicOn = true;
    if (btn) btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }
}

/* ============================================================
   EXPOSE TO WINDOW
   ============================================================ */
window.enterApp = enterApp;
window.showPage = showPage;
window.renderAll = renderAll;
window.openDepositModal = openDepositModal;
window.openHistoryDeposit = openHistoryDeposit;
window.openHistoryKey = openHistoryKey;
window.openKeyModal = openKeyModal;
window.openAvatarModal = openAvatarModal;
window.saveAvatar = saveAvatar;
window.resetAvatar = resetAvatar;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.toggleMusic = toggleMusic;
window.buyPackage = buyPackage;
window.openModal = openModal;
window.closeModal = closeModal;
window.loadRemoteConfig = loadRemoteConfig;
window.saveRemoteConfig = saveRemoteConfig;
window.buildPorts = buildPorts;
window.buildCatTabs = buildCatTabs;
window.switchCat = switchCat;
window.buildBankInfo = buildBankInfo;
window.buildPackages = buildPackages;
window.applyLoginBranding = applyLoginBranding;
window.applyMusic = applyMusic;
window.applyDefaultAvatar = applyDefaultAvatar;
