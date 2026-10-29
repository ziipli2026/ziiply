import Foundation
import HealthKit

/// Local-only HealthKit smoke test. No network requests or persistence.
@MainActor
final class ArvoHealthKitTest: ObservableObject {
    @Published var status = "Ei vielä testattu"
    @Published var steps: Double?

    private let store = HKHealthStore()

    func readTodaySteps() async {
        guard HKHealthStore.isHealthDataAvailable() else {
            status = "Apple Health ei ole käytettävissä tällä laitteella"
            return
        }
        let stepType = HKObjectType.quantityType(forIdentifier: .stepCount)!
        do {
            try await store.requestAuthorization(toShare: [], read: [stepType])
            let calendar = Calendar.current
            let start = calendar.startOfDay(for: Date())
            let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
            let count = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Double, Error>) in
                let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
                    if let error { continuation.resume(throwing: error); return }
                    continuation.resume(returning: result?.sumQuantity()?.doubleValue(for: .count()) ?? 0)
                }
                store.execute(query)
            }
            steps = count
            status = "Luku valmis. Jos tulos on 0, tarkista Terveys-sovelluksen tietolupa."
        } catch {
            status = "Terveystietojen luku epäonnistui"
        }
    }
}
