/**
 * Browser-only types for the interview UI.
 *
 * Everything that describes an API payload lives in `schemas/` and is derived
 * from a Zod schema with `z.infer`. Only shapes that a Zod schema cannot
 * usefully express — those referencing DOM values like `Blob` — belong here.
 *
 * This file previously restated ~15 API types as hand-written interfaces, in
 * parallel with the schemas and with a second copy in `interview.types.ts`.
 * Three definitions of `BillingSummary` cannot stay in agreement.
 */

export interface VideoRecorderConfig {
  mimeType?: string;
  maxDurationSec?: number;
  withAudio?: boolean;
}

export interface VideoRecordingResult {
  /** DOM value — deliberately not modelled in the Zod schemas. */
  blob: Blob;
  startedAt: number;
  endedAt: number;
  durationMs: number;
}

/** Client-side fields before the server assigns an id and timestamp. */
export interface RecordingArtifactInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs?: number;
  source?: 'webcam' | 'screen';
  storageUrl?: string;
}

export interface DashboardMetric {
  key: string;
  label: string;
  value: string | number;
}

export interface TrendPoint {
  date: string;
  sessions: number;
  submissions: number;
}

/**
 * The persisted artifact shape is owned by `recordingArtifactSchema`; this
 * alias keeps the familiar name pointing at the single definition.
 */
export type { RecordingArtifactSchemaType as RecordingArtifact } from './schemas/interview-feature.schema.js';
