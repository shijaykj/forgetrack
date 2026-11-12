import ActivityKit
import SwiftUI
import WidgetKit

private let ember = Color(red: 1, green: 0.357, blue: 0.122)
private let steel = Color(red: 0.384, green: 0.776, blue: 1)

private func clock(_ sec: Double) -> String {
    let s = max(0, Int(sec.rounded()))
    return String(format: "%d:%02d", s / 60, s % 60)
}

private func isResting(_ context: ActivityViewContext<WorkoutActivityAttributes>) -> Bool {
    if context.state.pausedRemainingSec != nil { return true }
    guard let end = context.state.restEndsAt else { return false }
    return !context.isStale && end > Date()
}

/// Rest countdown (or paused remainder) while resting; otherwise the elapsed
/// workout clock. Shared by the Dynamic Island layouts.
private struct ClockText: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>
    var body: some View {
        if let paused = context.state.pausedRemainingSec {
            Text(clock(paused))
        } else if isResting(context), let end = context.state.restEndsAt {
            Text(timerInterval: Date()...end, countsDown: true)
        } else {
            Text(context.attributes.startedAt, style: .timer)
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var resting: Bool { isResting(context) }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "flame.fill").foregroundStyle(ember)
                Text(context.attributes.workoutName).font(.headline).lineLimit(1)
                Spacer()
                Text(context.attributes.startedAt, style: .timer)
                    .font(.subheadline.monospacedDigit())
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 80, alignment: .trailing)
            }
            if resting {
                HStack(alignment: .firstTextBaseline) {
                    Text(context.state.pausedRemainingSec != nil ? "REST · PAUSED" : "REST")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(ember)
                    Spacer()
                    ClockText(context: context)
                        .font(.system(size: 34, weight: .heavy).monospacedDigit())
                        .multilineTextAlignment(.trailing)
                }
                if let end = context.state.restEndsAt, context.state.pausedRemainingSec == nil {
                    let start = end.addingTimeInterval(-max(1, context.state.restTotalSec))
                    ProgressView(timerInterval: start...end, countsDown: true) { EmptyView() } currentValueLabel: { EmptyView() }
                        .tint(ember)
                }
            } else {
                HStack {
                    Text(context.state.currentExercise.isEmpty ? "Ready for the next set" : context.state.currentExercise)
                        .font(.title3.weight(.semibold))
                        .lineLimit(1)
                    Spacer()
                }
            }
            HStack {
                Text("\(context.state.setsDone)/\(context.state.setsTotal) sets")
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
                Spacer()
                if resting, !context.state.currentExercise.isEmpty {
                    Text("Next: \(context.state.currentExercise)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(16)
    }
}

struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            LockScreenView(context: context)
                .activityBackgroundTint(Color(red: 0.03, green: 0.035, blue: 0.045).opacity(0.92))
                .activitySystemActionForegroundColor(ember)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text("\(context.state.setsDone)/\(context.state.setsTotal)").monospacedDigit()
                    } icon: {
                        Image(systemName: "flame.fill").foregroundStyle(ember)
                    }
                    .font(.headline)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ClockText(context: context)
                        .font(.title2.weight(.heavy).monospacedDigit())
                        .foregroundStyle(isResting(context) ? ember : .white)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 90, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.state.currentExercise.isEmpty ? context.attributes.workoutName : context.state.currentExercise)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                        Spacer()
                        Text(context.attributes.startedAt, style: .timer)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: 70, alignment: .trailing)
                    }
                }
            } compactLeading: {
                Image(systemName: "flame.fill").foregroundStyle(ember)
            } compactTrailing: {
                ClockText(context: context)
                    .monospacedDigit()
                    .foregroundStyle(isResting(context) ? ember : steel)
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "flame.fill").foregroundStyle(ember)
            }
            .keylineTint(ember)
        }
    }
}
