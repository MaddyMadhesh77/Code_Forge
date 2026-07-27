# Interview System Documentation

## Overview

The CodeForge Interview System is a comprehensive solution for conducting live technical interviews with real-time collaboration, recording, scoring, and anti-cheat capabilities.

## Features

### 1. Live Interview Room
- **Real-time Shared Editor**: Candidates and interviewers can see code changes in real-time
- **Live Execution**: Run code and see execution results instantly
- **Verdict Timeline**: Visual timeline showing all test verdicts and events
- **Participant Presence**: See who's joined the interview (interviewer, candidate, observer)

### 2. Role-Based Session Links
- **Interviewer**: Full access, can create scorecards, view anti-cheat alerts
- **Candidate**: Can write code, see their verdicts
- **Observer**: Read-only access to monitor the interview
- **Secure Token-Based Links**: Unique tokens for each role, with optional expiry
- **Link Management**: Create, revoke, and extend session links

### 3. Recording & Replay
- **Automatic Recording**: All events are recorded automatically
- **Event Log**: Complete history of code changes, verdicts, and interactions
- **Code Snapshots**: Periodic snapshots of code state
- **Replay Playback**: Play back the entire interview with adjustable speed
- **Seek & Navigation**: Jump to specific points in the recording

### 4. Structured Scorecard
Interviewers can evaluate candidates on:
- **Problem Solving** (1-5 scale): Approach to problem, algorithm selection
- **Communication** (1-5 scale): Explanation clarity, questions asked
- **Debugging** (1-5 scale): Ability to identify and fix issues
- **Code Quality** (1-5 scale): Code organization, naming, best practices
- **Time Management** (1-5 scale): Efficiency in solving the problem
- **Testing Approach** (1-5 scale): Test coverage, edge case consideration

Features:
- Multiple scorecards from different interviewers
- Average scores calculation
- Feedback text field
- Overall rating (1-5)

### 5. One-Click Export & Reporting
- **PDF Export**: Professional report with all scores, feedback, and summary
- **JSON Export**: Structured data export for analysis
- **Optional Recording**: Include recording data in exports
- **Shareable Links**: Generate time-limited shareable links (default 30 days)
- **Public Reports**: Share interview results without requiring authentication
- **Link Management**: Extend or revoke share links

### 6. Anti-Cheat Controls
Detects and logs:
- **Tab Switching** (Severity: 2): Switching away from interview tab
- **Copy Attempts** (Severity: 3): Copying code/text
- **Paste Attempts** (Severity: 3): Pasting from clipboard
- **Window Blur** (Severity: 1): Losing window focus
- **External Tool Detection** (Severity: 5): AI tool usage detected

Features:
- Real-time alerts to interviewer
- Severity scoring system
- Risk level calculation (LOW, MEDIUM, HIGH)
- Comprehensive anti-cheat report
- Visual indicators in interview room

## Architecture

### Backend (NestJS)

#### Database Models
```
Interview (session) ──┬── SessionParticipant (role-based)
                      ├── InterviewSessionProblem
                      ├── Submission
                      ├── SessionLink (token-based access)
                      ├── InterviewRecording (event log)
                      ├── InterviewScorecard (evaluations)
                      ├── InterviewReport (export & sharing)
                      └── AntiCheatEvent (security monitoring)
```

#### API Endpoints

**Interview Management**
- `POST /interviews` - Create new interview
- `GET /interviews` - List user's interviews
- `GET /interviews/:sessionId` - Get interview details
- `PUT /interviews/:sessionId/status` - Update status (SCHEDULED, ACTIVE, COMPLETED)
- `POST /interviews/:sessionId/end` - End interview session

**Session Links (Role-Based Access)**
- `POST /interviews/:sessionId/links` - Create session link
- `GET /interviews/:sessionId/links` - List all links for session
- `DELETE /interviews/links/:linkId` - Revoke link
- `POST /interviews/join` - Join session with token

**Recording & Replay**
- `GET /interviews/:sessionId/recording` - Get recording/replay data
- Includes: events array, code snapshots, duration, metadata

**Scorecard & Evaluation**
- `POST /interviews/:sessionId/scorecard` - Submit scorecard
- `GET /interviews/:sessionId/scorecard` - Get user's scorecard
- `GET /interviews/:sessionId/scorecards` - Get all scorecards
- `GET /interviews/:sessionId/scorecard-report` - Generate report

**Anti-Cheat & Security**
- `GET /interviews/:sessionId/anti-cheat/events` - All events
- `GET /interviews/:sessionId/anti-cheat/report` - Risk analysis

