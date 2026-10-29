import Foundation
import HealthKit

/// Local-only HealthKit reader. Call only after an explicit in-app consent flow.
@MainActor final class ArvoHealthKitReader {
    private let store = HKHealthStore()
    private func quantity(_ id: HKQuantityTypeIdentifier) -> HKQuantityType { HKObjectType.quantityType(forIdentifier: id)! }
    func requestAccess() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw NSError(domain:"ArvoHealth",code:1) }
        let types: Set<HKObjectType> = [
            quantity(.stepCount),quantity(.activeEnergyBurned),
            quantity(.restingHeartRate),quantity(.heartRateVariabilitySDNN),
            HKObjectType.categoryType(forIdentifier:.sleepAnalysis)!
        ]
        try await store.requestAuthorization(toShare: [], read: types)
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
        var totals = ["remMinutes": 0, "coreMinutes": 0, "deepMinutes": 0, "awakeMinutes": 0]
        for sample in samples {
            let clippedStart = max(sample.startDate, start)
            let clippedEnd = min(sample.endDate, end)
            let minutes = max(0, Int(clippedEnd.timeIntervalSince(clippedStart) / 60))
            switch sample.value {
            case HKCategoryValueSleepAnalysis.asleepREM.rawValue: totals["remMinutes", default: 0] += minutes
            case HKCategoryValueSleepAnalysis.asleepCore.rawValue: totals["coreMinutes", default: 0] += minutes
            case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: totals["deepMinutes", default: 0] += minutes
            case HKCategoryValueSleepAnalysis.awake.rawValue: totals["awakeMinutes", default: 0] += minutes
            default: break
            }
        }
        if samples.isEmpty { return [:] }
        totals["sleepMinutes"] = totals["remMinutes", default: 0] + totals["coreMinutes", default: 0] + totals["deepMinutes", default: 0]
        return totals
    }
    /// Does not send to network. Calendar days use the device's local timezone.
    func readDay(_ date:Date) async throws -> [String:Any] {
        let calendar=Calendar.current
        let start=calendar.startOfDay(for:date)
        let end=calendar.date(byAdding:.day,value:1,to:start)!
        let formatter=DateFormatter();formatter.calendar=calendar;formatter.dateFormat="yyyy-MM-dd"
        var output:[String:Any]=["provider":"apple_health","localDate":formatter.string(from:start),"timezone":TimeZone.current.identifier]
        if let v=try await sum(quantity(.stepCount),unit:.count(),from:start,to:end) { output["steps"]=Int(v.rounded()) }
        if let v=try await sum(quantity(.activeEnergyBurned),unit:.kilocalorie(),from:start,to:end) { output["activeEnergyKcal"]=v }
        if let v=try await average(quantity(.restingHeartRate),unit:HKUnit.count().unitDivided(by:.minute()),from:start,to:end) { output["restingHeartRateBpm"]=v }
        if let v=try await average(quantity(.heartRateVariabilitySDNN),unit:.secondUnit(with:.milli),from:start,to:end) { output["hrvSdnnMs"]=v }
        for (key, value) in try await sleep(start, end) { output[key] = value }
        return output
    }
}
