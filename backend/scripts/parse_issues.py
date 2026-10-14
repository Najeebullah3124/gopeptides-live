import sys
import pandas as pd

f = sys.argv[1]
df = pd.read_excel(f, header=None)
if str(df.iloc[0, 3]) == 'Failed checks':
    df = df.iloc[1:]
df.columns = ['id', 'severity', 'issue', 'failed', 'total', 'pct']
df['failed'] = pd.to_numeric(df['failed'], errors='coerce').fillna(0).astype(int)
total = int(pd.to_numeric(df['total'].iloc[0], errors='coerce') or 0)
active = df[df['failed'] > 0].sort_values('failed', ascending=False)
print(f'pages={total} active={len(active)}')
for _, r in active.iterrows():
    print(f"{int(r['failed']):4d} | {r['severity']} | {r['issue']}")
