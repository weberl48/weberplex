// Minimal Firestore REST client for the server functions (status, clock).
// Everything it does is something any guest's browser may do under the rules,
// so it needs no credentials beyond the public web key.

function decode(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
const decodeFields = (fields) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));

export function encode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: encodeFields(v) } };
  return { stringValue: String(v) };
}
const encodeFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, encode(v)]));

const docOf = (d) => ({ id: d.name.split('/').pop(), updateTime: d.updateTime, ...decodeFields(d.fields || {}) });

export function makeRest({ base, projectId, apiKey, fetchImpl = fetch }) {
  const dbPath = `projects/${projectId}/databases/(default)/documents`;
  const root = `${base}/${dbPath}`;
  const withKey = (url) => (apiKey ? `${url}${url.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}` : url);

  async function call(url, init) {
    const res = await fetchImpl(withKey(url), init);
    if (!res.ok) throw new Error(`Firestore ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
  }
  const post = (url, body) => call(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  return {
    // All docs in a collection path like 'votes' or 'nights/2026-10-17/snacks'.
    async list(path) {
      const out = [];
      let page = '';
      do {
        const body = await call(`${root}/${path}?pageSize=300${page ? `&pageToken=${encodeURIComponent(page)}` : ''}`);
        out.push(...(body.documents || []).map(docOf));
        page = body.nextPageToken || '';
      } while (page);
      return out;
    },

    // structuredQuery under `parent` ('' for the root).
    async query(parent, structuredQuery) {
      const rows = await post(`${root}${parent ? `/${parent}` : ''}:runQuery`, { structuredQuery });
      return rows.filter((r) => r.document).map((r) => docOf(r.document));
    },

    // Update fields on one doc. `stamp` names fields set to the commit time;
    // `ifUpdateTime` makes the write lose if the doc changed meanwhile.
    async update(path, fields, { stamp = [], ifUpdateTime } = {}) {
      return post(`${root}:commit`, {
        writes: [{
          update: { name: `${dbPath}/${path}`, fields: encodeFields(fields) },
          updateMask: { fieldPaths: Object.keys(fields) },
          updateTransforms: stamp.map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' })),
          ...(ifUpdateTime ? { currentDocument: { updateTime: ifUpdateTime } } : {}),
        }],
      });
    },
  };
}

export const eq = (field, value) => ({ fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: encode(value) } });

// Nights still in play (planned or locked), and finished ones.
export const nightsWhere = (R, status) => R.query('', { from: [{ collectionId: 'nights' }], where: eq('status', status) });
