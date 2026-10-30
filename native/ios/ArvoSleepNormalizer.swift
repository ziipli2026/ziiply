import Foundation

struct ArvoSleepInterval {
    let start: Date
    let end: Date
    let source: String
    let stage: String
}

enum ArvoSleepNormalizer {
    // One winning source/stage per interval; duplicate samples cannot inflate sleep.
    // Detailed stages take precedence over generic asleep samples.
    static func totals(_ samples: [ArvoSleepInterval], start: Date, end: Date) -> [String: Int] {
        let clean = samples.filter { $0.end > start && $0.start < end && $0.end > $0.start }
        guard !clean.isEmpty else { return [:] }
        let boundaries = Array(Set([start, end] + clean.flatMap { [max(start, $0.start), min(end, $0.end)] })).sorted()
        let rank = ["awake": 0, "rem": 1, "core": 2, "deep": 3, "unspecified": 4]
        var seconds: [String: Double] = [:]
        for (a, b) in zip(boundaries, boundaries.dropFirst()) {
            let active = clean.filter { $0.start <= a && $0.end >= b }.sorted {
                let lhs = rank[$0.stage, default: 9], rhs = rank[$1.stage, default: 9]
                return lhs == rhs ? $0.source < $1.source : lhs < rhs
            }
            if let winner = active.first { seconds[winner.stage, default: 0] += b.timeIntervalSince(a) }
        }
        var result: [String: Int] = [:]
        for stage in ["rem", "core", "deep", "awake"] {
            if seconds[stage] != nil { result[stage + "Minutes"] = Int((seconds[stage, default: 0] / 60).rounded()) }
        }
        let asleep = ["rem", "core", "deep", "unspecified"].reduce(0.0) { $0 + seconds[$1, default: 0] }
        if seconds.keys.contains(where: { $0 != "awake" }) { result["sleepMinutes"] = Int((asleep / 60).rounded()) }
        return result
    }
}
