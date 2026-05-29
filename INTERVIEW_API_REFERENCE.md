# Interview System - API Quick Reference

## Interview Management

### Create Interview
```
POST /interviews
Body: { title: string, problemId: UUID, scheduledAt?: ISO8601 }
Response: InterviewSession
```

### List User's Interviews
```
GET /interviews?limit=10&offset=0
Response: InterviewSession[]
```

### Get Interview Details
```
GET /interviews/:sessionId
Response: InterviewSession (with participants, problems, submissions)
```

### Update Interview Status
```
PUT /interviews/:sessionId/status
Body: { status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' }
Response: Updated InterviewSession
```

### End Interview
```
POST /interviews/:sessionId/end
Response: Updated InterviewSession with endedAt timestamp
```

---

## Role-Based Session Links

### Create Session Link
```
POST /interviews/:sessionId/links
Body: { 
  role: 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER',
  expiresIn?: number (seconds)
}
Response: SessionLink { token, role, expiresAt }
```

### List Session Links
```
GET /interviews/:sessionId/links
Response: SessionLink[]
```

### Revoke Session Link
```
DELETE /interviews/links/:linkId
Response: Updated SessionLink (with isRevoked = true)
```

### Join Session with Link
```
POST /interviews/join
Body: { token: string }
Response: InterviewSession
```

---

## Recording & Replay

### Get Recording
```
GET /interviews/:sessionId/recording
Response: {
  id: UUID,
  events: RecordingEvent[],
  codeSnapshots: CodeSnapshot[],
  startedAt: DateTime,
  stoppedAt: DateTime | null,
  duration: number (ms)
}
```

**Event Structure:**
```typescript
{
  type: 'code-change' | 'verdict-update' | 'cursor-position' | 
        'participant-joined' | 'participant-left',
  timestamp: number,
  ...eventSpecificData
}
```

---

## Scorecard & Evaluation

### Submit Scorecard
```
POST /interviews/:sessionId/scorecard
Body: {
  criteria: ScorecardCriteria[],
  problemSolving: 1-5,
  communication: 1-5,
  debugging: 1-5,
  codeQuality: 1-5,
  timeManagement: 1-5,
  testingApproach: 1-5,
  feedback?: string,
  overallRating?: 1-5
}
Response: InterviewScorecard
```

### Get Your Scorecard
```
GET /interviews/:sessionId/scorecard
Response: InterviewScorecard | null
```

### Get All Scorecards
```
GET /interviews/:sessionId/scorecards
Response: InterviewScorecard[]
```

### Get Scorecard Report
```
GET /interviews/:sessionId/scorecard-report
Response: {
  sessionId: UUID,
  totalInterviewers: number,
  scorecards: InterviewScorecard[],
  averageScores: { [criteria]: number },
  highestRatedCriteria: string,
  lowestRatedCriteria: string
}
```

---

## Anti-Cheat & Security

### Get Anti-Cheat Events
```
GET /interviews/:sessionId/anti-cheat/events
Response: AntiCheatEvent[] (sorted by timestamp)
```

**Event Structure:**
```typescript
{
  id: UUID,
  sessionId: UUID,
  participantId: UUID,
  eventType: 'TAB_SWITCH' | 'COPY_ATTEMPT' | 'PASTE_ATTEMPT' | 
             'WINDOW_BLUR' | 'EXTERNAL_TOOL_DETECTED',
  severity: 1-5,
  details: {},
  timestamp: DateTime
}
```

### Get Anti-Cheat Report
```
GET /interviews/:sessionId/anti-cheat/report
Response: {
  participantId: UUID,
  eventCount: number,
  severity: number,
  events: AntiCheatEvent[],
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}[]
```

---

## Export & Reporting

### Export Interview Data
```
POST /interviews/:sessionId/export
Body: { 
  format: 'PDF' | 'JSON',
  includeRecording?: boolean
}
Response: {
  sessionId: UUID,
  sessionTitle: string,
  status: string,
  duration: number,
  participants: [{userId, name, email, role, joinedAt}],
  problems: [{id, title, difficulty}],
  submissionCount: number,
  scorecards: [],
  antiCheatSummary: {},
  recordingDuration?: number,
  codeSnapshotCount?: number,
  eventCount?: number
}
```

