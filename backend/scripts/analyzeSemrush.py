import os
import sys
import pandas as pd

BASE = r"C:\Users\Dr.pc\Downloads"
suffix = sys.argv[1] if len(sys.argv) > 1 else " (1)"

def path(name: str) -> str:
    return os.path.join(BASE, f"gopeptides.nl_{name}_20260701{suffix}.xlsx")

files = {
    "issues": path("issues"),
    "mega": path("mega_export"),
    "pages": path("pages"),
    "struct": path("pages_structured_data"),
    "compare": path("compare-audits"),
}

for k, f in files.items():
    print(f"{k}: exists={os.path.exists(f)} size={os.path.getsize(f) if os.path.exists(f) else 0}")

issues = pd.read_excel(files["issues"])
mega = pd.read_excel(files["mega"])
pages = pd.read_excel(files["pages"])
struct = pd.read_excel(files["struct"])

if os.path.exists(files["compare"]):
    compare = pd.read_excel(files["compare"])
    print("\n=== COMPARE AUDITS ===")
    print(compare.head(40).to_string(max_cols=8, max_colwidth=50))

print("\n=== MEGA: issue types with hits ===")
url_col = mega.columns[0]
issue_cols = [c for c in mega.columns[1:] if mega[c].sum() > 0]
print(f"Pages crawled: {len(mega)}")
for c in issue_cols:
    print(f"  {(mega[c] > 0).sum():3d} pages | {c}")

print("\n=== MISSING H1 sample URLs ===")
if "Missing h1" in mega.columns:
    miss = mega[mega["Missing h1"] > 0][url_col].head(8).tolist()
    for u in miss:
        print(" ", u)

print("\n=== HREFLANG CONFLICT sample ===")
if "Hreflang conflicts within page source code" in mega.columns:
    for u in mega[mega["Hreflang conflicts within page source code"] > 0][url_col].head(5):
        print(" ", u)

print("\n=== STRUCTURED DATA ERRORS ===")
if "Structured data that contains markup errors" in mega.columns:
    for u in mega[mega["Structured data that contains markup errors"] > 0][url_col]:
        print(" ", u)

print("\n=== DUPLICATE TITLES (groups) ===")
dups = pages.groupby("Page Title").size()
dups = dups[dups > 1].sort_values(ascending=False)
print(f"Groups: {len(dups)}")
for t, n in dups.head(8).items():
    print(f"  {n}x | {str(t)[:70]}")
