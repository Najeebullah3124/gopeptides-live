import pandas as pd
import sys

path = sys.argv[1]
pages = pd.read_excel(path)
# Semrush pages export: row0 is header names in columns incorrectly; use first row as header
if str(pages.iloc[0, 0]).startswith('http'):
    pages.columns = ['url', 'title', 'title_len', 'crawl_depth', 'rel_depth', 'outlinks', 'http', 'load', 'size',
                     'redirects', 'hreflang_issues', 'desc', 'desc_len', 'h1', 'h1_len', 'h2_count', 'text_ratio',
                     'load_time', 'issues', 'blocked', 'c21', 'c22', 'c23', 'c24', 'c25', 'c26'][:len(pages.columns)]

dups = pages.groupby('desc').size().sort_values(ascending=False)
dups = dups[dups > 1]
print(f'dup meta desc groups: {len(dups)}')
for desc, n in dups.head(8).items():
    print(f'\n{n}x | {str(desc)[:100]}')
    for u in pages[pages['desc'] == desc]['url'].head(5):
        print(' ', u)

title_dups = pages.groupby('title').size().sort_values(ascending=False)
title_dups = title_dups[title_dups > 1]
print(f'\ndup title groups: {len(title_dups)}')
