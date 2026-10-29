package fi.ziiply.arvo.health

/**
 * Pure local sleep stage normalization. Input times are epoch milliseconds.
 * Source preference is explicit; ties are stable. No overlapping interval is counted twice.
 */
object ArvoSleepStages {
    data class Interval(val startMs: Long, val endMs: Long, val stage: String, val source: String)
    private val valid = setOf("rem", "core", "deep", "awake")
    fun summarize(intervals: List<Interval>, startMs: Long, endMs: Long, preferredSources: List<String> = emptyList()): Map<String, Int> {
        require(endMs > startMs)
        val clipped = intervals.filter { it.stage in valid && it.endMs > it.startMs }
            .map { it.copy(startMs = maxOf(it.startMs, startMs), endMs = minOf(it.endMs, endMs)) }
            .filter { it.endMs > it.startMs }
        val boundaries = (listOf(startMs, endMs) + clipped.flatMap { listOf(it.startMs, it.endMs) }).distinct().sorted()
        val durations = mutableMapOf("rem" to 0L, "core" to 0L, "deep" to 0L, "awake" to 0L)
        for (i in 0 until boundaries.lastIndex) {
            val a = boundaries[i]; val b = boundaries[i + 1]
            val chosen = clipped.filter { it.startMs <= a && it.endMs >= b }
                .minWithOrNull(compareBy<Interval> {
                    val rank = preferredSources.indexOf(it.source)
                    if (rank < 0) Int.MAX_VALUE else rank
                }.thenBy { it.source }.thenBy { it.stage })
            if (chosen != null) durations[chosen.stage] = durations.getValue(chosen.stage) + (b - a)
        }
        // Round once per stage after merging intervals; avoid truncating every fragment.
        val result = durations.mapValues { (_, milliseconds) -> ((milliseconds + 30_000L) / 60_000L).toInt() }.toMutableMap()
        result["sleep"] = ((durations.getValue("rem") + durations.getValue("core") + durations.getValue("deep") + 30_000L) / 60_000L).toInt()
        return result
    }
}
