// Run the clock by hand: node tools/tick.mjs [--emu]
import { tick } from '../lib/tick.js';
import { firebaseConfig } from '../public/js/config.js';

const emu = process.argv.includes('--emu');
console.log(JSON.stringify(await tick({
  base: emu ? 'http://127.0.0.1:8181/v1' : 'https://firestore.googleapis.com/v1',
  projectId: firebaseConfig.projectId,
  apiKey: emu ? '' : firebaseConfig.apiKey,
})));
