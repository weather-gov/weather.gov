# ---
# jupyter:
#   jupytext:
#     formats: ipynb,py:percent
#     text_representation:
#       extension: .py
#       format_name: percent
#       format_version: '1.3'
#       jupytext_version: 1.19.3
#   kernelspec:
#     display_name: Python 3 (ipykernel)
#     language: python
#     name: python3
# ---

# %% [markdown]
# # beta.weather.gov load test visualization
#
# **Input:** an NDJSON-ish file where each line is one request record. These files should be K6 load test runs downloaded as `txt`. (Blank lines are ignored).
#
# All records are converted into JSON rows (with K6 timestamp associated with the record) and returned as a data frame.

# %%
# # %pip install --quiet plotly pandas

# %%
import json
import re
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

PATH = 'Logs-2026-06-05 10_32_23.txt'

ANSI = re.compile(r'\t\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\t')
TS = re.compile(r'\[(\d{3,})\]') # k6 prints elapsed seconds as [NNNN]
JSON_OBJ = re.compile(r'(\{.*\})\s*$')

def load(path):
    rows = []
    with open(path) as f:
        for line in f:
            if line.startswith("Common labels"):
                continue # start of txt
            line = ANSI.sub('', line).rstrip()
            if not line:
                continue
            t = TS.search(line)
            j = JSON_OBJ.search(line)
            if not j:
                continue
            try:
                obj = json.loads(j.group(1))
            except json.JSONDecodeError:
                continue
            obj['t_sec'] = int(t.group(1)) if t else None
            rows.append(obj)
    df = pd.DataFrame(rows)
    df['django_timing'] = pd.to_numeric(df.get('django_timing'), errors='coerce')
    if df['t_sec'].isna().all():
        # fallback to evenly spaced row position
        df['t_sec'] = (df.index / max(1, len(df) - 1)) * 300
    return df

def classify(url):
    if '/risk-overview/' in url:
        return 'forecast/county/risk-overview'
    if '/forecast/point/' in url:
        return 'forecast/point'
    if '/forecast/county/' in url:
        return 'forecast/county'
    return 'other'

df = load(PATH)
df['request_type'] = df['url'].apply(classify)
df['network_ms'] = df['k6_timing'] - df['django_timing']
df['django_minus_interop'] = df['django_timing'] - df['interopResponseTime']
print(f'{len(df)} records, {df.request_type.value_counts().to_dict()}')
df.head()

# %% [markdown]
# ## 1. Request latency over time
#
# Each dot is one request, colored by request type. Rolling p95 (10s window) is overlaid in black.

# %%
fig = px.scatter(df,
                 x='t_sec',
                 y='k6_timing',
                 color='request_type',
                 opacity=0.35,
                 height=450,
                 labels={'t_sec': 'seconds into test', 'k6_timing': 'k6 wall time (ms)'},
                 title='Request latency over time')

p95 = (df.sort_values('t_sec')
         .set_index('t_sec')['k6_timing']
         .rolling(window=200, min_periods=20)
         .quantile(0.95))
fig.add_trace(
    go.Scatter(x=p95.index,
               y=p95.values,
               name='rolling p95',
               line=dict(color='black', width=2)))
fig.show()


# %% [markdown]
# ## 2. Latency decomposition by request type
#
# Stack the time used for the median call (split amongst all endpoints)

# %%
def critical_path(row):
    batches = row.get('batches')
    if isinstance(batches, list) and batches:
        return sum(b['max'] for b in batches)
    timings = row.get('timings')
    if isinstance(timings, list) and timings:
        return max(t['timing'] for t in timings)
    return 0.0

df['api'] = df.apply(critical_path, axis=1)
df['interop'] = df['interopResponseTime'] - df['api']

order = ['api', 'interop', 'django', 'network']
decomp = (df.groupby('request_type')
            .agg(api=('api', 'median'),
                 interop=('interop', 'median'),
                 django=('django_minus_interop', 'median'),
                 network=('network_ms', 'median'))
            .reset_index()
            .melt(id_vars='request_type',
                  var_name='component',
                  value_name='median_ms'))
