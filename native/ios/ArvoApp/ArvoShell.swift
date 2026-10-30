import SwiftUI
import WebKit

/// Web content can only request opening the native health screen. It never
/// receives readings, consent metadata, permission state or callback messages.
enum ArvoNavigationPolicy {
    static let webOrigin = URL(string: "https://ziiply.vercel.app")!
    static func isZiiply(_ url: URL) -> Bool {
        url.scheme == "https" && url.host == "ziiply.vercel.app" && (url.port == nil || url.port == 443) && url.user == nil && url.password == nil
    }
    static func opensHealth(destination: URL, source: URL?, mainFrame: Bool, userLink: Bool) -> Bool {
        guard mainFrame, userLink, let source, isZiiply(source), isZiiply(destination) else { return false }
        return destination.path == "/arvo-terveystiedot" && destination.query == nil
    }
}

struct ArvoShell: View {
    @State private var selection = 0
    var body: some View {
        TabView(selection: $selection) {
            ArvoWebStatistics(openHealth: { selection = 1 })
                .tabItem { Label("Ravintotilastot", systemImage: "chart.bar") }.tag(0)
            ContentView(isVisible: selection == 1)
                .tabItem { Label("Terveys", systemImage: "heart") }.tag(1)
        }
    }
}

private struct ArvoWebStatistics: UIViewRepresentable {
    let openHealth: () -> Void
    func makeCoordinator() -> Coordinator { Coordinator(openHealth: openHealth) }
    func makeUIView(context: Context) -> WKWebView {
        let web = WKWebView(frame: .zero)
        web.navigationDelegate = context.coordinator
        web.uiDelegate = context.coordinator
        web.allowsBackForwardNavigationGestures = true
        web.load(URLRequest(url: ArvoNavigationPolicy.webOrigin.appendingPathComponent("arvo-tilastot")))
        return web
    }
    func updateUIView(_ web: WKWebView, context: Context) {}
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        let openHealth: () -> Void
        init(openHealth: @escaping () -> Void) { self.openHealth = openHealth }
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { decisionHandler(.cancel); return }
            let source = action.sourceFrame.request.url
            let origin = action.sourceFrame.securityOrigin
            let trustedOrigin = origin.protocol == "https" && origin.host == "ziiply.vercel.app" && (origin.port == 0 || origin.port == 443)
            if trustedOrigin && ArvoNavigationPolicy.opensHealth(destination: url, source: source,
                mainFrame: action.sourceFrame.isMainFrame, userLink: action.navigationType == .linkActivated) {
                decisionHandler(.cancel); openHealth(); return
            }
            guard ArvoNavigationPolicy.isZiiply(url) else {
                decisionHandler(.cancel)
                if action.navigationType == .linkActivated, action.sourceFrame.isMainFrame,
                   url.scheme == "https" || url.scheme == "mailto" { UIApplication.shared.open(url) }
                return
            }
            decisionHandler(.allow)
        }
        // The existing meal-delete confirmation uses window.confirm().
        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            guard let source = frame.request.url, ArvoNavigationPolicy.isZiiply(source), frame.isMainFrame,
                  let controller = webView.window?.rootViewController else { completionHandler(false); return }
            var presenter = controller
            while let presented = presenter.presentedViewController { presenter = presented }
            let alert = UIAlertController(title: "Arvo", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Peruuta", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "Poista", style: .destructive) { _ in completionHandler(true) })
            presenter.present(alert, animated: true)
        }
    }
}
