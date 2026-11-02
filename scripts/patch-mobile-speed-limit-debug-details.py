from pathlib import Path
p=Path("src/app/page.tsx")
s=p.read_text()
anchor='if (heading !== null && Number.isFinite(heading)) params.set("heading", String(heading));'
assert s.count(anchor)==1
s=s.replace(anchor,anchor+'\n    params.set("debug", "1");',1)
old='''      if (!response.ok) {
        debugLine("HTTP " + response.status + " | palvelinhaku epäonnistui");
        throw new Error("speed limit unavailable");
      }
      return response.json() as Promise<{ limit: number | null; reason?: string }>;'''
assert s.count(old)==1, "response parser anchor missing"
new='''      const data = await response.json() as {
        limit: number | null; reason?: string;
        diagnostics?: { accuracy: number; radius: number; providers: Array<{provider:string;ms:number;status:number|null;outcome:string;candidates?:number}> };
      };
      const providerLines = data.diagnostics?.providers.map(p =>
        p.provider + " | HTTP " + (p.status ?? "—") + " | " + p.outcome + " | " + p.ms + "ms | roads " + (p.candidates ?? "—")
      ).join("\\n") ?? "Palvelimen diagnostiikka puuttuu";
      debugLine("GPS ±" + (data.diagnostics?.accuracy ?? Math.round(accuracy)) + "m | " +
        (data.reason ?? "tuntematon") + "\\n" + providerLines);
      if (!response.ok) throw new Error("HTTP " + response.status + " " + (data.reason ?? ""));
      return data;'''
s=s.replace(old,new,1)
old='''      if (target) target.textContent = new Date().toLocaleTimeString("fi-FI") + " " + message;'''
# existing debug overlay may use dynamically inserted target; inspect via search replacement
assert 'mobile-speed-limit-debug' in s
# avoid overwriting detailed diagnostic with generic catch
s=s.replace('''      debugLine("HAKUVIRHE " + (error instanceof Error ? error.name + ": " + error.message : String(error)));''','''      if (!(error instanceof Error && error.message.startsWith("HTTP "))) debugLine("VERKKOVIRHE " + (error instanceof Error ? error.name + ": " + error.message : String(error)));''',1)
# Replace intrusive single-line overlay with a collapsible, copyable event history.
old_overlay='''      const target = document.getElementById("mobile-speed-limit-debug");
      if (!target) { const el = document.createElement("div"); el.id = "mobile-speed-limit-debug"; el.style.cssText = "position:fixed;z-index:2147483647;top:35%;left:8px;right:8px;background:#111;color:#baffbd;padding:12px;border:2px solid white;border-radius:10px;font:600 14px monospace;pointer-events:none"; document.body.appendChild(el); }
      document.getElementById("mobile-speed-limit-debug")!.textContent = new Date().toLocaleTimeString("fi-FI") + " " + message;'''
assert s.count(old_overlay)==1, "original mobile debug overlay missing"
new_overlay='''      let target = document.getElementById("mobile-speed-limit-debug");
      if (!target) {
        const panel = document.createElement("details");
        panel.id = "mobile-speed-limit-debug";
        panel.style.cssText = "position:fixed;z-index:2147483647;bottom:90px;left:8px;right:8px;max-height:42vh;overflow:auto;background:#111;color:#baffbd;border:2px solid white;border-radius:10px;padding:8px;font:12px/1.4 monospace";
        const summary = document.createElement("summary");
        summary.textContent = "GPS / RAJOITUS DEBUG – avaa loki";
        panel.appendChild(summary);
        const copy = document.createElement("button");
        copy.textContent = "Kopioi loki";
        copy.type = "button";
        copy.style.cssText = "margin:8px;padding:6px;background:#fff;color:#111;border-radius:5px";
        copy.onclick = () => {
          const data = document.getElementById("mobile-speed-limit-debug-history")?.textContent ?? "";
          void navigator.clipboard.writeText(data).then(() => { copy.textContent = "Kopioitu"; }).catch(() => { copy.textContent = "Kopiointi epäonnistui"; });
        };
        panel.appendChild(copy);
        const history = document.createElement("pre");
        history.id = "mobile-speed-limit-debug-history";
        history.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;margin:4px";
        panel.appendChild(history);
        document.body.appendChild(panel);
        target = panel;
      }
      const history = document.getElementById("mobile-speed-limit-debug-history");
      if (history) {
        const lines = (history.textContent ?? "").split("\\n").filter(Boolean);
        lines.push(new Date().toLocaleTimeString("fi-FI") + " " + message);
        history.textContent = lines.slice(-80).join("\\n");
      }'''
s=s.replace(old_overlay,new_overlay,1)
# Prevent stale GPS rejection from destroying the log.
s=s.replace('if (target && accuracy > 100) target.textContent = "GPS liian epätarkka ±" + Math.round(accuracy) + " m";','if (target && accuracy > 100) { const h = document.getElementById("mobile-speed-limit-debug-history"); if (h) h.textContent += "\\nGPS liian epätarkka ±" + Math.round(accuracy) + " m"; }',1)
p.write_text(s)
print("Mobile debug now displays per-provider HTTP status, errors, duration and road count")
