package fi.ziiply.arvo.health

import org.junit.Assert.assertEquals
import org.junit.Test

class ArvoSleepStagesTest {
    @Test fun overlapsCountOnceAndPreferWatch() {
        val m = 60_000L
        val summary = ArvoSleepStages.summarize(listOf(
            ArvoSleepStages.Interval(0, 60*m, "deep", "watch"),
            ArvoSleepStages.Interval(0, 60*m, "core", "phone"),
            ArvoSleepStages.Interval(60*m, 90*m, "rem", "watch")
        ), 0, 90*m, listOf("watch","phone"))
        assertEquals(60, summary["deep"])
        assertEquals(0, summary["core"])
        assertEquals(30, summary["rem"])
        assertEquals(90, summary["sleep"])
    }

    @Test fun crossingMidnightIsClipped() {
        val m = 60_000L
        val summary = ArvoSleepStages.summarize(
            listOf(ArvoSleepStages.Interval(-30*m, 30*m, "core", "watch")),
            0, 60*m
        )
        assertEquals(30, summary["sleep"])
    }

    @Test fun noSleepDoesNotBecomeFakeZeroReading() {
        val summary = ArvoSleepStages.summarize(emptyList(), 0, 60_000)
        assertEquals(0, summary["sleep"])
    }
}
