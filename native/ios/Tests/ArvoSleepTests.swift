import XCTest
@testable import ZiiplyArvoTest

final class ArvoSleepTests: XCTestCase {
    let start = Date(timeIntervalSince1970: 0)
    func sample(_ a: Double, _ b: Double, _ stage: String, _ source: String = "watch") -> ArvoSleepInterval {
        ArvoSleepInterval(start: start.addingTimeInterval(a), end: start.addingTimeInterval(b), source: source, stage: stage)
    }
    func testDuplicatesDoNotDoubleSleep() {
        let samples = [sample(0, 3600, "core"), sample(0, 3600, "core", "phone")]
        XCTAssertEqual(ArvoSleepNormalizer.totals(samples, start: start, end: start.addingTimeInterval(3600))["sleepMinutes"], 60)
    }
    func testGenericSleepDoesNotInventStages() {
        let result = ArvoSleepNormalizer.totals([sample(0, 3600, "unspecified")], start: start, end: start.addingTimeInterval(3600))
        XCTAssertEqual(result["sleepMinutes"], 60)
        XCTAssertNil(result["remMinutes"])
    }
    func testClippingAndDetailedStages() {
        let samples = [sample(-3600, 3600, "unspecified"), sample(0, 1800, "deep"), sample(1800, 3600, "awake")]
        let result = ArvoSleepNormalizer.totals(samples, start: start, end: start.addingTimeInterval(3600))
        XCTAssertEqual(result["sleepMinutes"], 30)
        XCTAssertEqual(result["deepMinutes"], 30)
        XCTAssertEqual(result["awakeMinutes"], 30)
    }
    func testMissingSleepIsNotZero() {
        XCTAssertTrue(ArvoSleepNormalizer.totals([], start: start, end: start.addingTimeInterval(3600)).isEmpty)
    }
}
