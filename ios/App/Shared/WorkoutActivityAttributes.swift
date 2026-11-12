import ActivityKit
import Foundation

/// Data model for the live-workout Live Activity (lock screen + Dynamic Island).
/// Compiled into both the app (which starts/updates it) and the widget
/// extension (which renders it), so the two must stay identical.
struct WorkoutActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// When the current rest ends; nil when not resting.
        var restEndsAt: Date?
        /// Length of the current rest, for the progress bar.
        var restTotalSec: Double
        /// Remaining rest while the timer is paused.
        var pausedRemainingSec: Double?
        var setsDone: Int
        var setsTotal: Int
        /// Exercise of the next incomplete set.
        var currentExercise: String
    }

    var workoutName: String
    var startedAt: Date
}
