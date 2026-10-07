/* ============================================================
   AUTH.JS — ĐĂNG NHẬP / ĐĂNG KÝ / KÍCH HOẠT KEY / NẠP TIỀN
   ============================================================ */

function _$(id) { return document.getElementById(id); }

function _setLoading(spinnerId, btnTextId, text, loading) {
  const sp = _$(spinnerId), bt = _$(btnTextId);
  if (sp) sp.style.display = loading ? 'inline-block' : 'none';
  if (bt) bt.innerHTML = text;
}
function _setError(msg) { const b = _$('loginError'); if (b) b.textContent = msg || ''; }
function _setKeyError(msg) { const b = _$('keyErr'); if (b) b.textContent = msg || ''; }

/* ==================== LẤY IP ==================== */
let _cachedIP = null, _ipFetching = null;
async function getIP() {
  if (_cachedIP) return _cachedIP;
  if (_ipFetching) return _ipFetching;

  _ipFetching = (async () => {
    const apis = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json'
    ];
    for (const url of apis) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const ip = data.ip || data.query;
        if (ip && typeof ip === 'string' && ip.length > 3) {
          _cachedIP = ip;
          return ip;
        }
      } catch (e) {}
    }
    return 'unknown';
  })();

  return _ipFetching;
}

/* ==================== SWITCH TAB ==================== */
function switchTab(tab) {
  _setError('');
  const tl = _$('tabLogin'), tr = _$('tabReg');
  const fl = _$('formLogin'), fr = _$('formReg');
  if (tab === 'login') {
    if (tl) tl.classList.add('active');
    if (tr) tr.classList.remove('active');
    if (fl) fl.style.display = '';
    if (fr) fr.style.display = 'none';
  } else {
    if (tr) tr.classList.add('active');
    if (tl) tl.classList.remove('active');
    if (fr) fr.style.display = '';
    if (fl) fl.style.display = 'none';
  }
}

/* ==================== ĐĂNG KÝ ==================== */
async function doRegister() {
  _setError('');
  try {
    const name  = (_$('regName')  ? _$('regName').value  : '').trim();
    const email = (_$('regEmail') ? _$('regEmail').value : '').trim().toLowerCase();
    const p1    = _$('regPass')   ? _$('regPass').value  : '';
    const p2    = _$('regPass2')  ? _$('regPass2').value : '';

    if (!name || !email || !p1 || !p2)  return _setError('⚠️ Vui lòng nhập đầy đủ thông tin!');
    if (name.length < 2)                return _setError('⚠️ Tên hiển thị phải từ 2 ký tự!');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return _setError('⚠️ Email không hợp lệ!');
    if (p1.length < 6)                  return _setError('⚠️ Mật khẩu phải từ 6 ký tự!');
    if (p1 !== p2)                      return _setError('⚠️ Mật khẩu nhập lại không khớp!');

    _setLoading('regSpinner', 'btnRegText', '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...', true);

    const data = await api('register', { name, email, password: p1 });

    if (data && data.success) {
      if (_$('regName'))  _$('regName').value  = '';
      if (_$('regEmail')) _$('regEmail').value = '';
      if (_$('regPass'))  _$('regPass').value  = '';
      if (_$('regPass2')) _$('regPass2').value = '';
      alert('✅ ĐĂNG KÝ THÀNH CÔNG!\n\n📧 ' + email + '\n\nVui lòng đăng nhập.');
      switchTab('login');
    } else {
      _setError('❌ ' + ((data && data.error) || 'Đăng ký thất bại!'));
    }
  } catch (err) {
    _setError('❌ ' + err.message);
  } finally {
    _setLoading('regSpinner', 'btnRegText', '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ', false);
  }
}

/* ==================== ĐĂNG NHẬP ==================== */
async function doLogin() {
  _setError('');
  try {
    const email = (_$('loginEmail') ? _$('loginEmail').value : '').trim().toLowerCase();
    const pass  = _$('loginPass') ? _$('loginPass').value : '';

    if (!email || !pass) return _setError('⚠️ Vui lòng nhập Email và Mật khẩu!');

    _setLoading('loginSpinner', 'btnLoginText', '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG NHẬP...', true);

    const data = await api('login', { email, password: pass });

    if (data && data.success && data.user) {
      if (email === ADMIN_EMAIL) data.user.is_admin = 1;
      setSessionData(email, pass, data.user);
      if (typeof enterApp === 'function') enterApp();
    } else {
      _setError('❌ ' + ((data && data.error) || 'Sai email hoặc mật khẩu!'));
    }
  } catch (err) {
    _setError('❌ ' + err.message);
  } finally {
    _setLoading('loginSpinner', 'btnLoginText', '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP', false);
  }
}

/* ==================== ĐĂNG XUẤT ==================== */
async function doLogout() {
  if (!confirm('Bạn chắc chắn muốn đăng xuất?')) return;
  clearSession();
  localStorage.removeItem('bs_current');
  location.reload();
}

/* ==================== KÍCH HOẠT KEY ==================== */
async function activateKey() {
  _setKeyError('');
  try {
    const keyInput = _$('keyInput');
    const key = (keyInput ? keyInput.value : '').trim().toUpperCase();
    if (!key) return _setKeyError('⚠️ Vui lòng nhập Key!');

    const s = getSession();
    if (!s) return _setKeyError('⚠️ Vui lòng đăng nhập lại!');

    const data = await api('key_activate', { email: s.email, password: s.password, code: key });

    if (data && data.success) {
      alert('✅ KÍCH HOẠT THÀNH CÔNG!\n\n🔑 Key: ' + key +
        (data.days ? '\n⏱ +' + data.days + ' ngày' : '') +
        (data.new_expiry ? '\n📅 Hạn mới: ' + new Date(Number(data.new_expiry)).toLocaleString('vi-VN') : ''));
      if (typeof closeModal === 'function') closeModal('keyModal');
      await apiGetUser();
      if (typeof renderAll === 'function') renderAll();
    } else {
      _setKeyError('❌ ' + ((data && data.error) || 'Key không hợp lệ!'));
    }
  } catch (err) {
    _setKeyError('❌ ' + err.message);
  }
}

/* ==================== NẠP TIỀN ==================== */
async function submitDeposit() {
  try {
    const amount = Number(_$('depAmount') ? _$('depAmount').value : 0);
    const note   = _$('depNote') ? _$('depNote').value.trim() : '';
    if (!amount || amount < 10000) return alert('Số tiền tối thiểu 10.000đ');

    const s = getSession();
    if (!s) return alert('Vui lòng đăng nhập lại!');

    const data = await api('deposit_create', { email: s.email, password: s.password, amount, note });

    if (data && data.success) {
      alert('✅ ' + (data.message || 'Đã gửi yêu cầu nạp tiền!'));
      if (typeof closeModal === 'function') closeModal('depositModal');
      if (typeof renderAll === 'function') renderAll();
    } else {
      alert('❌ ' + ((data && data.error) || 'Lỗi gửi yêu cầu'));
    }
  } catch (err) {
    alert('❌ ' + err.message);
  }
}

/* ==================== EXPOSE ==================== */
window.getIP = getIP;
window.switchTab = switchTab;
window.doRegister = doRegister;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.activateKey = activateKey;
window.submitDeposit = submitDeposit;
