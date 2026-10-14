"""Timings table for one iteration: python .improve/timings.py <iter-dir> [<previous-iter-dir>]
Median and worst over the seed-1 runs; the seed-2 run is listed apart."""
import json
import statistics
import sys
from pathlib import Path


def load(d):
    rows = {}
    for f in sorted(Path(d).glob('run-s1-*/timings.json')):
        for s in json.loads(f.read_text(encoding='utf-8'))['steps']:
            rows.setdefault(f"{s['who']}: {s['step']}", []).append(s['ms'])
    return rows


cur = load(sys.argv[1])
prev = load(sys.argv[2]) if len(sys.argv) > 2 else {}
s2 = {}
for f in Path(sys.argv[1]).glob('run-s2/timings.json'):
    for s in json.loads(f.read_text(encoding='utf-8'))['steps']:
        s2[f"{s['who']}: {s['step']}"] = s['ms']
print('| step | median ms | worst ms | spread | previous median | seed 2 |')
print('|---|---|---|---|---|---|')
for k, v in cur.items():
    p = statistics.median(prev[k]) if k in prev else '-'
    print(f'| {k} | {statistics.median(v):.0f} | {max(v)} | {max(v) - min(v)} | {p} | {s2.get(k, "-")} |')