### Create Report
```
POST /interviews/:sessionId/report
Response: InterviewReport {
  id: UUID,
  sessionId: UUID,
  shareToken: string,
  shareExpiry: DateTime (30 days from now)
}
```

### Get Report
```
GET /interviews/:sessionId/report
Response: InterviewReport
```

### Extend Share Link
```
POST /interviews/:sessionId/report/extend-share
Body: { expiresIn?: number }
Response: Updated InterviewReport
```

### Revoke Share Link
```
POST /interviews/:sessionId/report/revoke-share
Response: Updated InterviewReport (shareToken = null)
```

### Get Public Report (No Auth Required)
```
GET /interviews/public/report/:token
Response: {
  sessionId: UUID,
  generatedAt: DateTime,
  summary?: string
}
```

---

## WebSocket Events (/interviews namespace)

### Join Room
```
EMIT: join-room
Payload: { sessionId: UUID, userId: UUID, role: string }
RECEIVE: participant-joined { userId, role, timestamp }
```

### Code Changes
```
EMIT: code-change
Payload: { sessionId, code: string, language: string }
BROADCAST: code-change { code, language, timestamp }
```

### Execution Verdicts
```
EMIT: verdict-update
Payload: { sessionId, submissionId, verdict: string, testResults: any[] }
BROADCAST: verdict-update { submissionId, verdict, testResults, timestamp }
```

### Cursor Tracking
```
EMIT: cursor-position
Payload: { sessionId, userId, line: number, column: number }
BROADCAST: cursor-position { userId, line, column, timestamp }
```

### Anti-Cheat Events
```
EMIT: tab-switch | copy-attempt | paste-attempt | window-blur
Payload: { sessionId, participantId }
BROADCAST: anti-cheat-alert { type, participantId, severity, timestamp }
```

### Participant Activity
```
BROADCAST: participant-joined { userId, role, timestamp }
BROADCAST: participant-left { clientId, timestamp }
```

---

## Status Codes & Error Handling

### Success
- 200: OK
- 201: Created

### Client Errors
- 400: Bad Request (invalid data)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found

### Server Errors
- 500: Internal Server Error

### All responses include
```typescript
{
  data?: T,
  error?: string,
  message?: string,
  statusCode: number
}
```

---

## Authentication

All endpoints (except public report) require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Rate Limiting

- 100 requests per minute (general)
- 10 exports per hour (to prevent abuse)

---

## Pagination

Supported on list endpoints:
```
GET /interviews?limit=10&offset=0
```

- Max limit: 100
- Default limit: 10
- Max offset: 10000

---

## Filtering & Sorting

### List Interviews
```
GET /interviews?status=ACTIVE&sortBy=createdAt&sortOrder=desc
```

---

## WebSocket Connection Example

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000/interviews', {
  auth: { token: JWT_TOKEN },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

socket.on('connect', () => {
  socket.emit('join-room', {
    sessionId: 'interview-123',
    userId: 'user-456',
    role: 'CANDIDATE'
  });
});

socket.on('code-change', (data) => {
  console.log('Code updated:', data);
});

socket.on('anti-cheat-alert', (alert) => {
  console.log('Warning:', alert.type);
});
```

---

## Common Workflows

### Interview Flow
1. Create interview → Get interview ID
2. Create 3 links (INTERVIEWER, CANDIDATE, OBSERVER)
3. Share links with participants
4. All join via `POST /interviews/join`
5. Send/receive events via WebSocket
6. `POST /interviews/:id/status` → ACTIVE
7. During session: real-time code changes, verdicts, cursor tracking
8. Interviewer submits scorecard → `POST /interviews/:id/scorecard`
9. End interview → `POST /interviews/:id/end`
10. Create report → `POST /interviews/:id/report`
11. Share report link → `GET /interviews/public/report/:token`

### Anti-Cheat Monitoring
1. Candidate joins session
2. Client starts monitoring (AntiCheatDetector)
3. Events emitted to server
4. Server logs to anti_cheat_events table
5. Interviewer views alerts in real-time
6. Final report includes risk assessment

### Export & Sharing
1. Interview completed
2. Create report → `POST /interviews/:id/report`
3. Export data → `POST /interviews/:id/export`
4. Get share token from report
5. Share link expires after 30 days
6. Use `POST .../extend-share` to extend
5. Use `POST .../revoke-share` to revoke access
