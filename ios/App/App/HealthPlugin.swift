import Capacitor
import Foundation
import HealthKit

/// JS bridge to Apple Health. ForgeTrack only *writes* workouts — it never
/// reads health data. See src/lib/native.ts (`saveWorkoutToHealth`).
@objc(HealthPlugin)
public class HealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPlugin"
    public let jsName = "Health"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()
    private let workoutType = HKObjectType.workoutType()

    private func statusString() -> String {
        guard HKHealthStore.isHealthDataAvailable() else { return "unavailable" }
        switch store.authorizationStatus(for: workoutType) {
        case .sharingAuthorized: return "authorized"
        case .sharingDenied: return "denied"
        default: return "notDetermined"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["status": statusString()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["status": "unavailable"])
            return
        }
        store.requestAuthorization(toShare: [workoutType], read: nil) { _, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["status": self.statusString()])
        }
    }

    /// saveWorkout({ id, name, start, end, volumeKg, sets }) — times in epoch ms.
    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard statusString() == "authorized" else {
            call.reject("Not authorized to write workouts")
            return
        }
        guard let startMs = call.getDouble("start"), let endMs = call.getDouble("end"), endMs > startMs else {
            call.reject("start and end are required")
            return
        }
        let start = Date(timeIntervalSince1970: startMs / 1000)
        let end = Date(timeIntervalSince1970: endMs / 1000)

        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        config.locationType = .indoor
        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())

        var metadata: [String: Any] = [HKMetadataKeyIndoorWorkout: true]
        if let id = call.getString("id") { metadata[HKMetadataKeyExternalUUID] = id }
        if let name = call.getString("name"), !name.isEmpty { metadata[HKMetadataKeyWorkoutBrandName] = name }
        if let volume = call.getDouble("volumeKg") { metadata["ForgeTrackVolumeKg"] = volume }
        if let sets = call.getInt("sets") { metadata["ForgeTrackSets"] = sets }

        builder.beginCollection(withStart: start) { ok, error in
            guard ok else {
                call.reject(error?.localizedDescription ?? "Could not start workout")
                return
            }
            builder.addMetadata(metadata) { _, _ in
                builder.endCollection(withEnd: end) { ok, error in
                    guard ok else {
                        call.reject(error?.localizedDescription ?? "Could not end workout")
                        return
                    }
                    builder.finishWorkout { workout, error in
                        if let error = error {
                            call.reject(error.localizedDescription)
                        } else {
                            call.resolve(["saved": workout != nil])
                        }
                    }
                }
            }
        }
    }
}
