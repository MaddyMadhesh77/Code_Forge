-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('PENDING', 'RECORDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AntiCheatEventType" AS ENUM ('TAB_SWITCH', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'WINDOW_BLUR', 'EXTERNAL_TOOL_DETECTED');

-- AlterTable
ALTER TABLE "interview_sessions" ADD COLUMN     "level" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "template_id" TEXT;

-- AlterTable
ALTER TABLE "scorecards" ADD COLUMN     "candidate_id" TEXT;

-- CreateTable
CREATE TABLE "interview_recordings" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "status" "RecordingStatus" NOT NULL DEFAULT 'RECORDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stopped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recording_events" (
    "id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recording_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_snapshots" (
    "id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recording_artifacts" (
    "id" TEXT NOT NULL,
    "recording_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "duration_ms" INTEGER,
    "source" TEXT,
    "storage_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recording_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anti_cheat_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "event_type" "AntiCheatEventType" NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "details" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anti_cheat_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_links" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" "ParticipantRole" NOT NULL DEFAULT 'CANDIDATE',
    "created_by_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "max_uses" INTEGER NOT NULL DEFAULT 1,
    "use_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "level" TEXT,
    "problem_ids" TEXT[],
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rubric_notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_private" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interview_recordings_session_id_key" ON "interview_recordings"("session_id");

-- CreateIndex
CREATE INDEX "recording_events_recording_id_timestamp_idx" ON "recording_events"("recording_id", "timestamp");

-- CreateIndex
CREATE INDEX "code_snapshots_recording_id_timestamp_idx" ON "code_snapshots"("recording_id", "timestamp");

-- CreateIndex
CREATE INDEX "recording_artifacts_recording_id_created_at_idx" ON "recording_artifacts"("recording_id", "created_at");

-- CreateIndex
CREATE INDEX "anti_cheat_events_session_id_timestamp_idx" ON "anti_cheat_events"("session_id", "timestamp");

-- CreateIndex
CREATE INDEX "anti_cheat_events_session_id_participant_id_idx" ON "anti_cheat_events"("session_id", "participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_links_token_hash_key" ON "session_links"("token_hash");

-- CreateIndex
CREATE INDEX "session_links_session_id_idx" ON "session_links"("session_id");

-- CreateIndex
CREATE INDEX "session_links_expires_at_idx" ON "session_links"("expires_at");

-- CreateIndex
CREATE INDEX "interview_templates_role_idx" ON "interview_templates"("role");

-- CreateIndex
CREATE INDEX "interview_templates_created_by_id_idx" ON "interview_templates"("created_by_id");

-- CreateIndex
CREATE INDEX "scorecards_candidate_id_idx" ON "scorecards"("candidate_id");

-- AddForeignKey
ALTER TABLE "interview_recordings" ADD CONSTRAINT "interview_recordings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_events" ADD CONSTRAINT "recording_events_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "interview_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_snapshots" ADD CONSTRAINT "code_snapshots_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "interview_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recording_artifacts" ADD CONSTRAINT "recording_artifacts_recording_id_fkey" FOREIGN KEY ("recording_id") REFERENCES "interview_recordings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anti_cheat_events" ADD CONSTRAINT "anti_cheat_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_links" ADD CONSTRAINT "session_links_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

