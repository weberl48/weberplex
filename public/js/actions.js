// Every write the site makes. Firestore functions are injected (`F`) so the
// browser passes the CDN SDK and the rules tests pass the npm SDK — the tests
// exercise exactly these writes against firestore.rules.
import { HOUSE, cleanName, nameKey, lockFields } from './logic.js';

function secureId(len = 24) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

export class AlreadyOnShelfError extends Error {
  constructor(movie) {
    super(`${movie.title} is already on the shelf${movie.byName ? ` (added by ${movie.byName})` : ''}. Give it a thumbs-up instead.`);
    this.code = 'already-on-shelf';
  }
}

export function makeActions(db, F) {
  const { doc, collection, writeBatch, serverTimestamp, getDoc, runTransaction } = F;
  const night = (day) => doc(db, 'nights', day);
  const batched = async (fill) => { const b = writeBatch(db); fill(b); await b.commit(); };

  function me(name) {
    const clean = cleanName(name);
    const key = nameKey(clean);
    if (!clean || !key) throw new Error('Type a name with at least one letter or number.');
    return { name: clean, nameKey: key };
  }

  // Owner writes: a fresh hostops doc holding the key, plus config/season
  // re-stamped with that op in the same batch (see ownerTouched in the rules).
  function ownerBatch(hostKey) {
    const batch = writeBatch(db);
    const op = secureId(24);
    batch.set(doc(db, 'hostops', op), { key: hostKey, at: serverTimestamp() });
    batch.set(doc(db, 'config', 'season'), { op }, { merge: true });
    return batch;
  }

  const freeDoc = (who, day) => ({ day, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });

  return {
    me,

    async join(rawName) {
      const who = me(rawName);
      const ref = doc(db, 'people', who.nameKey);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        try {
          await batched((b) => b.set(ref, { name: who.name, at: serverTimestamp() }));
        } catch (e) {
          if (!(await getDoc(ref)).exists()) throw e; // someone registered it a moment ago
        }
        return who;
      }
      return { name: snap.data().name, nameKey: who.nameKey };
    },

    // ---- the shelf ---------------------------------------------------------
    // `movie` is the output of movieFromMeta(). Adding also gives it your thumb.
    async addMovie(who, movie, pitch = '') {
      const ref = doc(db, 'movies', movie.imdbId);
      const existing = await getDoc(ref);
      if (existing.exists()) throw new AlreadyOnShelfError(existing.data());
      await batched((b) => {
        b.set(ref, { ...movie, pitch: String(pitch).trim().slice(0, 140), by: who.nameKey, byName: who.name, at: serverTimestamp() });
        b.set(doc(db, 'votes', `${movie.imdbId}__${who.nameKey}`), { movie: movie.imdbId, title: movie.title, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
      });
    },

    // Takes a movie off the shelf with its thumbs and seen marks.
    async removeMovie(movie, voteKeys = [], seenKeys = []) {
      await batched((b) => {
        b.delete(doc(db, 'movies', movie.imdbId));
        for (const k of voteKeys) b.delete(doc(db, 'votes', `${movie.imdbId}__${k}`));
        for (const k of seenKeys) b.delete(doc(db, 'seen', `${movie.imdbId}__${k}`));
      });
    },

    async setVote(movie, who, on) {
      const ref = doc(db, 'votes', `${movie.imdbId}__${who.nameKey}`);
      await batched((b) => (on
        ? b.set(ref, { movie: movie.imdbId, title: movie.title, nameKey: who.nameKey, name: who.name, at: serverTimestamp() })
        : b.delete(ref)));
    },

    async setSeen(movie, who, on) {
      const ref = doc(db, 'seen', `${movie.imdbId}__${who.nameKey}`);
      await batched((b) => (on ? b.set(ref, { movie: movie.imdbId, nameKey: who.nameKey, name: who.name, at: serverTimestamp() }) : b.delete(ref)));
    },

    // ---- the calendar --------------------------------------------------------
    async setFree(day, who, isFree) {
      const ref = doc(db, 'free', `${day}__${who.nameKey}`);
      await batched((b) => (isFree ? b.set(ref, freeDoc(who, day)) : b.delete(ref)));
    },

    // Volunteer to host `day`, starting at `startsAt`. Creates the night (or
    // revives a cancelled one) and marks you free.
    async hostNight(who, day, startsAt) {
      const ref = night(day);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().status !== 'cancelled') {
        throw new Error(`${snap.data().host} is already hosting that evening.`);
      }
      const free = doc(db, 'free', `${day}__${who.nameKey}`);
      const isFree = (await getDoc(free)).exists();
      await batched((b) => {
        b.set(ref, {
          day, startsAt, host: who.name, hostKey: who.nameKey, status: 'planned', createdAt: serverTimestamp(),
          lockedMovieId: null, lockedMovie: null, lockedTie: [], lockedAt: null, finishedAt: null,
        });
        if (!isFree) b.set(free, freeDoc(who, day));
      });
    },

    async setNightTime(day, startsAt) {
      await batched((b) => b.update(night(day), { startsAt }));
    },

    // Lock the movie. A transaction, so two phones noticing the deadline at
    // once can't lock different movies.
    async lockNight(day, pick) {
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(night(day));
        if (!snap.exists() || snap.data().status !== 'planned') return false;
        tx.update(night(day), { ...lockFields(pick), lockedAt: serverTimestamp() });
        return true;
      });
    },

    async unlockNight(day) {
      await batched((b) => b.update(night(day), { status: 'planned', lockedMovieId: null, lockedMovie: null, lockedTie: [], lockedAt: null }));
    },

    async finishNight(day) {
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(night(day));
        if (!snap.exists() || snap.data().status !== 'locked') return false;
        tx.update(night(day), { status: 'done', finishedAt: serverTimestamp() });
        return true;
      });
    },

    async cancelNight(day) {
      await batched((b) => b.update(night(day), { status: 'cancelled', finishedAt: serverTimestamp() }));
    },

    async addSnack(day, who, rawItem) {
      const item = String(rawItem ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!item) throw new Error('Say what you’re bringing.');
      await batched((b) => b.set(doc(collection(db, 'nights', day, 'snacks')), { item, nameKey: who.nameKey, name: who.name, at: serverTimestamp() }));
    },

    async removeSnack(day, snackId) {
      await batched((b) => b.delete(doc(db, 'nights', day, 'snacks', snackId)));
    },

    async review(day, who, stars, line = '') {
      await batched((b) => b.set(doc(db, 'nights', day, 'reviews', who.nameKey), {
        stars: Math.max(1, Math.min(5, Math.round(stars))),
        line: String(line).trim().slice(0, 140),
        nameKey: who.nameKey, name: who.name, at: serverTimestamp(),
      }));
    },

    // ---- owner -------------------------------------------------------------------
    async seedHostKey(hostKey) {
      await batched((b) => b.set(doc(db, 'config', 'host'), { key: hostKey }));
    },

    // Proves the key without changing anything visible.
    async checkHostKey(hostKey) {
      try { await ownerBatch(hostKey).commit(); return true; } catch { return false; }
    },

    // The marquee's season title ("Spooky Season"); empty clears it.
    async setSeason(hostKey, title) {
      const b = ownerBatch(hostKey);
      b.set(doc(db, 'config', 'season'), { title: String(title).trim().slice(0, 60) }, { merge: true });
      await b.commit();
    },

    // House picks: owner-added, tagged, owned by nobody. Skips anything on the
    // shelf already. Returns the ids it added.
    async addHousePicks(hostKey, movies, shelf = []) {
      const taken = new Set(shelf.map((m) => m.imdbId));
      const fresh = movies.filter((m) => !taken.has(m.imdbId));
      if (!fresh.length) return [];
      const b = ownerBatch(hostKey);
      for (const m of fresh) {
        b.set(doc(db, 'movies', m.imdbId), {
          ...m, shelf: (m.shelf || []).slice(0, 4), pitch: String(m.pitch || '').slice(0, 140),
          by: HOUSE, byName: 'The house', at: serverTimestamp(),
        });
      }
      await b.commit();
      return fresh.map((m) => m.imdbId);
    },

    async ownerRemoveMovie(hostKey, movie, voteKeys = [], seenKeys = []) {
      const b = ownerBatch(hostKey);
      b.delete(doc(db, 'movies', movie.imdbId));
      for (const k of voteKeys) b.delete(doc(db, 'votes', `${movie.imdbId}__${k}`));
      for (const k of seenKeys) b.delete(doc(db, 'seen', `${movie.imdbId}__${k}`));
      await b.commit();
    },

    // HA watches control/shield and opens this movie in Stremio on the Shield.
    async showOnShield(hostKey, movie) {
      const batch = writeBatch(db);
      const op = secureId(24);
      batch.set(doc(db, 'hostops', op), { key: hostKey, at: serverTimestamp() });
      batch.set(doc(db, 'control', 'shield'), {
        imdb: movie.imdbId, title: String(movie.title || '').slice(0, 120), seq: Date.now(), op, at: serverTimestamp(),
      });
      await batch.commit();
    },
  };
}