**Export & Reporting**
- `POST /interviews/:sessionId/export` - Export data (PDF/JSON)
- `POST /interviews/:sessionId/report` - Create report
- `GET /interviews/:sessionId/report` - Get report
- `POST /interviews/:sessionId/report/extend-share` - Extend share link
- `POST /interviews/:sessionId/report/revoke-share` - Revoke share link
- `GET /interviews/public/report/:token` - Public report access (no auth)

#### WebSocket Events (Real-Time)

**Namespace**: `/interviews`

**Broadcasting Events**
- `code-change` - Code editor update
- `verdict-update` - Test execution result
- `cursor-position` - Editor cursor position (for awareness)
- `participant-joined` - User joined session
- `participant-left` - User left session
- `timeline-update` - Event timeline update

**Anti-Cheat Events**
- `tab-switch` - User switched tabs
- `copy-attempt` - Copy action detected
- `paste-attempt` - Paste action detected
- `window-blur` - Window focus lost
- `anti-cheat-alert` - Alert broadcast to interviewer

**Connection Events**
- `join-room` - Join interview session

### Frontend Integration

#### Client Utilities (see `interview-client-utils.ts`)

**InterviewWebSocketClient**
- Connect to WebSocket
- Emit events: code changes, verdicts, cursor positions, anti-cheat signals
- Listen to events: real-time updates

**InterviewAPIClient**
- HTTP API calls
- Interview CRUD
- Session management
- Scorecard submission
- Export & reporting

**AntiCheatDetector**
- Monitor for suspicious activities
- Auto-report to server
- Client-side detection

**RecordingPlayer**
- Playback recordings
- Adjust playback speed
- Seek functionality
- Progress tracking

## Usage Guide

### For Interviewers

1. **Create Interview**
   ```typescript
   const api = new InterviewAPIClient('http://localhost:4000', token);
   const interview = await api.createInterview(
     'React Assessment',
     'problem-id-123'
   );
   ```

2. **Generate Session Links**
   ```typescript
   // For candidate
   const candidateLink = await api.createSessionLink(
     interview.id,
     'CANDIDATE',
     3600 // 1 hour expiry
   );
   
   // For observer
   const observerLink = await api.createSessionLink(
     interview.id,
     'OBSERVER'
   );
   ```

3. **Connect to Live Session**
   ```typescript
   const ws = new InterviewWebSocketClient();
   ws.connect(interview.id, userId, 'INTERVIEWER');
   
   ws.listenToCodeChanges(code => {
     // Update editor
   });
   
   ws.listenToAntiCheatAlerts(alert => {
     // Show warning to interviewer
   });
   ```

4. **Submit Scorecard**
   ```typescript
   await api.createScorecard(
     interview.id,
     {
       problemSolving: 4,
       communication: 5,
       debugging: 3,
       codeQuality: 4,
       timeManagement: 4,
       testingApproach: 3
     },
     'Great problem-solving approach...',
     4.2 // overall rating
   );
   ```

5. **Export & Share Results**
   ```typescript
   // Create report
   const report = await api.createReport(interview.id);
   
   // Export as PDF
   const pdfData = await api.exportInterview(interview.id, 'PDF');
   
   // Get share link
   const shareUrl = `https://yourapp.com/reports/${report.shareToken}`;
   ```

### For Candidates

1. **Join Interview**
   ```typescript
   const api = new InterviewAPIClient('http://localhost:4000', token);
   const interview = await api.joinSession(sessionToken);
   ```

2. **Start Anti-Cheat Monitoring**
   ```typescript
   const ws = new InterviewWebSocketClient();
   ws.connect(interview.id, userId, 'CANDIDATE');
   
   const detector = new AntiCheatDetector(ws, userId);
   detector.startMonitoring();
   ```

3. **Edit & Run Code**
   ```typescript
   // Send code updates
   ws.onCodeChange(updatedCode, 'python');
   
   // Listen to execution results
   ws.listenToVerdictUpdates(verdict => {
     // Show verdict
   });
   ```

### Replay Interview

```typescript
const api = new InterviewAPIClient('http://localhost:4000', token);
const recording = await api.getRecording(sessionId);

const player = new RecordingPlayer(recording);

player.play(event => {
  if (event.type === 'code-change') {
    updateEditorContent(event.code);
  }
  if (event.type === 'verdict-update') {
    showVerdict(event.verdict);
  }
});

player.setSpeed(1.5); // 1.5x speed
```

## Database Schema

### Key Tables

```sql
-- Session management
interview_sessions
- id: UUID
- title: String
- creator_id: UUID (FK: users)
- status: SCHEDULED|ACTIVE|COMPLETED|CANCELLED
- started_at, ended_at: DateTime
- created_at, updated_at: DateTime

