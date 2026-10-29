package fi.ziiply.arvo.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.HeartRateVariabilityRmssdRecord
import androidx.health.connect.client.records.RestingHeartRateRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.LocalDate
import java.time.ZoneId
import java.time.Instant

/**
 * Local-only Android Health Connect reader.
 * The host must show a versioned privacy notice, record explicit in-app consent,
 * and request the returned OS permissions before calling readDay.
 * Does not send data over the network or persist it.
 */
class ArvoHealthConnectReader(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)
    private val supported = setOf("steps", "active_energy", "resting_heart_rate", "hrv", "sleep_stages")
    private var approvedCategories: Set<String> = emptySet()

    fun requestedPermissions(categories: Set<String>): Set<String> {
        require(categories.isNotEmpty() && categories.all { it in supported })
        return buildSet {
            if ("steps" in categories) add(HealthPermission.getReadPermission(StepsRecord::class))
            if ("active_energy" in categories) add(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class))
            if ("resting_heart_rate" in categories) add(HealthPermission.getReadPermission(RestingHeartRateRecord::class))
            if ("hrv" in categories) add(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class))
            if ("sleep_stages" in categories) add(HealthPermission.getReadPermission(SleepSessionRecord::class))
        }
    }

    fun setLocalConsent(categories: Set<String>) {
        require(categories.isNotEmpty() && categories.all { it in supported })
        approvedCategories = categories.toSet()
    }
    fun revokeLocalConsent() { approvedCategories = emptySet() }

    /** Returns only the permissions needed for the currently approved categories. */
    fun approvedPermissions(): Set<String> = if (approvedCategories.isEmpty()) emptySet() else requestedPermissions(approvedCategories)

    /** Revoke immediately when Android permissions are withdrawn. */
    suspend fun reconcileSystemPermissions(): Set<String> {
        val granted = client.permissionController.getGrantedPermissions()
        val retained = approvedCategories.filter { category ->
            requestedPermissions(setOf(category)).all { it in granted }
        }.toSet()
        approvedCategories = retained
        return retained
    }

    private suspend inline fun <reified T : androidx.health.connect.client.records.Record> readAll(
        start: Instant, end: Instant
    ): List<T> {
        val records = mutableListOf<T>()
        var token: String? = null
        do {
            val page = client.readRecords(ReadRecordsRequest(
                recordType = T::class,
                timeRangeFilter = TimeRangeFilter.between(start, end),
                pageToken = token
            ))
            records.addAll(page.records)
            token = page.pageToken
        } while (token != null)
        return records
    }

    suspend fun readDay(date: LocalDate, zone: ZoneId = ZoneId.systemDefault()): Map<String, Any> {
        check(approvedCategories.isNotEmpty()) { "Explicit in-app health consent required" }
        check(reconcileSystemPermissions().isNotEmpty()) { "Health Connect permission required" }
        val granted = client.permissionController.getGrantedPermissions()
        val start = date.atStartOfDay(zone).toInstant()
        val end = date.plusDays(1).atStartOfDay(zone).toInstant()
        val output = mutableMapOf<String, Any>(
            "provider" to "health_connect",
            "localDate" to date.toString(),
            "timezone" to zone.id
        )
        val aggregateMetrics = buildSet {
            if ("steps" in approvedCategories && HealthPermission.getReadPermission(StepsRecord::class) in granted)
                add(StepsRecord.COUNT_TOTAL)
            if ("active_energy" in approvedCategories && HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class) in granted)
                add(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)
        }
        if (aggregateMetrics.isNotEmpty()) {
            val totals = client.aggregate(AggregateRequest(aggregateMetrics, TimeRangeFilter.between(start, end)))
            if (StepsRecord.COUNT_TOTAL in aggregateMetrics) totals[StepsRecord.COUNT_TOTAL]?.let { output["steps"] = it.toInt() }
            if (ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL in aggregateMetrics)
                totals[ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL]?.let { output["activeEnergyKcal"] = it.inKilocalories }
        }
        if ("resting_heart_rate" in approvedCategories && HealthPermission.getReadPermission(RestingHeartRateRecord::class) in granted) {
            val samples = readAll<RestingHeartRateRecord>(start, end)
            if (samples.isNotEmpty()) output["restingHeartRateBpm"] = samples.map { it.beatsPerMinute.toDouble() }.average()
        }
        if ("hrv" in approvedCategories && HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class) in granted) {
            val samples = readAll<HeartRateVariabilityRmssdRecord>(start, end)
            // Health Connect RMSSD and Apple Health SDNN are different HRV metrics.
            // Do not mislabel RMSSD as SDNN or combine them into one chart.
            if (samples.isNotEmpty()) output["hrvRmssdMs"] = samples.map { it.heartRateVariabilityMillis }.average()
        }
        if ("sleep_stages" in approvedCategories && HealthPermission.getReadPermission(SleepSessionRecord::class) in granted) {
            val sessions = readAll<SleepSessionRecord>(start, end)
            if (sessions.isNotEmpty()) {
                output["sleepSessionsAvailable"] = true
                val intervals = sessions.flatMap { session ->
                    session.stages.mapNotNull { stage ->
                        val label = when (stage.stage) {
                            SleepSessionRecord.STAGE_TYPE_REM -> "rem"
                            SleepSessionRecord.STAGE_TYPE_LIGHT -> "core"
                            SleepSessionRecord.STAGE_TYPE_DEEP -> "deep"
                            SleepSessionRecord.STAGE_TYPE_AWAKE,
                            SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> "awake"
                            else -> null
                        }
                        label?.let {
                            ArvoSleepStages.Interval(
                                stage.startTime.toEpochMilli(), stage.endTime.toEpochMilli(),
                                it, session.metadata.dataOrigin.packageName
                            )
                        }
                    }
                }
                if (intervals.isNotEmpty()) {
                    val totals = ArvoSleepStages.summarize(intervals, start.toEpochMilli(), end.toEpochMilli())
                    output["remMinutes"] = totals.getValue("rem")
                    output["coreMinutes"] = totals.getValue("core")
                    output["deepMinutes"] = totals.getValue("deep")
                    output["awakeMinutes"] = totals.getValue("awake")
                    output["sleepMinutes"] = totals.getValue("sleep")
                }
            }
        }
        return output
    }
}
