// Every write the site makes. Firestore functions are injected (`F`) so the
// browser passes the CDN SDK and the rules tests pass the npm SDK — the tests
// exercise exactly these writes against firestore.rules.
import { HOUSE, cleanName, nameKey, lockFields, cleanTheme } from './logic.js';

function secureId(len = 24) {
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

const MOVIES_PER_BATCH = 20;

export class AlreadyOnShelfError extends Error {
  constructor(movie) {
    super(`${movie.title} is already on the shelf${movie.byName ? ` (added by ${movie.byName})` : ''}. Give it a thumbs-up instead.`);
    this.code = 'already-on-shelf';
  }
}

export function makeActions(db, F) {
  const { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, runTransaction, deleteField } = F;
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
    batch.op = op;
    return batch;
  }

  const freeDoc = (who, day) => ({ day, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
  // A night's per-person maps, each with a stamp map beside it (`vetoes`/`vetoAt`,
  // `ballotVotes`/`ballotVoteAt`, `writeIns`/`writeInAt`). A write is a field path
  // for one person's key, so it touches nobody else's; the stamp rides in the
  // same update (set with the entry, gone with it): the rules require both, and
  // "Since you last looked" reads it.
  const PER_PERSON = [['vetoes', 'vetoAt'], ['ballotVotes', 'ballotVoteAt'], ['writeIns', 'writeInAt']];
  const entryWrite = (who, [field, stamp], movieId) => ({
    [`${field}.${who.nameKey}`]: movieId || deleteField(),
    [`${stamp}.${who.nameKey}`]: movieId ? serverTimestamp() : deleteField(),
  });

  // One person's entry in one of those maps (a veto, a vote, a write-in), with
  // their own key only, so two people writing at once both keep theirs (rewriting
  // the whole map would look like a change to someone else's key to the rules).
  async function setEntry(day, who, entry, movieId) {
    const snap = await getDoc(night(day));
    if (!snap.exists() || snap.data().status !== 'planned') return false;
    if ((movieId || null) === (snap.data()[entry[0]]?.[who.nameKey] || null)) return true; // nothing to change
    await batched((b) => b.update(night(day), entryWrite(who, entry, movieId)));
    return true;
  }

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

    // Per-person settings on people/{nameKey} (nothing lives in the browser
    // but your name): lastSeen (true = now), toured, hostTime, reels.
    async savePrefs(who, prefs) {
      const p = { ...prefs };
      if (p.lastSeen === true) p.lastSeen = serverTimestamp();
      if (p.reels) p.reels = p.reels.slice(-20);
      await batched((b) => b.set(doc(db, 'people', who.nameKey), p, { merge: true }));
    },

    // ---- the shelf ---------------------------------------------------------
    // `movie` is the output of movieFromMeta(). Adding also gives it your thumb.
    async addMovie(who, movie, pitch = '') {
      const ref = doc(db, 'movies', movie.imdbId);
      const existing = await getDoc(ref);
      if (existing.exists()) throw new AlreadyOnShelfError(existing.data());
      try {
        await batched((b) => {
          b.set(ref, { ...movie, pitch: String(pitch).trim().slice(0, 140), by: who.nameKey, byName: who.name, at: serverTimestamp() });
          b.set(doc(db, 'votes', `${movie.imdbId}__${who.nameKey}`), { movie: movie.imdbId, title: movie.title, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
        });
      } catch (e) {
        const now = await getDoc(ref); // someone added it a moment ago
        if (now.exists()) throw new AlreadyOnShelfError(now.data());
        throw e;
      }
    },

    // The Paste a list tab: several movies at once, each written exactly as addMovie writes it (pitch
    // '', and your thumb when `thumbs`). Batches of at most 20 movies (a batch holds 500 writes; this
    // is two per movie, so there is plenty of room). Anything on the shelf already, or put there since
    // the list was read, is skipped. Resolves with the ids of what was added, skipped and failed (and
    // the last error): a batch that fails is reported and the next ones still go.
    async addMovies(who, movies, { thumbs = true } = {}) {
      const res = { added: [], skipped: [], failed: [], error: null };
      const taken = async (m) => (await getDoc(doc(db, 'movies', m.imdbId))).exists();
      const commit = (chunk) => batched((b) => {
        for (const m of chunk) {
          b.set(doc(db, 'movies', m.imdbId), { ...m, pitch: '', by: who.nameKey, byName: who.name, at: serverTimestamp() });
          if (thumbs) b.set(doc(db, 'votes', `${m.imdbId}__${who.nameKey}`), { movie: m.imdbId, title: m.title, nameKey: who.nameKey, name: who.name, at: serverTimestamp() });
        }
      });
      const list = [...new Map(movies.map((m) => [m.imdbId, m])).values()];
      for (let i = 0; i < list.length; i += MOVIES_PER_BATCH) {
        let chunk = list.slice(i, i + MOVIES_PER_BATCH);
        // Twice at most: a batch bounces whole when one of its movies landed a moment ago, so look again.
        for (let attempt = 0; chunk.length; attempt += 1) {
          try {
            const there = await Promise.all(chunk.map(taken));
            res.skipped.push(...chunk.filter((_, j) => there[j]).map((m) => m.imdbId));
            chunk = chunk.filter((_, j) => !there[j]);
            if (chunk.length) await commit(chunk);
            res.added.push(...chunk.map((m) => m.imdbId));
            chunk = [];
          } catch (e) {
            res.error = e;
            if (attempt) { res.failed.push(...chunk.map((m) => m.imdbId)); chunk = []; }
          }
        }
      }
      return res;
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
    // Dropping out of a planned night also takes back your veto, vote and
    // write-in there, in the same batch and as one write to the night (the
    // rules look at the free mark as it was before the batch, so they are
    // still allowed to go).
    async setFree(day, who, isFree) {
      const ref = doc(db, 'free', `${day}__${who.nameKey}`);
      let held = [];
      if (!isFree) {
        const snap = await getDoc(night(day));
        held = snap.exists() && snap.data().status === 'planned' ? PER_PERSON.filter(([field]) => !!snap.data()[field]?.[who.nameKey]) : [];
      }
      await batched((b) => {
        if (isFree) { b.set(ref, freeDoc(who, day)); return; }
        b.delete(ref);
        if (held.length) b.update(night(day), Object.assign({}, ...held.map((entry) => entryWrite(who, entry, null))));
      });
    },

    // Volunteer to host `day`, starting at `startsAt`, with an optional theme
    // ('' = none). Creates the night (or revives a cancelled one) and marks you free.
    async hostNight(who, day, startsAt, theme = '') {
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
          theme: cleanTheme(theme), vetoes: {}, ballotVotes: {}, writeIns: {},
        });
        if (!isFree) b.set(free, freeDoc(who, day));
      });
    },

    async setNightTime(day, startsAt) {
      await batched((b) => b.update(night(day), { startsAt, movedAt: serverTimestamp() }));
    },

    // The night's theme ('' clears it); only while it is still planned.
    async setTheme(day, theme) {
      await batched((b) => b.update(night(day), { theme: cleanTheme(theme), themeAt: serverTimestamp() }));
    },

    // Your one veto on a night (movieId = null takes it back). Writes only your
    // own key, so two people vetoing at once both keep theirs (rewriting the
    // whole map would look like a change to someone else's key to the rules).
    // False if the night has moved on (locked, cancelled) in the meantime.
    async setVeto(day, who, movieId) {
      return setEntry(day, who, PER_PERSON[0], movieId);
    },

    // Your one vote on a night's ballot, and your one write-in (a movie of your
    // choice put on it): the same shape as a veto, except that either can move
    // to another movie in one write. movieId = null takes it back. False if the
    // night has moved on (locked, cancelled) in the meantime.
    async setBallotVote(day, who, movieId) {
      return setEntry(day, who, PER_PERSON[1], movieId);
    },

    async setWriteIn(day, who, movieId) {
      return setEntry(day, who, PER_PERSON[2], movieId);
    },

    // Lock the movie. A transaction, so two phones noticing the deadline at
    // once can't lock different movies. `expect`: the vetoes, theme, votes and
    // write-ins the pick was made from; if the night has changed since, nothing
    // is locked (the next pass picks again from what's there).
    async lockNight(day, pick, expect = null) {
      const same = (a = {}, b = {}) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(night(day));
        if (!snap.exists() || snap.data().status !== 'planned') return false;
        const d = snap.data();
        if (expect && (!same(d.vetoes || {}, expect.vetoes) || (d.theme || '') !== (expect.theme || '')
          || !same(d.ballotVotes || {}, expect.ballotVotes) || !same(d.writeIns || {}, expect.writeIns))) return false;
        tx.update(night(day), { ...lockFields(pick), lockedAt: serverTimestamp() });
        return true;
      });
    },

    async unlockNight(day) {
      await batched((b) => b.update(night(day), { status: 'planned', lockedMovieId: null, lockedMovie: null, lockedTie: [], lockedAt: null, lockedVotes: null }));
    },

    async finishNight(day) {
      return runTransaction(db, async (tx) => {
        const snap = await tx.get(night(day));
        if (!snap.exists() || snap.data().status !== 'locked') return false;
        tx.update(night(day), { status: 'done', finishedAt: serverTimestamp() });
        return true;
      });
    },

    // Cancelling also clears the night's snacks, so a re-hosted day starts fresh.
    async cancelNight(day) {
      const snacks = await getDocs(collection(db, 'nights', day, 'snacks'));
      await batched((b) => {
        for (const s of snacks.docs) b.delete(s.ref);
        b.update(night(day), { status: 'cancelled', finishedAt: serverTimestamp() });
      });
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

    // Swaps the owner password; the current one has to be right.
    async changeOwnerPassword(hostKey, next) {
      const pw = String(next);
      if (pw.length < 8) throw new Error('Use at least 8 characters.');
      const b = ownerBatch(hostKey);
      b.set(doc(db, 'config', 'host'), { key: pw, op: b.op });
      await b.commit();
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
