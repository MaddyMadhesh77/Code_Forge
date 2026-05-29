import { IsUUID, IsString, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { InterviewRole } from '@codeforge/shared';

const SCORECARD_CRITERIA_VALUES = [
  'PROBLEM_SOLVING',
  'COMMUNICATION',
  'DEBUGGING',
  'CODE_QUALITY',
  'TIME_MANAGEMENT',
  'TESTING_APPROACH',
] as const;

type ScorecardCriteriaValue = typeof SCORECARD_CRITERIA_VALUES[number];

export class CreateInterviewDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsUUID()
  problemId?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class CreateSessionLinkDto {
  @IsEnum(['INTERVIEWER', 'CANDIDATE', 'OBSERVER'])
  role: InterviewRole;

  @IsOptional()
  @IsNumber()
  expiresIn?: number;
}

export class JoinInterviewDto {
  @IsString()
  token: string;
}

export class CreateScorecardDto {
  @IsEnum(SCORECARD_CRITERIA_VALUES, { each: true })
  criteria: ScorecardCriteriaValue[];

  @IsNumber()
  @Min(1)
  @Max(5)
  problemSolving: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  communication: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  debugging: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  codeQuality: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  timeManagement: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  testingApproach: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating?: number;
}

export class ExportInterviewDto {
  @IsEnum(['PDF', 'JSON'])
  format: 'PDF' | 'JSON';

  @IsOptional()
  includeRecording?: boolean;
}

export class UpdateInterviewStatusDto {
  @IsEnum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export class AnalyzeComplexityDto {
  @IsString()
  code: string;
}

export class ReviewCodeDto {
  @IsString()
  code: string;

  @IsString()
  language: string;
}

export class SendInviteEmailDto {
  @IsString()
  to: string;

  @IsString()
  candidateName: string;

  @IsString()
  interviewerName: string;

  @IsString()
  sessionTitle: string;

  @IsString()
  interviewLink: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;
}

export class SendReportEmailDto {
  @IsString()
  to: string;

  @IsString()
  sessionTitle: string;

  @IsString()
  reportUrl: string;
}

export class UploadRecordingArtifactDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  @Min(1)
  sizeBytes: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMs?: number;

  @IsOptional()
  @IsString()
  source?: 'webcam' | 'screen';

  @IsOptional()
  @IsString()
  storageUrl?: string;
}

