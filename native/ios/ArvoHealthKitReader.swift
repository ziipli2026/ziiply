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
        return output
    }
}
