'use strict';

/* ========== عناصر واجهة مشتركة ========== */
const UI = (() => {

  function h(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(msg, type = 'ok') {
    const root = document.getElementById('toast-root');
    const el = h(`<div class="toast toast-${type}">${esc(msg)}</div>`);
    root.appendChild(el);
    setTimeout(() => { el.classList.add('show'); }, 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    }, 3000);
  }

  function modal({ title, body, actions = [], wide = false }) {
    const root = document.getElementById('modal-root');
    root.innerHTML = '';
    const backdrop = h(`
      <div class="modal-backdrop">
        <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h3>${esc(title)}</h3>
            <button class="modal-close" title="إغلاق">✕</button>
          </div>
          <div class="modal-body"></div>
          ${actions.length ? '<div class="modal-foot"></div>' : ''}
        </div>
      </div>`);
    backdrop.querySelector('.modal-body').append(typeof body === 'string' ? h(`<div>${body}</div>`) : body);
    const foot = backdrop.querySelector('.modal-foot');
    if (foot) {
      actions.forEach(a => {
        const btn = h(`<button class="btn ${a.class || 'btn-ghost'}">${esc(a.label)}</button>`);
        btn.addEventListener('click', () => a.onClick && a.onClick(close));
        foot.appendChild(btn);
      });
    }
    function close() { root.innerHTML = ''; }
    backdrop.querySelector('.modal-close').addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); }
    });
    root.appendChild(backdrop);
    return { close, root: backdrop };
  }

  function confirm(msg, onYes, { danger = true, title = 'تأكيد' } = {}) {
    modal({
      title,
      body: `<p class="confirm-msg">${esc(msg)}</p>`,
      actions: [
        { label: 'إلغاء', class: 'btn-ghost' },
        { label: 'نعم، متابعة', class: danger ? 'btn-danger' : 'btn-primary', onClick: (close) => { close(); onYes(); } }
      ]
    });
  }

  function progress(pct, cls = '') {
    return `<div class="pbar ${cls}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span><b>${pct}%</b></div>`;
  }

  function badge(text, cls = '') {
    return `<span class="badge ${cls}">${esc(text)}</span>`;
  }

  function statusBadge(status) {
    const map = {
      'مسودة': 'b-gray', 'مؤكد': 'b-blue', 'قيد التجهيز': 'b-amber',
      'جاهز للتسليم': 'b-purple', 'تم التسليم': 'b-green', 'ملغي': 'b-red',
      'متاح': 'b-green', 'محجوز': 'b-blue', 'بانتظار التحميل': 'b-amber',
      'تم التحميل': 'b-purple', 'مسلّم': 'b-green', 'مرتجع': 'b-red',
      'قيد النقل': 'b-amber', 'جديد': 'b-blue', 'قيد التنفيذ': 'b-amber',
      'مكتمل': 'b-green', 'موقوف': 'b-red'
    };
    return badge(status, map[status] || 'b-gray');
  }

  function fmtMoney(n) {
    return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' د.إ';
  }

  function fmtNum(n) {
    return (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = /^\d{4}-\d{2}-\d{2}/.test(ts) ? new Date(ts.replace(' ', 'T')) : new Date(ts);
    if (isNaN(d)) return String(ts);
    return d.toLocaleDateString('ar-AE', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function fmtDateTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d)) return String(ts);
    return d.toLocaleString('ar-AE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function emptyState(icon, title, sub = '') {
    return `<div class="empty"><div class="empty-icon">${icon}</div><h4>${esc(title)}</h4>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
  }

  return { h, esc, toast, modal, confirm, progress, badge, statusBadge, fmtMoney, fmtNum, fmtDate, fmtDateTime, emptyState };
})();
