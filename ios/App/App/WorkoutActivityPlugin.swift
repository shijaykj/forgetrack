import ActivityKit
import Capacitor
import Foundation

/// JS bridge: `WorkoutActivity.sync({...})` starts or updates the live-workout
/// Live Activity; `WorkoutActivity.end()` removes it. See src/lib/native.ts.
@objc(WorkoutActivityPlugin)
public class WorkoutActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WorkoutActivityPlugin"
    public let jsName = "WorkoutActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["active": false])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["active": false])
            return
        }
        let ms = { (key: String) -> Date? in call.getDouble(key).map { Date(timeIntervalSince1970: $0 / 1000) } }
        guard let startedAt = ms("startedAt") else {
            call.reject("startedAt is required")
            return
        }
        let attributes = WorkoutActivityAttributes(workoutName: call.getString("workoutName") ?? "Workout", startedAt: startedAt)
        let restEndsAt = ms("restEndsAt")
        let state = WorkoutActivityAttributes.ContentState(
            restEndsAt: restEndsAt,
            restTotalSec: call.getDouble("restTotalSec") ?? 0,
            pausedRemainingSec: call.getDouble("pausedRemainingSec"),
            setsDone: call.getInt("setsDone") ?? 0,
            setsTotal: call.getInt("setsTotal") ?? 0,
            currentExercise: call.getString("currentExercise") ?? ""
        )
        // Marked stale once rest is over, so the widget can show "Rest done".
        let content = ActivityContent(state: state, staleDate: restEndsAt)

        Task {
            let existing = Activity<WorkoutActivityAttributes>.activities
            if let current = existing.first(where: { $0.attributes.startedAt == startedAt }) {
                await current.update(content)
            } else {
                for old in existing { await old.end(nil, dismissalPolicy: .immediate) }
                do {
                    _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
                } catch {
                    call.resolve(["active": false, "error": error.localizedDescription])
                    return
                }
            }
            call.resolve(["active": true])
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            for activity in Activity<WorkoutActivityAttributes>.activities {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}
