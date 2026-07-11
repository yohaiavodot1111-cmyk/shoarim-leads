/* ============================================================
   Service Worker — מערכת לידים שוחרות
   אסטרטגיה: Network-First עבור המעטפת.
   הנתונים (Apps Script) לעולם לא נשמרים במטמון —
   כדי שלא יוצגו לידים ישנים או נתוני הרשאה מיושנים.
   ============================================================ */

const CACHE = 'leads-shell-v2';

// קבצי המעטפת בלבד (לא נתונים!)
// נשמר רק מה שבטוח קיים. הדף עצמו נשמר דינמית בשליפה הראשונה.
const SHELL = [
  './',
  './manifest.json'
];

// ── התקנה: שמור את המעטפת ──
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { /* אם קובץ חסר — אל תיכשל בהתקנה */ })
  );
});

// ── הפעלה: נקה מטמונים ישנים ──
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

// ── שליפה ──
self.addEventListener('fetch', function (e) {
  const url = e.request.url;

  // 1) בקשות שאסור למטמן — נתונים חיים, אימות, IP
  if (url.indexOf('script.google.com') > -1 ||
      url.indexOf('api.ipify.org')     > -1 ||
      e.request.method !== 'GET') {
    return; // עובר ישירות לרשת, ללא התערבות
  }

  // 2) המעטפת — Network-First (תמיד מנסה להביא גרסה עדכנית)
  e.respondWith(
    fetch(e.request)
      .then(function (res) {
        // שמור עותק טרי למקרה של ניתוק
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      })
      .catch(function () {
        // אין רשת — הגש מהמטמון
        return caches.match(e.request);
      })
  );
});
