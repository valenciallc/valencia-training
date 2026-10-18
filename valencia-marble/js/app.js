'use strict';

/* ========== التطبيق: التوجيه والصفحات ========== */
const App = (() => {
  const app = document.getElementById('app');
  let user = null;

  const NAV = [
    { href: '#/home', label: 'الرئيسية', icon: '🏠', show: () => true },
    { href: '#/workers', label: 'العمال والتقدم', icon: '👥', show: u => u.role === 'admin' },
    { href: '#/cert', label: 'شهادتي', icon: '🎓', show: () => true }
  ];

  const mod = id => MODULES.find(m => m.id === id);

  /* ---------- الدخول ---------- */
  function renderLogin() {
    document.title = 'تسجيل الدخول | فالنسيا - تدريب العمال';
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="login-logo">
            <div class="logo-mark">V</div>
            <h1>فالنسيا</h1>
            <p>نظام تدريب عمال الرخام والحجر الطبيعي</p>
          </div>
          <form id="login-form" autocomplete="off">
            <label>اسم المستخدم
              <input name="username" required placeholder="مثال: sales1" autofocus>
            </label>
            <label>كلمة المرور
              <input name="password" type="password" required placeholder="••••">
            </label>
            <div id="login-error" class="form-error" hidden></div>
            <button class="btn btn-primary btn-block" type="submit">تسجيل الدخول</button>
          </form>
          <div class="login-hint">
            <b>حسابات تجريبية:</b>
            <code>admin / admin123</code> (الإدارة) &nbsp;•&nbsp;
            <code>sales1 / 1234</code> (مبيعات) &nbsp;•&nbsp;
            <code>store1 / 1234</code> (مستودع) &nbsp;•&nbsp;
            <code>deliver1 / 1234</code> (تسليم) &nbsp;•&nbsp;
            <code>account1 / 1234</code> (حسابات) &nbsp;•&nbsp;
            <code>project1 / 1234</code> (مشاريع) &nbsp;•&nbsp;
            <code>pallet1 / 1234</code> (باليتات)
          </div>
        </div>
        <div class="login-side">
          <div class="side-content">
            <h2>وحدة. تدريب. إتقان.</h2>
            <p>مناهج تدريبية مصممة لأدوار المستودع والمبيعات والتسليم والحسابات والمشاريع — بالشارقة وأبوظبي.</p>
            <ul>
              <li>دروس قصيرة بالعربية العملية</li>
              <li>اختبارات بدرجة نجاح 70%</li>
              <li>متابعة تقدم كل عامل من الإدارة</li>
              <li>شهادة عند إكمال المنهج</li>
            </ul>
          </div>
        </div>
      </div>`;
    document.getElementById('login-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const u = Store.login(f.get('username'), f.get('password'));
      if (!u) {
        const err = document.getElementById('login-error');
        err.hidden = false;
        err.textContent = 'بيانات الدخول غير صحيحة أو الحساب موقوف';
        return;
      }
      user = u;
      location.hash = '#/home';
      render();
    });
  }

  /* ---------- الهيكل ---------- */
  function shell(contentHtml) {
    const items = NAV.filter(n => n.show(user)).map(n =>
      `<a class="nav-item" href="${n.href}" data-nav="${n.href}"><span>${n.icon}</span>${n.label}</a>`).join('');
    const st = Store.stats(user.id, user.role);
    app.innerHTML = `
      <div class="layout">
        <aside class="sidebar">
          <div class="brand">
            <div class="logo-mark sm">V</div>
            <div>
              <b>فالنسيا</b>
              <small>تدريب العمال</small>
            </div>
          </div>
          <nav class="nav">${items}</nav>
          <div class="side-user">
            <div class="avatar">${UI.esc(user.full_name.trim().charAt(0))}</div>
            <div class="side-user-info">
              <b>${UI.esc(user.full_name)}</b>
              <small>${UI.esc(ROLES[user.role] || '')} · ${UI.esc(WAREHOUSES[user.warehouse] || '')}</small>
            </div>
            <button class="icon-btn" id="logout-btn" title="تسجيل الخروج">⏻</button>
          </div>
        </aside>
        <main class="main">
          <header class="topbar">
            <div class="page-title" id="page-title"></div>
            <div class="top-progress">
              <span>إنجازي</span>
              ${UI.progress(st.pct, 'pbar-sm')}
            </div>
          </header>
          <div class="content" id="content">${contentHtml}</div>
        </main>
      </div>`;
    document.getElementById('logout-btn').addEventListener('click', () => {
      Store.logout(); user = null; location.hash = ''; renderLogin();
    });
    markActiveNav();
  }

  function markActiveNav() {
    const cur = location.hash || '#/home';
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.dataset.nav === cur || (cur.startsWith('#/module') && a.dataset.nav === '#/home'));
    });
  }

  function setTitle(t) {
    const el = document.getElementById('page-title');
    if (el) el.textContent = t;
    document.title = t + ' | فالنسيا - تدريب العمال';
  }

  function gotoContent(html, title) {
    const c = document.getElementById('content');
    if (c) c.innerHTML = html;
    setTitle(title);
    markActiveNav();
    window.scrollTo(0, 0);
  }

  /* ---------- الرئيسية ---------- */
  function viewHome() {
    const st = Store.stats(user.id, user.role);
    const track = TRACKS[user.role] || [];
    const certified = st.certified;

    const cards = track.map(id => {
      const m = mod(id);
      if (!m) return '';
      const ms = Store.moduleState(user.id, id);
      const state = ms.done
        ? UI.badge('مكتملة ✓', 'b-green')
        : ms.lessons_read
          ? (ms.quiz ? UI.badge('بانتظار اجتياز الاختبار', 'b-amber') : UI.badge('الدروس مقروءة - الاختبار', 'b-blue'))
          : UI.badge(`الدروس ${ms.lessons_done}/${ms.lessons_total}`, 'b-gray');
      const pct = Math.round(((ms.lessons_done + (ms.quiz && ms.quiz.passed ? 1 : 0)) / (ms.lessons_total + 1)) * 100);
      return `
        <a class="mod-card" href="#/module/${m.id}">
          <div class="mod-top">
            <span class="mod-icon" style="background:${m.color}22;color:${m.color}">${m.icon}</span>
            ${state}
          </div>
          <h3>${UI.esc(m.title)}</h3>
          <p>${UI.esc(m.desc)}</p>
          ${UI.progress(pct, 'pbar-sm')}
          <span class="mod-cta">${ms.done ? 'مراجعة الوحدة' : (ms.lessons_done ? 'متابعة' : 'ابدأ الوحدة')} ←</span>
        </a>`;
    }).join('');

    const certBanner = certified ? `
      <div class="banner banner-green">
        <div><b>🎉 أحسنت! أنهيت منهجك التدريبي كاملاً</b><p>يمكنك الآن طباعة شهادة إتمام التدريب.</p></div>
        <a class="btn btn-light" href="#/cert">عرض الشهادة</a>
      </div>` : '';

    gotoContent(`
      <section class="hero">
        <div>
          <h2>مرحباً، ${UI.esc(user.full_name)} 👋</h2>
          <p>${UI.esc(user.job_title)} — ${UI.esc(WAREHOUSES[user.warehouse] || '')}</p>
        </div>
        <div class="hero-pct">
          <b>${st.pct}%</b>
          <span>من المنهج</span>
        </div>
      </section>
      ${certBanner}
      <section class="stat-grid">
        <div class="stat-card"><span>الوحدات المكتملة</span><b>${st.modules_done} / ${st.modules_total}</b></div>
        <div class="stat-card"><span>الدروس المقروءة</span><b>${st.lessons_read} / ${st.lessons_total}</b></div>
        <div class="stat-card"><span>متوسط الدرجات</span><b>${st.avg_score ? st.avg_score + '%' : '—'}</b></div>
        <div class="stat-card"><span>الاختبارات المجتازة</span><b>${st.modules_passed}</b></div>
      </section>
      <section>
        <h3 class="section-title">منهجك التدريبي — ${UI.esc(ROLES[user.role] || '')}</h3>
        <div class="mod-grid">${cards || UI.emptyState('📚', 'لا يوجد منهج لهذا الدور')}</div>
      </section>
    `, 'الرئيسية');
  }

  /* ---------- الوحدة ---------- */
  function viewModule(id) {
    const m = mod(id);
    if (!m) { location.hash = '#/home'; return; }
    const ms = Store.moduleState(user.id, id);
    const lessons = m.lessons.map((l, i) => {
      const done = Store.lessonDone(user.id, l.id);
      return `
        <article class="lesson ${done ? 'lesson-done' : ''}">
          <div class="lesson-head">
            <span class="lesson-num">${i + 1}</span>
            <h4>${UI.esc(l.t)}</h4>
            ${done ? UI.badge('تمت القراءة ✓', 'b-green') : ''}
          </div>
          <div class="lesson-body">${l.html}</div>
          <div class="lesson-foot">
            <button class="btn ${done ? 'btn-ghost' : 'btn-primary'}" data-done="${l.id}" ${done ? 'disabled' : ''}>
              ${done ? 'تمت قراءة هذا الدرس' : 'تمت قراءة هذا الدرس ✓'}
            </button>
          </div>
        </article>`;
    }).join('');

    const quizCard = ms.lessons_read
      ? (ms.quiz
        ? `<div class="quiz-box ${ms.quiz.passed ? 'quiz-pass' : 'quiz-fail'}">
             <div>
               <b>${ms.quiz.passed ? 'اجتزت الاختبار ✓' : 'لم تجتز بعد'}</b>
               <p>أفضل درجة: <b>${ms.quiz.best}%</b> من ${ms.quiz.total} أسئلة — عدد المحاولات: ${ms.quiz.tries}</p>
             </div>
             <a class="btn ${ms.quiz.passed ? 'btn-ghost' : 'btn-primary'}" href="#/quiz/${m.id}">${ms.quiz.passed ? 'إعادة الاختبار' : 'إعادة المحاولة'}</a>
           </div>`
        : `<div class="quiz-box">
             <div><b>أنت الآن جاهز للاختبار</b><p>${m.quiz.length} أسئلة — درجة النجاح ${PASS_MARK}%</p></div>
             <a class="btn btn-primary" href="#/quiz/${m.id}">ابدأ الاختبار ←</a>
           </div>`)
      : `<div class="quiz-box quiz-locked">
           <div><b>الاختبار مقفل</b><p>اقرأ جميع دروس الوحدة أولاً (${ms.lessons_done}/${ms.lessons_total}) لفتح الاختبار.</p></div>
         </div>`;

    gotoContent(`
      <a class="back-link" href="#/home">← العودة للرئيسية</a>
      <section class="mod-hero" style="--mc:${m.color}">
        <span class="mod-icon lg" style="background:${m.color}22;color:${m.color}">${m.icon}</span>
        <div>
          <h2>${UI.esc(m.title)}</h2>
          <p>${UI.esc(m.desc)}</p>
        </div>
        <div class="mod-hero-state">${ms.done ? UI.badge('وحدة مكتملة ✓', 'b-green') : UI.badge(`${ms.lessons_done}/${ms.lessons_total} دروس`, 'b-gray')}</div>
      </section>
      <section class="lessons">${lessons}</section>
      <section class="quiz-section">
        <h3 class="section-title">اختبار الوحدة</h3>
        ${quizCard}
      </section>
    `, m.title);

    document.querySelectorAll('[data-done]').forEach(btn => {
      btn.addEventListener('click', () => {
        Store.markLesson(user.id, btn.dataset.done);
        UI.toast('تم تسجيل قراءة الدرس');
        viewModule(id);
      });
    });
  }

  /* ---------- الاختبار ---------- */
  function viewQuiz(id) {
    const m = mod(id);
    if (!m) { location.hash = '#/home'; return; }
    const qs = m.quiz.map((q, i) => `
      <fieldset class="q-item" data-q="${i}">
        <legend><span class="q-num">${i + 1}</span> ${UI.esc(q.q)}</legend>
        ${q.o.map((o, oi) => `
          <label class="q-opt">
            <input type="radio" name="q${i}" value="${oi}">
            <span>${UI.esc(o)}</span>
          </label>`).join('')}
      </fieldset>`).join('');

    gotoContent(`
      <a class="back-link" href="#/module/${m.id}">← العودة للوحدة</a>
      <section class="quiz-page">
        <h2>اختبار: ${UI.esc(m.title)}</h2>
        <p class="muted">${m.quiz.length} أسئلة — درجة النجاح ${PASS_MARK}% — يمكنك إعادة المحاولة عند الحاجة</p>
        <form id="quiz-form">${qs}</form>
        <div class="quiz-actions">
          <button class="btn btn-primary btn-lg" id="quiz-submit">تسليم الإجابات</button>
        </div>
      </section>
    `, 'اختبار: ' + m.title);

    document.getElementById('quiz-submit').addEventListener('click', () => {
      const total = m.quiz.length;
      let answered = 0, correct = 0;
      const detail = m.quiz.map((q, i) => {
        const sel = document.querySelector(`input[name="q${i}"]:checked`);
        if (!sel) return { ok: null };
        answered++;
        const ok = Number(sel.value) === q.a;
        if (ok) correct++;
        return { ok, user: Number(sel.value), right: q.a };
      });
      if (answered < total) { UI.toast(`أجب عن جميع الأسئلة (${answered}/${total})`, 'error'); return; }

      const score = Math.round((correct / total) * 100);
      const passed = score >= PASS_MARK;
      Store.saveQuiz(user.id, m.id, score, total, passed);

      const detailHtml = m.quiz.map((q, i) => {
        const d = detail[i];
        return `
          <li class="q-res ${d.ok ? 'ok' : 'bad'}">
            <b>${d.ok ? '✓' : '✕'} ${UI.esc(q.q)}</b>
            <span>إجابتك: ${UI.esc(q.o[d.user])}${d.ok ? '' : ` — الصحيحة: <b>${UI.esc(q.o[d.right])}</b>`}</span>
          </li>`;
      }).join('');

      UI.modal({
        title: passed ? '🎉 مبروك، اجتزت الاختبار' : 'لم تجتز الاختبار',
        wide: true,
        body: `
          <div class="result-ring ${passed ? 'res-pass' : 'res-fail'}">
            <b>${score}%</b><span>${correct} من ${total}</span>
          </div>
          <ul class="result-list">${detailHtml}</ul>`,
        actions: [
          { label: 'العودة للوحدة', class: 'btn-ghost', onClick: (close) => { close(); location.hash = `#/module/${m.id}`; } },
          passed
            ? { label: 'متابعة', class: 'btn-primary', onClick: (close) => { close(); location.hash = '#/home'; } }
            : { label: 'إعادة المحاولة', class: 'btn-primary', onClick: (close) => { close(); viewQuiz(m.id); } }
        ]
      });
    });
  }

  /* ---------- العمال (للإدارة) ---------- */
  function viewWorkers() {
    if (user.role !== 'admin') { location.hash = '#/home'; return; }

    const draw = (q = '', role = '') => {
      const rows = Store.workerReport()
        .filter(r => !q || r.user.full_name.includes(q) || r.user.username.includes(q))
        .filter(r => !role || r.user.role === role);
      const body = rows.map(r => `
        <tr>
          <td>
            <div class="cell-user">
              <div class="avatar sm">${UI.esc(r.user.full_name.trim().charAt(0))}</div>
              <div><b>${UI.esc(r.user.full_name)}</b><small>${UI.esc(r.user.username)}</small></div>
            </div>
          </td>
          <td>${UI.badge(ROLES[r.user.role], 'b-blue')}</td>
          <td>${UI.esc(WAREHOUSES[r.user.warehouse])}</td>
          <td class="w-pct">${UI.progress(r.stats.pct, 'pbar-sm')}</td>
          <td>${r.stats.lessons_read}/${r.stats.lessons_total}</td>
          <td>${r.stats.avg_score ? r.stats.avg_score + '%' : '—'}</td>
          <td>${r.stats.certified ? UI.badge('مُعتمد', 'b-green') : UI.badge('قيد التدريب', 'b-amber')}</td>
          <td>${UI.fmtDateTime(r.last_activity)}</td>
          <td>
            <button class="icon-btn" data-open="${r.user.id}" title="عرض المنهج">👁</button>
            <button class="icon-btn danger" data-reset="${r.user.id}" title="إعادة تعيين التقدم">⟲</button>
          </td>
        </tr>`).join('');

      const all = Store.workerReport();
      const avg = all.length ? Math.round(all.reduce((s, r) => s + r.stats.pct, 0) / all.length) : 0;
      const certified = all.filter(r => r.stats.certified).length;

      gotoContent(`
        <section class="stat-grid">
          <div class="stat-card"><span>عدد العمال</span><b>${all.length}</b></div>
          <div class="stat-card"><span>متوسط الإنجاز</span><b>${avg}%</b></div>
          <div class="stat-card"><span>مُعتمدون (اكتمل المنهج)</span><b>${certified}</b></div>
          <div class="stat-card"><span>مسجّلون اليوم</span><b>${all.filter(r => r.last_activity && Date.now() - r.last_activity < 864e5).length}</b></div>
        </section>
        <section class="panel">
          <div class="panel-head">
            <h3>متابعة تقدم العمال</h3>
            <div class="filters">
              <input id="f-q" placeholder="بحث بالاسم..." value="${UI.esc(q)}">
              <select id="f-role">
                <option value="">كل الأدوار</option>
                ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${role === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="table-wrap">
            ${rows ? `<table class="table">
              <thead><tr><th>العامل</th><th>الدور</th><th>المستودع</th><th>الإنجاز</th><th>الدروس</th><th>متوسط الدرجة</th><th>الحالة</th><th>آخر نشاط</th><th></th></tr></thead>
              <tbody>${body}</tbody></table>` : UI.emptyState('🔍', 'لا نتائج مطابقة')}
          </div>
        </section>
      `, 'العمال والتقدم');

      document.getElementById('f-q').addEventListener('input', e => {
        const v = e.target.value, rr = role;
        draw(v, rr);
        const el = document.getElementById('f-q'); el.focus(); el.setSelectionRange(v.length, v.length);
      });
      document.getElementById('f-role').addEventListener('change', e => draw(q, e.target.value));

      document.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => {
        const w = Store.getUser(b.dataset.reset);
        UI.confirm(`إعادة تعيين تقدم "${w.full_name}" بالكامل؟ سيتم حذف قراءات الدروس ودرجات الاختبارات.`, () => {
          Store.resetWorker(w.id);
          UI.toast('تمت إعادة تعيين التقدم');
          draw(document.getElementById('f-q').value, document.getElementById('f-role').value);
        });
      }));
      document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
        const w = Store.getUser(b.dataset.open);
        showWorkerModal(w);
      }));
    };

    draw();
  }

  function showWorkerModal(w) {
    const track = TRACKS[w.role] || [];
    const st = Store.stats(w.id, w.role);
    const rows = track.map(id => {
      const m = mod(id);
      const ms = Store.moduleState(w.id, id);
      return `<tr>
        <td>${m.icon} ${UI.esc(m.title)}</td>
        <td>${ms.lessons_done}/${ms.lessons_total}</td>
        <td>${ms.quiz ? ms.quiz.best + '%' : '—'}</td>
        <td>${ms.done ? UI.badge('مكتملة', 'b-green') : UI.badge('قيد التنفيذ', 'b-amber')}</td>
      </tr>`;
    }).join('');
    UI.modal({
      title: `سجل التدريب — ${w.full_name}`,
      wide: true,
      body: `
        <div class="wm-head">
          <div><b>${UI.esc(w.full_name)}</b> (${UI.esc(ROLES[w.role])} — ${UI.esc(WAREHOUSES[w.warehouse])})</div>
          <div>الجوال: <span dir="ltr">${UI.esc(w.phone || '—')}</span></div>
        </div>
        <div class="stat-grid small">
          <div class="stat-card"><span>الإنجاز</span><b>${st.pct}%</b></div>
          <div class="stat-card"><span>متوسط الدرجة</span><b>${st.avg_score ? st.avg_score + '%' : '—'}</b></div>
          <div class="stat-card"><span>الدروس</span><b>${st.lessons_read}/${st.lessons_total}</b></div>
        </div>
        <table class="table">
          <thead><tr><th>الوحدة</th><th>الدروس</th><th>أفضل درجة</th><th>الحالة</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`,
      actions: [{ label: 'إغلاق', class: 'btn-ghost' }]
    });
  }

  /* ---------- الشهادة ---------- */
  function viewCert() {
    const st = Store.stats(user.id, user.role);
    if (!st.certified) {
      gotoContent(`
        <section class="panel center-panel">
          ${UI.emptyState('🎓', 'لم تُصدر شهادتك بعد', `أكمل منهجك (${st.modules_done}/${st.modules_total} وحدات) واجتز كل الاختبارات للحصول على الشهادة.`)}
          <div style="text-align:center">${UI.progress(st.pct)}</div>
          <div style="text-align:center"><a class="btn btn-primary" href="#/home">متابعة التدريب</a></div>
        </section>
      `, 'شهادتي');
      return;
    }
    const date = new Date().toLocaleDateString('ar-AE', { year: 'numeric', month: 'long', day: 'numeric' });
    gotoContent(`
      <div class="cert-toolbar no-print">
        <button class="btn btn-primary" onclick="window.print()">🖨 طباعة الشهادة</button>
        <a class="btn btn-ghost" href="#/home">العودة</a>
      </div>
      <div class="certificate">
        <div class="cert-frame">
          <div class="cert-brand">V · فالنسيا</div>
          <div class="cert-sub">لتجارة الرخام والحجر الطبيعي — الشارقة | أبوظبي</div>
          <h1>شهادة إتمام تدريب</h1>
          <p class="cert-present">تشهد شركة فالنسيا بأن</p>
          <div class="cert-name">${UI.esc(user.full_name)}</div>
          <p class="cert-present">قد أكمل منهج التدريب المخصص لدور <b>${UI.esc(ROLES[user.role])}</b> بنجاح،<br>
          بمتوسط درجات <b>${st.avg_score}%</b> في جميع الاختبارات.</p>
          <div class="cert-meta">
            <div><span>الوحدة</span><b>${st.modules_total} وحدات</b></div>
            <div><span>الدروس</span><b>${st.lessons_total} درساً</b></div>
            <div><span>التاريخ</span><b>${date}</b></div>
          </div>
          <div class="cert-foot">
            <div class="cert-sign"><b>إدارة التدريب</b><span>فالنسيا</span></div>
            <div class="cert-seal">✓</div>
            <div class="cert-sign"><b>التوقيع</b><span>________________</span></div>
          </div>
        </div>
      </div>
    `, 'شهادتي');
  }

  /* ---------- التوجيه ---------- */
  function render() {
    try {
      if (!user) { renderLogin(); return; }
      if (!document.querySelector('.layout')) shell('');
      const hash = location.hash || '#/home';
      if (hash.startsWith('#/module/')) viewModule(hash.split('/')[2]);
      else if (hash.startsWith('#/quiz/')) viewQuiz(hash.split('/')[2]);
      else if (hash.startsWith('#/workers')) viewWorkers();
      else if (hash.startsWith('#/cert')) viewCert();
      else viewHome();
    } catch (err) {
      console.error(err);
      app.innerHTML = `<div class="login-wrap"><div class="login-card"><h2>حدث خطأ</h2><p>${UI.esc(err.message)}</p>
        <button class="btn btn-primary btn-block" onclick="location.reload()">إعادة التحميل</button></div></div>`;
    }
  }

  let started = false;
  function start() {
    if (started) { render(); return; }
    started = true;
    Store.load();
    user = Store.currentUser();
    window.addEventListener('hashchange', () => {
      if (!user) user = Store.currentUser();
      if (!user) { renderLogin(); return; }
      render();
    });
    render();
  }

  return { start };
})();

document.addEventListener('DOMContentLoaded', App.start);
