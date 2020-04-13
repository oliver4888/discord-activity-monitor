import { Config as DisharmonyConfig } from "@oliver4888/disharmony"

export default interface ActivityMonitorConfig extends DisharmonyConfig {
    cullingIntervalSec: number
}