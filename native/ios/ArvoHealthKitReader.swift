import Foundation
import HealthKit

/// Local-only HealthKit reader. Call only after an explicit in-app consent flow.
@MainActor final class ArvoHealthKitReader {
    private let store = HKHealthStore()
    private func quantity(_ id: HKQuantityTypeIdentifier) -> HKQuantityType { HKObjectType.quantityType(forIdentifier: id)! }
    private var approvedCategories = Set<String>()
    private var generation = UUID()
    func revokeLocalConsent() { approvedCategories.removeAll(); generation = UUID() }
    func requestAccess(approved: Set<String>) async throws {
        let allowed: Set<String> = ["steps", "active_energy", "resting_heart_rate", "hrv", "sleep_stages"]
        guard !approved.isEmpty && approved.isSubset(of: allowed) else { throw NSError(domain:"ArvoHealth",code:2) }
        guard HKHealthStore.isHealthDataAvailable() else { throw NSError(domain:"ArvoHealth",code:1) }
        var types = Set<HKObjectType>()
        if approved.contains("steps") { types.insert(quantity(.stepCount)) }
        if approved.contains("active_energy") { types.insert(quantity(.activeEnergyBurned)) }
        if approved.contains("resting_heart_rate") { types.insert(quantity(.restingHeartRate)) }
        if approved.contains("hrv") { types.insert(quantity(.heartRateVariabilitySDNN)) }
        if approved.contains("sleep_stages") { types.insert(HKObjectType.categoryType(forIdentifier:.sleepAnalysis)!) }
        let requestGeneration = generation
        try await store.requestAuthorization(toShare: [], read: types)
        guard requestGeneration == generation else { throw CancellationError() }
        approvedCategories = approved
    }
    private func sum(_ type: HKQuantityType, unit: HKUnit, from start:Date, to end:Date) async throws -> Double? {
        try await withCheckedThrowingContinuation { continuation in
            let query=HKStatisticsQuery(quantityType:type,quantitySamplePredicate:HKQuery.predicateForSamples(withStart:start,end:end,options:.strictStartDate),options:.cumulativeSum){_,result,error in
                if let error { continuation.resume(throwing:error);return }
                continuation.resume(returning:result?.sumQuantity()?.doubleValue(for:unit))
            }
            store.execute(query)
        }
    }
    private func average(_ type: HKQuantityType, unit: HKUnit, from start:Date, to end:Date) async throws -> Double? {
        try await withCheckedThrowingContinuation { continuation in
            let query=HKStatisticsQuery(quantityType:type,quantitySamplePredicate:HKQuery.predicateForSamples(withStart:start,end:end,options:.strictStartDate),options:.discreteAverage){_,result,error in
                if let error { continuation.resume(throwing:error);return }
                continuation.resume(returning:result?.averageQuantity()?.doubleValue(for:unit))
            }
            store.execute(query)
        }
    }
    private func sleep(_ start: Date, _ end: Date) async throws -> [String: Int] {
        let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        let samples: [HKCategorySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(sampleType: type, predicate: HKQuery.predicateForSamples(withStart: start, end: end, options: []), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, results, error in
                if let error { continuation.resume(throwing: error); return }
                continuation.resume(returning: (results as? [HKCategorySample]) ?? [])
            }
            store.execute(query)
        }
        let intervals = samples.compactMap { sample -> ArvoSleepInterval? in
            let stage: String
            switch sample.value {
            case HKCategoryValueSleepAnalysis.asleepREM.rawValue: stage = "rem"
            case HKCategoryValueSleepAnalysis.asleepCore.rawValue: stage = "core"
            case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: stage = "deep"
            case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: stage = "unspecified"
            case HKCategoryValueSleepAnalysis.awake.rawValue: stage = "awake"
            default: return nil
            }
            return ArvoSleepInterval(start: sample.startDate, end: sample.endDate,
                source: sample.sourceRevision.source.bundleIdentifier, stage: stage)
        }
        return ArvoSleepNormalizer.totals(intervals, start: start, end: end)
    }
    /// Does not send to network. Calendar days use the device's local timezone.
    func readDay(_ date:Date) async throws -> [String:Any] {
        guard !approvedCategories.isEmpty else { throw NSError(domain:"ArvoHealth",code:3) }
        let readGeneration = generation
        let calendar=Calendar.current
        let start=calendar.startOfDay(for:date)
        let end=calendar.date(byAdding:.day,value:1,to:start)!
        let formatter=DateFormatter();formatter.calendar=calendar;formatter.dateFormat="yyyy-MM-dd"
        var output:[String:Any]=["provider":"apple_health","localDate":formatter.string(from:start),"timezone":TimeZone.current.identifier]
        if approvedCategories.contains("steps"), let v=try await sum(quantity(.stepCount),unit:.count(),from:start,to:end) { output["steps"]=Int(v.rounded()) }
        if approvedCategories.contains("active_energy"), let v=try await sum(quantity(.activeEnergyBurned),unit:.kilocalorie(),from:start,to:end) { output["activeEnergyKcal"]=v }
        if approvedCategories.contains("resting_heart_rate"), let v=try await average(quantity(.restingHeartRate),unit:HKUnit.count().unitDivided(by:.minute()),from:start,to:end) { output["restingHeartRateBpm"]=v }
        if approvedCategories.contains("hrv"), let v=try await average(quantity(.heartRateVariabilitySDNN),unit:.secondUnit(with:.milli),from:start,to:end) { output["hrvSdnnMs"]=v }
        if approvedCategories.contains("sleep_stages") { for (key, value) in try await sleep(start, end) { output[key] = value } }
        guard readGeneration == generation, !approvedCategories.isEmpty else { throw CancellationError() }
        return output
    }
}
