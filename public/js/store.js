// Live subscriptions. Each callback gets plain objects ({ id, ...data }).
const SUBS = ['dates', 'rsvps', 'movies', 'slots', 'votes', 'snacks', 'reviews'];
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));

export function watchNights(db, F, cb, onErr) {
  const q = F.query(F.collection(db, 'nights'), F.orderBy('createdAt', 'desc'), F.limit(15));
  return F.onSnapshot(q, (snap) => cb(rows(snap)), onErr);
}

export function watchPeople(db, F, cb, onErr) {
  return F.onSnapshot(F.collection(db, 'people'), (snap) => cb(rows(snap)), onErr);
}

// All of one night's subcollections, coalesced into one callback per tick.
export function watchNight(db, F, nightId, cb, onErr) {
  const state = Object.fromEntries(SUBS.map((s) => [s, []]));
  const loaded = new Set();
  let queued = false;
  const flush = () => { queued = false; cb({ ...state, ready: loaded.size === SUBS.length }); };
  const unsubs = SUBS.map((s) => F.onSnapshot(F.collection(db, 'nights', nightId, s), (snap) => {
    state[s] = rows(snap);
    loaded.add(s);
    if (!queued) { queued = true; queueMicrotask(flush); }
  }, onErr));
  return () => unsubs.forEach((u) => u());
}

export async function loadReviews(db, F, nightId) {
  return rows(await F.getDocs(F.collection(db, 'nights', nightId, 'reviews')));
}