decomp['component'] = pd.Categorical(decomp['component'], categories=order, ordered=True)
decomp = decomp.sort_values(['request_type', 'component'])

px.bar(decomp,
       x='request_type',
       y='median_ms',
       color='component',
       category_orders={'component': order},
       labels={'request_type': 'request type', 'median_ms': 'median latency (ms)'},
       title='Median latency decomposition (ms)', height=600).show()

# %% [markdown]
# ## 3. Latency distribution per request type
#
# Box plots: show p25/p50/p75/whiskers and outliers.

# %%
px.box(df,
       x='request_type',
       y='k6_timing',
       points='outliers',
       labels={'request_type': 'request type', 'k6_timing': 'k6 wall time (ms)'},
       title='k6 wall time by request type',
       height=450).show()


# %% [markdown]
# ## 4. Upstream API endpoint timings
#
# Explode `timings` array and normalize URLs. Rank each upstream endpoint by tail latency.

# %%
def cache_layer(t):
    if t.get('cached'):
        return 'redis'
    ak  = (t.get('akamaiCache') or '').upper()
    akr = (t.get('akamaiCacheRemote') or '').upper()
    akc = (t.get('akamaiCacheable') or '').upper()
    if 'HIT' in ak:
        return 'akamai_edge'
    if 'HIT' in akr:
        return 'akamai_tier2'
    if akc == 'YES':
        return 'origin_cacheable'
    if akc == 'NO':
        return 'origin_uncacheable'
    return 'unknown'

def normalize(url):
    url = re.sub(r'/offices/[A-Z]+/', '/offices/*/', url)
    url = re.sub(r'/gridpoints/[A-Z]+/\d+,\d+', '/gridpoints/*/*,*', url)
    url = re.sub(r'/stations/[A-Z0-9]+/', '/stations/*/', url)
    url = re.sub(r'/points/-?\d+\.\d+,-?\d+\.\d+', '/points/*,*/', url)
    return url

# faster to slower
LAYER_ORDER = ['redis', 'akamai_edge', 'akamai_tier2', 'origin_cacheable', 'origin_uncacheable', 'unknown']

rows = []
for _, r in df.iterrows():
    timings = r.get('timings')
    if not isinstance(timings, list):
        continue
    for t in timings:
        rows.append({'endpoint': normalize(t['url']),
                     'timing': t['timing'],
                     'cached': t.get('cached', False),
                     'akamaiCache': t.get('akamaiCache'),
                     'akamaiCacheRemote': t.get('akamaiCacheRemote'),
                     'akamaiCacheable': t.get('akamaiCacheable'),
                     'cache_layer': cache_layer(t),
                     't_sec': r['t_sec']})
ups = pd.DataFrame(rows)
ups['cache_layer'] = pd.Categorical(ups['cache_layer'],
                                    categories=LAYER_ORDER, ordered=True)
print(f'{len(ups)} upstream calls across {ups.endpoint.nunique()} endpoints')
print('cache_layer distribution:')
print(ups['cache_layer'].value_counts().reindex(LAYER_ORDER, fill_value=0))

order = ups.groupby('endpoint')['timing'].quantile(0.95).sort_values().index
px.box(ups,
       x='timing',
       y='endpoint',
       points='outliers',
       labels={'timing': 'timing (ms)', 'endpoint': 'API endpoint'},
       category_orders={'endpoint': list(order)},
       height=600,
       title='Upstream call latency by endpoint (sorted by p95)').show()

# %% [markdown]
# ## 5. Cache layer breakdown by upstream endpoint
#
# Sorts upstream calls into one of these:
#
# 1. **redis** — served from our app-level Redis cache (request never left interop layer).
# 2. **akamai_edge** — Akamai tier-1 edge hit (`X-Cache` has `HIT` in it).
# 3. **akamai_tier2** — edge missed, but the Akamai parent/tier-2 hit (`X-Cache-Remote` has `HIT` in it).
# 4. **origin_cacheable** — both Akamai tiers missed, but this could have been cached. (This is a sanity check)
# 5. **origin_uncacheable** — Should not happen.
#

# %%

