import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override open func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        super.webView(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler)
    }
}
