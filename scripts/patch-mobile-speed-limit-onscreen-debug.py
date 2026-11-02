from pathlib import Path
p=Path("src/app/page.tsx")
s=p.read_text()
needle='const timeout = window.setTimeout(() => controller.abort(), 39000);'
assert s.count(needle)==1, "speed limit lookup anchor missing"
s=s.replace(needle,'''const debugLine = (message: string) => {
      const target = document.getElementById("mobile-speed-limit-debug");
      if (target) target.textContent = new Date().toLocaleTimeString("fi-FI") + " " + message;
    };
    debugLine("GPS ±" + Math.round(accuracy) + " m | haku alkaa");
    const timeout = window.setTimeout(() => { debugLine("AIKAKATKAISU 39 s"); controller.abort(); }, 39000);''',1)
needle='if (accuracy > 100 || now - lastLimitQueryAt < 12000) return;'
assert s.count(needle)==1
s=s.replace(needle,'''if (accuracy > 100 || now - lastLimitQueryAt < 12000) {
      const target = document.getElementById("mobile-speed-limit-debug");
      if (target && accuracy > 100) target.textContent = "GPS liian epätarkka ±" + Math.round(accuracy) + " m";
      return;
    }''',1)
needle='if (!response.ok) throw new Error("speed limit unavailable");'
assert s.count(needle)==1
s=s.replace(needle,'''if (!response.ok) {
        debugLine("HTTP " + response.status + " | palvelinhaku epäonnistui");
        throw new Error("speed limit unavailable");
      }''',1)
needle='return response.json() as Promise<{ limit: number | null }>;'
assert s.count(needle)==1
s=s.replace(needle,'return response.json() as Promise<{ limit: number | null; reason?: string }>;',1)
needle='setMobileSpeedLimit(limit);'
assert s.count(needle)>=1
# Replace only in the speed-limit request response block
anchor='const limit = typeof data.limit === "number" && Number.isFinite(data.limit) ? data.limit : null;'
assert s.count(anchor)==1
s=s.replace(anchor,anchor+'\n      debugLine(limit === null ? "EI RAJOITUSTA | " + (data.reason ?? "tuntematon") : "RAJOITUS " + limit + " km/h | " + (data.reason ?? "matched"));',1)
needle='''}).catch(() => {
      if (active && generation === limitGeneration) setMobileSpeedLimit(null);'''
assert s.count(needle)==1
s=s.replace(needle,''' }).catch((error: unknown) => {
      debugLine("HAKUVIRHE " + (error instanceof Error ? error.name + ": " + error.message : String(error)));
      if (active && generation === limitGeneration) setMobileSpeedLimit(null);''',1)
# Fixed bottom-right diagnostics panel, mobile only; no GPS coordinates displayed.
anchor='function KauppiasMobileTopBar({'
assert s.count(anchor)==1
# Put panel inside mobile top bar by locating its first return (search bounded)
start=s.index(anchor)
end=s.index('\nfunction ',start+len(anchor))
chunk=s[start:end]
idx=chunk.find('return (')
assert idx!=-1, "mobile top bar render anchor missing"
# Rather than alter JSX return hierarchy, insert the panel in its first returned JSX fragment/element by finding first closing tag opening.
# Use React fragment wrapping only if top-level return is simple, so instead attach panel to existing speed display near Rajoitus.
needle='Rajoitus'
pos=s.find(needle,start,end)
assert pos!=-1,"speed display label missing"
# insert debug panel via nearby JSX by inspecting known markup in separate workflow step if needed
p.write_text(s)
print("Debug instrumentation inserted; visible panel will be added by dedicated JSX patch")