counts = (ups.groupby(['endpoint', 'cache_layer'], observed=True)
             .size().rename('n').reset_index())
totals = counts.groupby('endpoint')['n'].transform('sum')
counts['share'] = counts['n'] / totals

# Order endpoints by effective hit rate so the worst-served are at the top.
hit_layers = ['redis', 'akamai_edge', 'akamai_tier2']
miss_layers = ['origin_cacheable']
def effective_rate(group):
    hits = group.loc[group.cache_layer.isin(hit_layers), 'n'].sum()
    misses = group.loc[group.cache_layer.isin(miss_layers), 'n'].sum()
    denom = hits + misses
    return hits / denom if denom else float('nan')
endpoint_eff = (counts.groupby('endpoint').apply(effective_rate, include_groups=False)
                .sort_values(na_position='last'))

px.bar(counts,
       x='share',
       y='endpoint',
       color='cache_layer',
       orientation='h',
       category_orders={'endpoint': list(endpoint_eff.index),
                        'cache_layer': LAYER_ORDER},
       hover_data=['n'],
       labels={'share': 'share of calls',
               'endpoint': 'API endpoint',
               'cache_layer': 'cache layer'},
       title='Cache breakdown by upstream endpoint (worst to best)',
       height=600).update_xaxes(tickformat='.0%').show()

# %% [markdown]
# ## 6. Anatomy of a slow request
#
# Pick the slowest request and render each upstream call as a horizontal bar.
#
# Change `PICK` to look at a specific record.

# %%
PICK = df[df.request_type == 'forecast/point'].sort_values('k6_timing', ascending=False).iloc[0]

batches = PICK.get('batches') or []
bars, t0 = [], 0.0
for bi, b in enumerate(batches):
    batch_max = 0.0
    for c in b['batch']:
        bars.append({'label': f"b{bi} {c['url']}",
                     'start': t0, 'dur': c['timing'],
                     'cache_layer': cache_layer(c),
                     'batch': f'batch {bi}'})
        batch_max = max(batch_max, c['timing'])
    t0 += batch_max
wf = pd.DataFrame(bars)

fig = go.Figure()
for layer in LAYER_ORDER:
    sub = wf[wf.cache_layer == layer]
    if sub.empty:
        continue
    fig.add_trace(go.Bar(
        y=sub['label'],
        x=sub['dur'],
        base=sub['start'],
        orientation='h',
        name=layer,
        customdata=sub[['batch']].values,
        hovertemplate=('%{y}<br>start=%{base:.0f}ms<br>dur=%{x:.0f}ms'
                       '<br>%{customdata[0]}<extra>' + layer + '</extra>'),
    ))

url = PICK['url']
k6 = PICK['k6_timing']
django = PICK['django_timing']
fig.update_layout(
    title=f"Waterfall — {url} (k6={k6:.0f}ms, django={django:.0f}ms)",
    xaxis_title='ms from request start',
    height=max(350, 30 * len(wf)),
    yaxis=dict(autorange='reversed',
               categoryorder='array',
               categoryarray=wf['label'].tolist()),
    barmode='overlay')
fig.show()

# %% [markdown]
# ## 7. Slow upstream API calls
#
# Print the beta url, api endpoint, and correlation id of these requests that took longer than a specific time.

# %%
SLOW_THRESHOLD_MS = 1_000

slow = []
for _, r in df.iterrows():
    timings = r.get('timings')
    if not isinstance(timings, list):
        continue
    for t in timings:
        if t['timing'] > SLOW_THRESHOLD_MS:
            slow.append({
                'when': r['t_sec'],
                'beta': r['url'],
                'api': t['url'],
                'timing_ms': round(t['timing']),
                'correlationId': t.get('correlationId', ''),
            })

if slow:
    slow_df = pd.DataFrame(slow).sort_values('timing_ms', ascending=False).reset_index(drop=True)
    print(f'{len(slow_df)} upstream calls exceeded {SLOW_THRESHOLD_MS / 1000:.0f}s')
    display(slow_df)
else:
    print(f"no results that took longer than {SLOW_THRESHOLD_MS} ms")

# %%
