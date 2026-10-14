// Public Firebase web config — safe to ship; firestore.rules is the gate.
export const firebaseConfig = {
  apiKey: 'AIzaSyCRUW4tIMH7zQ7ITYLthQM5aU-8Rpr55TQ',
  authDomain: 'speakeasy-picture-show.firebaseapp.com',
  projectId: 'speakeasy-picture-show',
  appId: '1:1053219659772:web:593707f0d8ddf12b399c79',
  messagingSenderId: '1053219659772',
};

export const SITE_URL = 'https://weberplex.vercel.app';

// The site's owner (a nameKey). Only they see the owner console link; the
// console itself still needs their password.
export const OWNER = 'lucas';

// Regular hosts, offered as quick choices when setting a locked night's
// house. Hosting itself is volunteer-based: nobody is assigned by default.
export const PLACES = ['Weber', 'Ferger', 'Libby', 'Huey'];
