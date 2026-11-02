from pathlib import Path
import re

p = Path("src/app/page.tsx")
s = p.read_text()
start = s.find("  const queryLimit = (position: GeolocationPosition) => {")
end = s.find("  const reset = () => {", start)
assert start >= 0 and end > start, "GPS speed-limit effect anchors not found"
old = s[start:end]
assert "overpass.kumi.systems" in old, "Unexpected speed-limit implementation; refusing blind replacement"
new = '''  const queryLimit = (position: GeolocationPosition) => {
    const now = Date.now();
    const { latitude, longitude, accuracy, heading } = position.coords;
    if (accuracy > 60 || now - lastLimitQueryAt < 12000) return;
    lastLimitQueryAt = now;
    const generation = ++limitGeneration;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 16000);
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      accuracy: String(accuracy),
    });
    if (heading !== null && Number.isFinite(heading)) params.set("heading", String(heading));
    void fetch("/api/mobile-speed-limit?" + params.toString(), {
      signal: controller.signal,
      cache: "no-store",
    }).then(async response => {
      if (!response.ok) throw new Error("speed limit unavailable");
      return response.json() as Promise<{ limit: number | null }>;
    }).then(data => {
      if (!active || generation !== limitGeneration) return;
      const limit = typeof data.limit === "number" && Number.isFinite(data.limit) ? data.limit : null;
      setMobileSpeedLimit(limit);
    }).catch(() => {
      if (active && generation === limitGeneration) setMobileSpeedLimit(null);
    }).finally(() => window.clearTimeout(timeout));
  };
'''
s = s[:start] + new + s[end:]
old_color = 'mobileSpeedLimit === null ? "#173b31" : mobileDrivingSpeed > mobileSpeedLimit + 2 ? "#cf202a" : "#138441"'
assert old_color in s, "Color expression changed; refusing blind replacement"
s = s.replace(old_color, 'mobileSpeedLimit === null ? "#173b31" : mobileDrivingSpeed > mobileSpeedLimit + 2 ? "#cf202a" : "#138441"', 1)
p.write_text(s)
print("Patched mobile speed-limit fetch to same-origin API")
