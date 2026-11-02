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
p.write_text(s)
print("Mobile debug now displays per-provider HTTP status, errors, duration and road count")
