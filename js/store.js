'use strict';

/* ========== التخزين: خادم مشترك (Google Sheets عبر Apps Script) ==========
   الواجهة تحتفظ بنسخة مؤقتة في الذاكرة لتبقى الدوال متزامنة، والخادم هو المرجع. */
const Store = (() => {
  const TOKEN_KEY = 'valencia_training_token';
  let db = { users: [], progress: {} };
  let me = null;

  async function api(action, data = {}) {
    if (!API_URL) throw new Error('لم يتم ربط الخادم بعد — راجع ملف js/config.js');
    let j;
    try {
      const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, token: localStorage.getItem(TOKEN_KEY), ...data }) });
      j = await r.json();
    } catch (e) {
      throw new Error('تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مرة أخرى');
    }
    if (!j.ok) { const e = new Error(j.error || 'حدث خطأ'); e.code = j.code; throw e; }
    return j;
  }

  function apply(j) { me = j.me; db.users = j.users; db.progress = j.progress; }

  /* ---------- المصادقة ---------- */
  async function login(emp, pin) {
    const j = await api('login', { emp: String(emp).trim().toUpperCase(), pin: String(pin).trim() });
    localStorage.setItem(TOKEN_KEY, j.token);
    apply(j);
    return me;
  }

  async function restore() {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    try { apply(await api('sync')); return me; }
    catch (e) { if (e.code === 'auth') { logout(); return null; } throw e; }
  }

  async function refresh() { apply(await api('sync')); }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    me = null; db = { users: [], progress: {} };
  }

  function currentUser() { return me; }
  function getUser(id) { return db.users.find(u => u.id === String(id)) || null; }

  /* ---------- التقدم ---------- */
  const keyOf = id => String(id);

  function lessonDone(userId, lessonId) {
    return !!(db.progress[keyOf(userId)] || {})[`L:${lessonId}`];
  }

  function markLesson(userId, lessonId) {
    if (lessonDone(userId, lessonId)) return;
    const k = keyOf(userId);
    db.progress[k] = db.progress[k] || {};
    db.progress[k][`L:${lessonId}`] = Date.now();
    db.progress[k].updated_at = Date.now();
    api('lesson', { lessonId }).catch(e => UI.toast(e.message, 'error'));
  }

  function quizResult(userId, moduleId) {
    return (db.progress[keyOf(userId)] || {})[`Q:${moduleId}`] || null;
  }

  /* التصحيح يتم على الخادم، والإجابات الصحيحة لا تصل للمتصفح */
  async function submitQuiz(moduleId, answers) {
    const j = await api('quiz', { moduleId, answers });
    const k = keyOf(me.id);
    db.progress[k] = db.progress[k] || {};
    db.progress[k][`Q:${moduleId}`] = j.record;
    db.progress[k].updated_at = Date.now();
    return j;
  }

  function moduleState(userId, moduleId) {
    const mod = MODULES.find(m => m.id === moduleId);
    if (!mod) return null;
    const lessons = mod.lessons.filter(l => lessonDone(userId, l.id)).length;
    const q = quizResult(userId, moduleId);
    const done = lessons === mod.lessons.length && !!(q && q.passed);
    return {
      lessons_done: lessons,
      lessons_total: mod.lessons.length,
      lessons_read: lessons === mod.lessons.length,
      quiz: q,
      done
    };
  }

  function trackProgress(userId, roleId) {
    const track = TRACKS[roleId] || [];
    let done = 0;
    const detail = track.map(id => {
      const st = moduleState(userId, id);
      if (st && st.done) done++;
      return { id, done: !!(st && st.done) };
    });
    const pct = track.length ? Math.round((done / track.length) * 100) : 0;
    return { total: track.length, done, pct, detail };
  }

  function stats(userId, roleId) {
    const track = TRACKS[roleId] || [];
    let lessonsRead = 0, lessonsTotal = 0, scores = [], passed = 0;
    track.forEach(id => {
      const st = moduleState(userId, id);
      if (!st) return;
      lessonsRead += st.lessons_done;
      lessonsTotal += st.lessons_total;
      if (st.quiz) { scores.push(st.quiz.best); if (st.quiz.passed) passed++; }
    });
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const tp = trackProgress(userId, roleId);
    return {
      pct: tp.pct, modules_done: tp.done, modules_total: track.length,
      lessons_read: lessonsRead, lessons_total: lessonsTotal,
      avg_score: avg, modules_passed: passed,
      certified: track.length > 0 && tp.done === track.length
    };
  }

  /* التقرير: يعرض فقط من يحق للمستخدم رؤيتهم (يحدده الخادم حسب نطاق الصلاحية) */
  function workerReport() {
    return db.users.filter(u => u.active !== false).map(u => {
      const s = stats(u.id, u.role);
      const prog = db.progress[keyOf(u.id)] || {};
      return { user: u, stats: s, last_activity: prog.updated_at || null };
    });
  }

  async function resetWorker(userId) {
    await api('reset', { emp: userId });
    delete db.progress[keyOf(userId)];
  }

  return {
    login, restore, refresh, logout, currentUser, getUser,
    lessonDone, markLesson, quizResult, submitQuiz,
    moduleState, trackProgress, stats, workerReport, resetWorker
  };
})();
