/* =========================================================
   Don Steve Capital Trust Bank — Dashboard
   ========================================================= */
(function () {
  'use strict';

  const API = '/api';
  const state = {
    user: null,
    accounts: [],
    transactions: [],
    txFilter: 'all',
    range: 30,
    notifications: [
      { id: 1, type: 'success', text: 'Deposit of $500.00 completed', time: '2 min ago', unread: true },
      { id: 2, type: 'info',    text: 'New login from Chrome on Windows', time: '1 hour ago', unread: true },
      { id: 3, type: 'warn',    text: 'Your debit card expires in 30 days', time: '3 hours ago', unread: true },
    ],
  };

  /* ---------- DOM helpers ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const fmtCurrency = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  const fmtDate = (d) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const shortDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const initials = (first, last) =>
    `${(first || '?')[0] || ''}${(last || '?')[0] || ''}`.toUpperCase();

  /* ---------- API ---------- */
  async function api(path, options = {}) {
    const res = await fetch(API + path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
      }
      throw new Error(data.message || 'Request failed');
    }
    return data;
  }

  /* ---------- Toast ---------- */
  function toast(message, type = 'info') {
    const stack = $('#toastStack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = `ds-toast ds-toast--${type}`;
    const icons = {
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M12 8v4m0 4h.01" stroke-width="2" stroke-linecap="round"/></svg>',
      info:    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M12 16v-4m0-4h.01" stroke-width="2" stroke-linecap="round"/></svg>',
    };
    el.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      setTimeout(() => el.remove(), 300);
    }, 3800);
  }

  /* ---------- Modal helpers ---------- */
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('is-open');
    const firstInput = m.querySelector('input, select, button');
    setTimeout(() => firstInput?.focus(), 50);
    document.addEventListener('keydown', onModalKey);
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('is-open');
    document.removeEventListener('keydown', onModalKey);
  }
  function onModalKey(e) {
    if (e.key === 'Escape') {
      $$('.ds-modal.is-open').forEach((m) => m.classList.remove('is-open'));
      document.removeEventListener('keydown', onModalKey);
    }
  }
  function closeAllModals() {
    $$('.ds-modal.is-open').forEach((m) => m.classList.remove('is-open'));
  }
  function showAlert(el, message, type = 'error') {
    if (!el) return;
    el.className = `ds-alert ds-alert--${type} is-visible`;
    el.textContent = message;
    setTimeout(() => el.classList.remove('is-visible'), 5000);
  }

  /* =========================================================
     LAYOUT: sidebar toggle, theme, notifications
     ========================================================= */
  function setupLayout() {
    const layout = $('#layout');

    $('#sidebarToggle')?.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        layout.classList.toggle('is-mobile-open');
      } else {
        layout.classList.toggle('is-collapsed');
      }
    });

    // Click outside mobile sidebar closes it
    document.addEventListener('click', (e) => {
      if (
        window.innerWidth <= 860 &&
        layout.classList.contains('is-mobile-open') &&
        !e.target.closest('.ds-sidebar') &&
        !e.target.closest('#sidebarToggle')
      ) {
        layout.classList.remove('is-mobile-open');
      }
    });

    // Theme toggle
    const savedTheme = localStorage.getItem('dsctb_theme') || 'light';
    if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon();

    $('#themeToggle')?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      if (next === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('dsctb_theme', next);
      updateThemeIcon();
    });

    function updateThemeIcon() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const icon = $('#themeIcon');
      if (!icon) return;
      icon.innerHTML = isDark
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke-linecap="round"/>'
        : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke-linejoin="round"/>';
    }

    // Notifications popover
    const notifBtn = $('#notifBtn');
    const notifPop = $('#notifPopover');

    notifBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = notifPop.classList.toggle('is-open');
      notifBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#notifPopover') && !e.target.closest('#notifBtn')) {
        notifPop?.classList.remove('is-open');
        notifBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    $('#markAllRead')?.addEventListener('click', () => {
      state.notifications.forEach((n) => (n.unread = false));
      renderNotifications();
    });

    // Logout
    $('#logoutBtn')?.addEventListener('click', async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
      window.location.href = '/login.html';
    });

    // Nav buttons
    $$('.ds-nav-item[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'open-deposit')  openModal('depositModal');
        if (action === 'open-withdraw') openModal('withdrawModal');
        if (action === 'open-transfer') openModal('transferModal');
        layout.classList.remove('is-mobile-open');
      });
    });

    // Quick action buttons
    document.querySelectorAll('[data-action]').forEach((el) => {
      if (el.classList.contains('ds-nav-item')) return;
      el.addEventListener('click', () => {
        const a = el.dataset.action;
        if (a === 'open-deposit')       openModal('depositModal');
        if (a === 'open-withdraw')      openModal('withdrawModal');
        if (a === 'open-transfer')      openModal('transferModal');
        if (a === 'open-new-account')   openModal('newAccountModal');
      });
    });

    // Close modal buttons
    document.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', () => {
        closeAllModals();
      });
    });
    // Click outside modal panel to close
    $$('.ds-modal').forEach((m) => {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('is-open');
      });
    });

    // Chart range tabs
    $$('.ds-panel__tabs button').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('.ds-panel__tabs button').forEach((t) => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        state.range = Number(tab.dataset.range);
        renderBalanceChart();
      });
    });

    // Transaction filters
    $$('#txFilters .ds-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('#txFilters .ds-chip').forEach((c) => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        state.txFilter = chip.dataset.filter;
        renderTransactions();
      });
    });

    // Search
    $('#searchInput')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      $$('#txBody tr').forEach((row) => {
        if (row.querySelector('.ds-table__empty')) return;
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* =========================================================
     Notifications rendering
     ========================================================= */
  function renderNotifications() {
    const list = $('#notifList');
    const badge = $('#notifBadge');
    if (!list) return;

    if (!state.notifications.length) {
      list.innerHTML = '<p style="padding: 1.5rem; text-align: center; color: var(--ds-muted);">No notifications</p>';
    } else {
      const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 6 9 17l-5-5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="9" stroke-width="2"/><path d="M12 16v-4m0-4h.01" stroke-width="2" stroke-linecap="round"/></svg>',
        warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4 2 20h20L12 4Z" stroke-linejoin="round"/><path d="M12 10v4m0 4h.01" stroke-width="2" stroke-linecap="round"/></svg>',
      };
      list.innerHTML = state.notifications
        .map(
          (n) => `
          <div class="ds-notif ${n.unread ? 'is-unread' : ''}">
            <div class="ds-notif__icon ds-notif__icon--${n.type}">${icons[n.type] || icons.info}</div>
            <div class="ds-notif__body">
              <p>${n.text}</p>
              <small>${n.time}</small>
            </div>
          </div>`
        )
        .join('');
    }

    const unread = state.notifications.filter((n) => n.unread).length;
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread ? 'grid' : 'none';
    }
  }

  /* =========================================================
     Data loading
     ========================================================= */
  async function loadUser() {
    try {
      const data = await api('/auth/me');
      state.user = data.user;
      const { firstName, lastName, email } = state.user;
      $('#userFirstName').textContent = firstName;
      $('#sidebarName').textContent = `${firstName} ${lastName}`;
      $('#sidebarEmail').textContent = email;
      $('#sidebarAvatar').textContent = initials(firstName, lastName);
    } catch (_) {
      window.location.href = '/login.html';
    }
  }

  async function loadAccounts() {
    const data = await api('/accounts');
    state.accounts = data.accounts || [];
    renderAccounts();
    renderAccountSelects();
    updateStats();
  }

  async function loadTransactions() {
    const data = await api('/transactions');
    state.transactions = data.transactions || [];
    renderTransactions();
    renderBalanceChart();
    renderDonut();
    updateStats();
  }

  /* =========================================================
     Stats + counters
     ========================================================= */
  function updateStats() {
    const total = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    animateCounter($('#statTotalBalance'), total, fmtCurrency);
    animateCounter($('#statAccounts'), state.accounts.length, (v) => String(v));

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = state.transactions.filter((t) => new Date(t.createdAt).getTime() >= cutoff);

    const income = recent
      .filter((t) => t.type === 'deposit' || t.type === 'transfer_in')
      .reduce((s, t) => s + t.amount, 0);
    const spending = recent
      .filter((t) => t.type === 'withdrawal' || t.type === 'transfer_out')
      .reduce((s, t) => s + t.amount, 0);

    animateCounter($('#statIncome'), income, fmtCurrency);
    animateCounter($('#statSpending'), spending, fmtCurrency);

    const types = state.accounts.map((a) => a.accountType);
    const parts = [];
    if (types.includes('savings')) parts.push('savings');
    if (types.includes('current')) parts.push('current');
    if (types.includes('fixed')) parts.push('fixed');
    $('#statAccountsSub').textContent = parts.length ? parts.join(', ') : 'no accounts yet';

    $('#accountCountLabel').textContent = `${state.accounts.length} account${state.accounts.length === 1 ? '' : 's'}`;
  }

  function animateCounter(el, target, formatter) {
    if (!el) return;
    const start = performance.now();
    const from = 0;
    const dur = 900;
    function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      el.textContent = formatter(value);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = formatter(target);
    }
    requestAnimationFrame(tick);
  }

  /* =========================================================
     Account rendering
     ========================================================= */
  function renderAccounts() {
    const list = $('#accountsList');
    if (!list) return;

    if (!state.accounts.length) {
      list.innerHTML = '<p style="color: var(--ds-muted);">No accounts yet. Click <strong>New Account</strong> to open one.</p>';
      return;
    }

    const icons = {
      savings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v18M5 8c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7 1.3-7 3 3.1 3 7 3 7-1.3 7-3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      current: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 7h18v12H3z" stroke-linejoin="round"/></svg>',
      fixed:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8" stroke-linecap="round"/></svg>',
    };

    list.innerHTML = state.accounts
      .map(
        (a) => `
      <article class="ds-account ds-account--${a.accountType}">
        <div class="ds-account__head">
          <span class="ds-account__type">
            ${icons[a.accountType] || ''}
            ${a.accountType}
          </span>
          <span class="ds-account__status" data-status="${a.status}" title="${a.status}"></span>
        </div>
        <div>
          <div class="ds-account__number">•••• ${a.accountNumber.slice(-4)}</div>
          <div class="ds-account__balance">${fmtCurrency(a.balance)}</div>
        </div>
        <div class="ds-account__footer">
          <span>Opened ${new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          <span>${a.currency}</span>
        </div>
      </article>`
      )
      .join('');
  }

  function renderAccountSelects() {
    const opts = state.accounts
      .map(
        (a) =>
          `<option value="${a._id}">${a.accountType.toUpperCase()} ••••${a.accountNumber.slice(-4)} — ${fmtCurrency(a.balance)}</option>`
      )
      .join('');

    ['depositAccount', 'withdrawAccount', 'transferFrom'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = opts || '<option value="">No accounts available</option>';
    });

    updateWithdrawAvailable();
  }

  function updateWithdrawAvailable() {
    const sel = $('#withdrawAccount');
    const label = $('#withdrawAvailable');
    if (!sel || !label) return;
    const acc = state.accounts.find((a) => a._id === sel.value);
    label.textContent = `Available: ${fmtCurrency(acc ? acc.balance : 0)}`;
  }

  /* =========================================================
     Transactions rendering
     ========================================================= */
  function renderTransactions() {
    const tbody = $('#txBody');
    if (!tbody) return;

    let list = state.transactions;
    if (state.txFilter === 'in')  list = list.filter((t) => t.type === 'deposit' || t.type === 'transfer_in');
    if (state.txFilter === 'out') list = list.filter((t) => t.type === 'withdrawal' || t.type === 'transfer_out');

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="ds-table__empty">No transactions yet.</td></tr>';
      return;
    }

    const inIcon  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 19V5M5 12l7 7 7-7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const outIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M19 12l-7-7-7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    tbody.innerHTML = list
      .map((t) => {
        const isIn = t.type === 'deposit' || t.type === 'transfer_in';
        const amountClass = isIn ? 'ds-amount-in' : 'ds-amount-out';
        const sign = isIn ? '+' : '−';
        const accInfo = t.account
          ? `${(t.account.accountType || '').toUpperCase()} ••••${(t.account.accountNumber || '').slice(-4)}`
          : '—';

        return `
          <tr>
            <td>${fmtDate(t.createdAt)}</td>
            <td>
              <span class="ds-tx-type ${isIn ? 'ds-tx-type--in' : 'ds-tx-type--out'}">
                ${isIn ? inIcon : outIcon}
                ${t.type.replace('_', ' ')}
              </span>
            </td>
            <td>${t.description || '—'}</td>
            <td>${accInfo}</td>
            <td style="text-align:right;">
              <span class="${amountClass}">${sign} ${fmtCurrency(t.amount)}</span>
            </td>
            <td style="text-align:right;">${fmtCurrency(t.balanceAfter)}</td>
          </tr>`;
      })
      .join('');
  }

  /* =========================================================
     Charts
     ========================================================= */
  function renderBalanceChart() {
    const svg = $('#balanceChart svg');
    const lineEl = $('#balanceLine');
    const areaEl = $('#balanceArea');
    const gridEl = $('#balanceGrid');
    const dotsEl = $('#balanceDots');
    if (!svg || !lineEl || !areaEl || !gridEl || !dotsEl) return;

    // Build a timeline of balance evolution from transactions
    const days = state.range;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const txs = state.transactions
      .filter((t) => new Date(t.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Approximate: current balance minus future deltas
    const currentTotal = state.accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const points = [];

    // Reconstruct backwards from current
    let running = currentTotal;
    const reversed = [...txs].reverse();
    for (let i = 0; i < days; i++) {
      const dayStart = Date.now() - i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayTxs = reversed.filter((t) => {
        const ts = new Date(t.createdAt).getTime();
        return ts >= dayStart && ts < dayEnd;
      });
      const delta = dayTxs.reduce(
        (s, t) => s + (t.type === 'deposit' || t.type === 'transfer_in' ? t.amount : -t.amount),
        0
      );
      running -= delta;
      points.unshift({ x: dayStart, y: running });
    }

    // If no transactions, just show flat line at current total
    if (points.length === 0) {
      points.push({ x: Date.now() - days * 86400000, y: currentTotal });
      points.push({ x: Date.now(), y: currentTotal });
    }

    const W = 800, H = 240;
    const padX = 40, padY = 24;
    const minX = points[0].x;
    const maxX = points[points.length - 1].x || minX + 1;
    const ys = points.map((p) => p.y);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 100);
    const yPad = (maxY - minY) * 0.1 || 100;

    const scaleX = (x) => padX + ((x - minX) / (maxX - minX || 1)) * (W - padX * 2);
    const scaleY = (y) => H - padY - ((y - (minY - yPad)) / ((maxY + yPad) - (minY - yPad))) * (H - padY * 2);

    // Path
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`).join(' ');
    const areaD = `${d} L ${scaleX(points[points.length - 1].x).toFixed(1)} ${H - padY} L ${scaleX(points[0].x).toFixed(1)} ${H - padY} Z`;

    lineEl.setAttribute('d', d);
    areaEl.setAttribute('d', areaD);

    // Grid lines
    const gridLines = 4;
    let gridSvg = '';
    const labels = [];
    for (let i = 0; i <= gridLines; i++) {
      const v = (maxY + yPad) - ((maxY + yPad) - (minY - yPad)) * (i / gridLines);
      const y = scaleY(v);
      gridSvg += `<line class="ds-chart__grid-line" x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" />`;
      labels.push(`<text class="ds-chart__axis-label" x="${W - padX + 4}" y="${y + 3}">${fmtCurrencyShort(v)}</text>`);
    }
    gridEl.innerHTML = gridSvg + labels.join('');

    // Dots
    dotsEl.innerHTML = points
      .map(
        (p, i) => `
        <circle class="ds-chart__dot"
          cx="${scaleX(p.x).toFixed(1)}"
          cy="${scaleY(p.y).toFixed(1)}"
          r="4"
          data-i="${i}"
          data-balance="${p.y}"
          data-date="${p.x}" />
      `
      )
      .join('');

    // Hover tooltips
    const tip = $('#balanceTooltip');
    dotsEl.querySelectorAll('.ds-chart__dot').forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        const bal = Number(dot.dataset.balance);
        const date = new Date(Number(dot.dataset.date)).toLocaleDateString();
        const svgRect = svg.getBoundingClientRect();
        const chartRect = $('#balanceChart').getBoundingClientRect();
        const cx = Number(dot.getAttribute('cx'));
        const cy = Number(dot.getAttribute('cy'));
        tip.textContent = `${date} — ${fmtCurrency(bal)}`;
        tip.style.left = `${(cx / 800) * (svgRect.width) + (svgRect.left - chartRect.left)}px`;
        tip.style.top  = `${(cy / 240) * (svgRect.height)}px`;
        tip.classList.add('is-visible');
      });
      dot.addEventListener('mouseleave', () => tip.classList.remove('is-visible'));
    });
  }

  function fmtCurrencyShort(n) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${Math.round(n)}`;
  }

  /* ---------- Donut chart ---------- */
  function renderDonut() {
    const legend = $('#donutLegend');
    const totalEl = $('#donutTotal');
    if (!legend || !totalEl) return;

    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const spend = state.transactions.filter(
      (t) =>
        new Date(t.createdAt).getTime() >= cutoff &&
        (t.type === 'withdrawal' || t.type === 'transfer_out')
    );

    // Bucket by rough category
    const buckets = [
      { label: 'Transfers', color: '#0fb5ac', value: 0 },
      { label: 'Withdrawals', color: '#d4af37', value: 0 },
      { label: 'Fees & Others', color: '#8b5cf6', value: 0 },
      { label: 'Subscriptions', color: '#ef4444', value: 0 },
    ];

    spend.forEach((t) => {
      const desc = (t.description || '').toLowerCase();
      if (t.type === 'transfer_out') buckets[0].value += t.amount;
      else if (t.type === 'withdrawal') buckets[1].value += t.amount;
      else if (desc.includes('fee') || desc.includes('charge')) buckets[2].value += t.amount;
      else buckets[3].value += t.amount;
    });

    const total = buckets.reduce((s, b) => s + b.value, 0);
    totalEl.textContent = fmtCurrencyShort(total);

    // Draw segments
    const r = 80;
    const c = 2 * Math.PI * r;
    let offset = 0;
    const segs = ['#donutSeg1', '#donutSeg2', '#donutSeg3', '#donutSeg4'];
    segs.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      const b = buckets[i];
      const frac = total > 0 ? b.value / total : 0;
      const len = frac * c;
      el.setAttribute('stroke-dasharray', `${len} ${c - len}`);
      el.setAttribute('stroke-dashoffset', `${-offset}`);
      el.setAttribute('stroke', b.color);
      offset += len;
    });

    // Legend
    legend.innerHTML = buckets
      .filter((b) => b.value > 0 || total === 0)
      .map(
        (b) => `
        <div class="ds-legend__row">
          <span class="ds-legend__dot" style="background:${b.color};"></span>
          <span class="ds-legend__label">${b.label}</span>
          <span class="ds-legend__value">${fmtCurrencyShort(b.value)}</span>
        </div>`
      )
      .join('');
  }

  /* =========================================================
     Form handlers
     ========================================================= */
  function setupForms() {
    // Deposit
    $('#depositForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#depositSubmit');
      const alertEl = $('#depositAlert');
      btn.disabled = true;
      try {
        await api(`/accounts/${$('#depositAccount').value}/deposit`, {
          method: 'POST',
          body: {
            amount: $('#depositAmount').value,
            description: $('#depositNote').value || 'Deposit',
          },
        });
        toast('Deposit successful', 'success');
        closeModal('depositModal');
        e.target.reset();
        await Promise.all([loadAccounts(), loadTransactions()]);
      } catch (err) {
        showAlert(alertEl, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Withdraw
    $('#withdrawForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#withdrawSubmit');
      const alertEl = $('#withdrawAlert');
      btn.disabled = true;
      try {
        await api(`/accounts/${$('#withdrawAccount').value}/withdraw`, {
          method: 'POST',
          body: {
            amount: $('#withdrawAmount').value,
            description: $('#withdrawNote').value || 'Withdrawal',
          },
        });
        toast('Withdrawal successful', 'success');
        closeModal('withdrawModal');
        e.target.reset();
        await Promise.all([loadAccounts(), loadTransactions()]);
      } catch (err) {
        showAlert(alertEl, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Transfer
    $('#transferForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#transferSubmit');
      const alertEl = $('#transferAlert');
      btn.disabled = true;
      try {
        await api('/accounts/transfer', {
          method: 'POST',
          body: {
            fromAccountId: $('#transferFrom').value,
            toAccountNumber: $('#transferTo').value.trim(),
            amount: $('#transferAmount').value,
            description: $('#transferNote').value || 'Transfer',
          },
        });
        toast('Transfer successful', 'success');
        closeModal('transferModal');
        e.target.reset();
        await Promise.all([loadAccounts(), loadTransactions()]);
      } catch (err) {
        showAlert(alertEl, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // New account
    $('#newAccountForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#newAccountSubmit');
      const alertEl = $('#newAccountAlert');
      btn.disabled = true;
      try {
        await api('/accounts', {
          method: 'POST',
          body: { accountType: $('#newAccountType').value },
        });
        toast('New account created', 'success');
        closeModal('newAccountModal');
        await loadAccounts();
      } catch (err) {
        showAlert(alertEl, err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    // Update "Available" label when account changes
    $('#withdrawAccount')?.addEventListener('change', updateWithdrawAvailable);

    // Filter tx by account in deposit/withdraw/transfer — no-op, just nice UX
    $('#depositAccount')?.addEventListener('change', () => {});
  }

  /* =========================================================
     Boot
     ========================================================= */
  async function boot() {
    setupLayout();
    renderNotifications();
    setupForms();

    await loadUser();
    try {
      await Promise.all([loadAccounts(), loadTransactions()]);
    } catch (err) {
      console.error(err);
      toast('Failed to load dashboard data', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();