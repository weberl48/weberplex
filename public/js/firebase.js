// Firebase SDK from Google's CDN (pinned). The `F` bundle is what actions.js
// and store.js take, so the same code runs against the npm SDK in tests.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, connectFirestoreEmulator, doc, collection, writeBatch, serverTimestamp, getDoc, getDocs,
  query, where, orderBy, limit, onSnapshot, runTransaction, deleteField, waitForPendingWrites,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './config.js';

export const db = getFirestore(initializeApp(firebaseConfig));

// Local testing: http://localhost:5173/?emu talks to the Firestore emulator.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if (local && new URLSearchParams(location.search).has('emu')) connectFirestoreEmulator(db, '127.0.0.1', 8181);

// Resolves once every write made so far has reached the server (never, while
// the connection is down).
export const sent = () => waitForPendingWrites(db);

export const F = { doc, collection, writeBatch, serverTimestamp, getDoc, getDocs, query, where, orderBy, limit, onSnapshot, runTransaction, deleteField };
