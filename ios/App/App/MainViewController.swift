import Capacitor
import UIKit

/// Root view controller (set in Main.storyboard). Registers the app's own
/// Capacitor plugins, which live in this target rather than in npm packages.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WorkoutActivityPlugin())
        bridge?.registerPluginInstance(HealthPlugin())
    }
}
