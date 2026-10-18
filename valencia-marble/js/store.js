'use strict';

/* ========== التخزين (قاعدة بيانات المتصفح) ========== */
const Store = (() => {
  const DB_KEY = 'valencia_training_db_v1';
  const SESSION_KEY = 'valencia_training_session';

  let db = null;

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) { db = JSON.parse(raw); return; }
    } catch (e) { console.warn('تعذر قراءة التخزين', e); }
    db = { users: [], progress: {}, created_at: Date.now() };
    seed();
    save();
  }

  function seed() {
    db.users = SEED_USERS.map((u, i) => ({ id: i + 1, ...u, active: true, created_at: Date.now() }));
    db.progress = {};
  }

  function save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
      console.error('تعذر الحفظ', e);
      UI.toast('تعذر الحفظ في متصفحك — قد يكون التخزين ممتلئاً', 'error');
    }
  }

  function resetAll() {
    seed();
    save();
    sessionStorage.removeItem(SESSION_KEY);
  }

  /* ---------- المصادقة ---------- */
  function login(username, password) {
    const u = db.users.find(x => x.username === String(username).trim().toLowerCase() && x.active !== false);
    if (!u || u.password !== password) return null;
    sessionStorage.setItem(SESSION_KEY, String(u.id));
    return u;
  }

  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  function currentUser() {
    const id = Number(sessionStorage.getItem(SESSION_KEY));
    if (!id) return null;
    return db.users.find(u => u.id === id) || null;
  }

  function listUsers(filter) {
    let rows = db.users.slice();
    if (filter) {
      const q = (filter.q || '').trim();
      if (q) rows = rows.filter(u => u.full_name.includes(q) || u.username.includes(q) || (u.phone || '').includes(q));
      if (filter.role) rows = rows.filter(u => u.role === filter.role);
      if (filter.warehouse) rows = rows.filter(u => u.warehouse === filter.warehouse);
    }
    return rows;
  }

  function getUser(id) { return db.users.find(u => u.id === Number(id)) || null; }

  /* ---------- التقدم ---------- */
  function keyOf(userId) { return String(userId); }

  function lessonDone(userId, lessonId) {
    return !!(db.progress[keyOf(userId)] || {})[`L:${lessonId}`];
  }

  function markLesson(userId, lessonId) {
    const k = keyOf(userId);
    db.progress[k] = db.progress[k] || {};
    db.progress[k][`L:${lessonId}`] = Date.now();
    db.progress[k].updated_at = Date.now();
    save();
  }

  function quizResult(userId, moduleId) {
    return (db.progress[keyOf(userId)] || {})[`Q:${moduleId}`] || null;
  }

  function saveQuiz(userId, moduleId, score, total, passed) {
    const k = keyOf(userId);
    db.progress[k] = db.progress[k] || {};
    const prev = db.progress[k][`Q:${moduleId}`];
    db.progress[k][`Q:${moduleId}`] = {
      score, total, passed,
      tries: ((prev && prev.tries) || 0) + 1,
      best: Math.max(score, (prev && prev.best) || 0),
      at: Date.now()
    };
    db.progress[k].updated_at = Date.now();
    save();
    return db.progress[k][`Q:${moduleId}`];
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
      const mod = MODULES.find(m => m.id === id);
      if (!st || !mod) return;
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

  function workerReport() {
    return db.users.filter(u => u.active !== false).map(u => {
      const s = stats(u.id, u.role);
      const prog = db.progress[keyOf(u.id)] || {};
      return { user: u, stats: s, last_activity: prog.updated_at || null };
    });
  }

  function resetWorker(userId) {
    delete db.progress[keyOf(userId)];
    save();
  }

  function progressOfAll() {
    return db.progress;
  }

  return {
    load, save, resetAll, login, logout, currentUser,
    listUsers, getUser, lessonDone, markLesson, quizResult, saveQuiz,
    moduleState, trackProgress, stats, workerReport, resetWorker, progressOfAll
  };
})();
