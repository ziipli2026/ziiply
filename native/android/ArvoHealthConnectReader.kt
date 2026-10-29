package fi.ziiply.arvo.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ActiveCaloriesBurnedRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.aggregate.AggregationMetric
import java.time.LocalDate
import java.time.ZoneId

/**
 * Native Android Health Connect reader.
 * Host Activity must obtain explicit in-app consent and OS permissions
 * using PermissionController.createRequestPermissionResultContract().
 * No network or persistent storage operations are performed here.
 */
class ArvoHealthConnectReader(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)
    fun requestedPermissions(categories: Set<String>): Set<String> {
        require(categories.isNotEmpty() && categories.all { it in setOf("steps", "active_energy") })
        return buildSet {
            if ("steps" in categories) add(HealthPermission.getReadPermission(StepsRecord::class))
            if ("active_energy" in categories) add(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class))
        }
    }
    private var approvedCategories: Set<String> = emptySet()
    fun setLocalConsent(categories: Set<String>) {
        require(categories.isNotEmpty() && categories.all { it in setOf("steps", "active_energy") })
        approvedCategories = categories.toSet()
    }
    fun revokeLocalConsent() { approvedCategories = emptySet() }
    suspend fun readDay(date: LocalDate, zone: ZoneId = ZoneId.systemDefault()): Map<String, Any> {
        check(approvedCategories.isNotEmpty()) { "In-app health consent required" }
        val granted = client.permissionController.getGrantedPermissions()
        val start = date.atStartOfDay(zone).toInstant()
        val end = date.plusDays(1).atStartOfDay(zone).toInstant()
        val metrics = mutableSetOf<AggregationMetric<*>>()
        if ("steps" in approvedCategories && HealthPermission.getReadPermission(StepsRecord::class) in granted) metrics += StepsRecord.COUNT_TOTAL
        if ("active_energy" in approvedCategories && HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class) in granted) metrics += ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL
        val result = if (metrics.isNotEmpty()) client.aggregate(AggregateRequest(metrics, TimeRangeFilter.between(start,end))) else null
        val output = mutableMapOf<String,Any>(
            "provider" to "health_connect", "localDate" to date.toString(), "timezone" to zone.id
        )
        result?.get(StepsRecord.COUNT_TOTAL)?.let { output["steps"] = it.toInt() }
        result?.get(ActiveCaloriesBurnedRecord.ACTIVE_CALORIES_TOTAL)?.let { output["activeEnergyKcal"] = it.inKilocalories }
        // Resting HR, HRV and sleep stages require separate native record queries
        // and must not be fabricated when the device has no measurements.
        return output
    }
}
