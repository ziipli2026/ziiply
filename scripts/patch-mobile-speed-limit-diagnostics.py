from pathlib import Path
p=Path("src/app/page.tsx")
s=p.read_text()
old='if (accuracy > 60 || now - lastLimitQueryAt < 12000) return;'
new='if (accuracy > 100 || now - lastLimitQueryAt < 12000) return;'
assert s.count(old)==1, "Expected mobile speed-limit GPS guard not found"
p.write_text(s.replace(old,new,1))
print("Updated mobile speed-limit accuracy gate")
