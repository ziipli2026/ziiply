import XCTest
@testable import ZiiplyArvoTest

@MainActor private final class HealthReaderStub: ArvoHealthReading {
    var approved = Set<String>()
    var reads = 0
    var revoked = false
    var accessError: Error?
    var readStarted: (() -> Void)?
    var readContinuation: CheckedContinuation<[String: Any], Error>?
    func requestAccess(approved: Set<String>) async throws {
        if let accessError { throw accessError }
        self.approved = approved
    }
    func readDay(_ date: Date) async throws -> [String: Any] {
        reads += 1
        return try await withCheckedThrowingContinuation { continuation in
            readContinuation = continuation
            readStarted?()
        }
    }
    func revokeLocalConsent() { revoked = true; approved = [] }
}

final class ArvoConsentTests: XCTestCase {
    @MainActor func testRefreshWithoutConsentNeverReads() {
        let reader = HealthReaderStub()
        let model = ArvoHealthModel(reader: reader, recordConsent: { _ in })
        model.refresh(days: 30)
        XCTAssertEqual(reader.reads, 0)
        XCTAssertFalse(model.busy)
    }

    @MainActor func testAuditFailurePreventsAccess() {
        let reader = HealthReaderStub()
        let model = ArvoHealthModel(reader: reader, recordConsent: { _ in
            throw NSError(domain: "AuditTest", code: 1)
        })
        model.connect(categories: ["steps"], days: 1)
        XCTAssertNil(model.consent)
        XCTAssertTrue(reader.approved.isEmpty)
        XCTAssertEqual(reader.reads, 0)
    }

    @MainActor func testRevocationDiscardsPendingReadingAndStopsFollowingDays() async {
        let reader = HealthReaderStub()
        let started = expectation(description: "Read started")
        reader.readStarted = { started.fulfill() }
        var actions: [String] = []
        let model = ArvoHealthModel(reader: reader, recordConsent: { actions.append($0.action) })
        model.connect(categories: ["steps"], days: 30)
        await fulfillment(of: [started], timeout: 2)
        XCTAssertEqual(reader.approved, ["steps"])
        model.revoke()
        reader.readContinuation?.resume(returning: ["steps": 999])
        // Let the suspended model task finish after a late native callback.
        await Task.yield()
        await Task.yield()
        XCTAssertTrue(reader.revoked)
        XCTAssertEqual(reader.reads, 1)
        XCTAssertTrue(model.days.isEmpty)
        XCTAssertNil(model.consent)
        XCTAssertNil(model.updatedAt)
        XCTAssertFalse(model.busy)
        XCTAssertEqual(actions, ["grant", "revoke"])
    }
}