session_participants
- id: UUID
- session_id: UUID (FK)
- user_id: UUID (FK: users)
- role: INTERVIEWER|CANDIDATE|OBSERVER|ADMIN
- joined_at: DateTime

-- Access & linking
session_links
- id: UUID
- session_id: UUID (FK)
- role: INTERVIEWER|CANDIDATE|OBSERVER
- token: String (unique, 64 chars)
- is_revoked: Boolean
- expires_at: DateTime
- created_by: UUID (FK: users)

-- Recording
interview_recordings
- id: UUID
- session_id: UUID (FK, unique)
- events: JSONB (array of events)
- code_snapshots: JSONB (array of snapshots)
- started_at, stopped_at: DateTime

-- Evaluation
interview_scorecards
- id: UUID
- session_id: UUID (FK)
- interviewer_id: UUID (FK: users)
- candidate_id: UUID (FK: users)
- scores: JSONB (criteria scores)
- feedback: String
- overall_rating: Integer (1-5)
- unique(session_id, interviewer_id)

-- Reporting
interview_reports
- id: UUID
- session_id: UUID (FK)
- scorecard_id: UUID
- summary: String
- share_token: String (unique)
- share_expiry: DateTime (default 30 days)

-- Security
anti_cheat_events
- id: UUID
- session_id: UUID (FK)
- participant_id: UUID
- event_type: TAB_SWITCH|COPY_ATTEMPT|PASTE_ATTEMPT|WINDOW_BLUR|EXTERNAL_TOOL
- severity: Integer (1-5)
- details: JSONB
- timestamp: DateTime
```

## Security Considerations

1. **Token-Based Access**: Session links use secure random tokens
2. **Role-Based Control**: Different permissions for different roles
3. **Anti-Cheat Monitoring**: Multi-layered detection system
4. **Audit Logging**: All events logged with timestamps
5. **Share Link Expiry**: Time-limited access to reports
6. **Secure Recording**: Events stored securely in database

## Performance Optimization

1. **Event Batching**: WebSocket events batched for efficiency
2. **Code Snapshots**: Periodic snapshots instead of every keystroke
3. **Lazy Loading**: Recording data loaded on demand
4. **Connection Pooling**: Database connection optimization
5. **Caching**: Frequently accessed data cached

## Testing

### E2E Test Example
```typescript
describe('Interview System', () => {
  it('should create interview and conduct session', async () => {
    // Create interview
    // Generate links
    // Join as candidate
    // Submit code
    // Verify recording
    // Submit scorecard
    // Export report
  });
});
```

## Troubleshooting

### WebSocket Connection Issues
- Check CORS settings
- Verify socket.io configuration
- Check network connectivity

### Recording Not Starting
- Ensure recording service initialized
- Check database connection
- Verify session exists

### Anti-Cheat Not Detecting
- Verify client-side event listeners
- Check WebSocket emission
- Review event threshold settings

## Future Enhancements

1. **Live Screen Sharing**: Share interviewer or candidate screen
2. **Video Recording**: Record video feed of participants
3. **AI Analysis**: Automated code review using AI
4. **Performance Metrics**: Time complexity analysis of solutions
5. **Interview Templates**: Pre-configured interview scenarios
6. **Batch Reporting**: Generate reports for multiple interviews
7. **Analytics Dashboard**: Interview statistics and trends
8. **Integration APIs**: Third-party tool integration

## Product Roadmap Expansion

The next product layer should build on the current interview engine with workflow, calibration, and monetization features.

### Phase 1: Interview Operations
1. **Interview Templates by Role**: Pre-built templates for frontend, backend, data, and SDE1/SDE2 interviews.
2. **Team Problem Library**: Private reusable problem sets with custom test cases and ownership controls.

### Phase 2: Interview Quality
1. **Calibration Dashboard**: Compare interviewer scoring patterns, variance, and rubric alignment across sessions.
2. **AI-Assisted Rubric Drafts**: Generate draft notes and scoring suggestions for interviewer review, not final decision-making.

### Phase 3: Hiring Workflow Integrations
1. **Candidate Pipeline Integrations**: Start with basic Greenhouse, Lever, and Workday sync for candidate status and interview scheduling.
2. **Integration APIs**: Keep the public API surface flexible for future ATS and HRIS connectors.

### Phase 4: Monetization
1. **Hybrid Pricing**: Combine usage-based billing with seat-based plans so startups can start small and expand with adoption.
2. **Reporting for Billing**: Expose usage, seat allocation, and organization-level consumption in admin views.

## Support

For issues or questions about the interview system, please create an issue or contact the development team.
