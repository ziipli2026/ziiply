from pathlib import Path
p=Path("src/app/page.tsx")
s=p.read_text()
old='const timeout = window.setTimeout(() => controller.abort(), 16000);'
new='const timeout = window.setTimeout(() => controller.abort(), 39000);'
assert s.count(old)==1, f"Expected one mobile limit timeout, got {s.count(old)}"
s=s.replace(old,new,1)
p.write_text(s)
print("Mobile limit lookup timeout extended for three provider fallbacks")
