import XCTest
@testable import ZiiplyArvoTest

final class ArvoNavigationTests: XCTestCase {
    let source = URL(string: "https://ziiply.vercel.app/arvo-tilastot")!
    let health = URL(string: "https://ziiply.vercel.app/arvo-terveystiedot")!
    func testUserLinkFromTrustedTopFrameOpensHealth() {
        XCTAssertTrue(ArvoNavigationPolicy.opensHealth(destination: health, source: source, mainFrame: true, userLink: true))
    }
    func testScriptsFramesAndExternalPagesCannotOpenHealth() {
        XCTAssertFalse(ArvoNavigationPolicy.opensHealth(destination: health, source: source, mainFrame: false, userLink: true))
        XCTAssertFalse(ArvoNavigationPolicy.opensHealth(destination: health, source: source, mainFrame: true, userLink: false))
        XCTAssertFalse(ArvoNavigationPolicy.opensHealth(destination: health, source: URL(string: "https://example.com"), mainFrame: true, userLink: true))
        XCTAssertFalse(ArvoNavigationPolicy.opensHealth(destination: health, source: nil, mainFrame: true, userLink: true))
    }
    func testOriginsAreExactAndNoPayloadIsAccepted() {
        for raw in ["http://ziiply.vercel.app", "https://ziiply.vercel.app.example.com", "https://ziiply.vercel.app:444", "https://user@ziiply.vercel.app"] {
            XCTAssertFalse(ArvoNavigationPolicy.isZiiply(URL(string: raw)!))
        }
        XCTAssertFalse(ArvoNavigationPolicy.opensHealth(destination: URL(string: health.absoluteString + "?steps=123")!, source: source, mainFrame: true, userLink: true))
    }
}
