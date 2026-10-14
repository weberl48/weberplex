// Live subscriptions. Each callback gets plain objects ({ id, ...data }).
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));

export function watch(db, F, path, cb, onErr) {
  return F.onSnapshot(F.collection(db, ...path.split('/')), (snap) => cb(rows(snap)), onErr);
}

// Every night (one doc per day), newest first. No cap: the shelf and the stats
// need all the watched ones, or an old movie would come back to the shelf.
export function watchNights(db, F, cb, onErr) {
  return F.onSnapshot(F.query(F.collection(db, 'nights'), F.orderBy('day', 'desc')), (snap) => cb(rows(snap)), onErr);
}

// Free evenings from `fromDay` on (older marks don't matter).
export function watchFree(db, F, fromDay, cb, onErr) {
  return F.onSnapshot(F.query(F.collection(db, 'free'), F.where('day', '>=', fromDay)), (snap) => cb(rows(snap)), onErr);
}

export function watchDoc(db, F, path, cb, onErr) {
  return F.onSnapshot(F.doc(db, ...path.split('/')), (snap) => cb(snap.exists() ? snap.data() : null), onErr);
}

export async function loadRows(db, F, path) {
  return rows(await F.getDocs(F.collection(db, ...path.split('/'))));
}
