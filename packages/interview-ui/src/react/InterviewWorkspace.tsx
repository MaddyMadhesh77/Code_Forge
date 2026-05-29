import { useMemo, useState } from 'react';
import { VideoRecorder } from './VideoRecorder.js';

interface InterviewWorkspaceProps {
  sessionId: string;
  apiBaseUrl: string;
  defaultLanguage?: string;
}

export function InterviewWorkspace({
  sessionId,
  apiBaseUrl,
  defaultLanguage = 'typescript',
}: InterviewWorkspaceProps) {
  const [code, setCode] = useState('// Write solution here');
  const [language, setLanguage] = useState(defaultLanguage);
  const [reviewResult, setReviewResult] = useState<any | null>(null);
  const [complexity, setComplexity] = useState<any | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  const base = useMemo(() => `${apiBaseUrl}/interviews/${sessionId}`, [apiBaseUrl, sessionId]);

  const runCodeReview = async () => {
    const response = await fetch(`${base}/code-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
    });
    setReviewResult(await response.json());
  };

  const runComplexity = async () => {
    const response = await fetch(`${base}/complexity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    setComplexity(await response.json());
  };

  const uploadRecording = async (blob: Blob, source: 'webcam' | 'screen') => {
    const fileName = `${sessionId}-${source}-${Date.now()}.webm`;
    const response = await fetch(`${base}/recordings/artifacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType: blob.type || 'video/webm',
        sizeBytes: blob.size,
        source,
      }),
    });

    if (!response.ok) {
      setUploadMessage('Recording captured but metadata upload failed.');
      return;
    }

    setUploadMessage(`Recording metadata saved (${source}, ${Math.round(blob.size / 1024)} KB).`);
  };

  return (
    <main style={{ display: 'grid', gap: 12 }}>
      <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
        <h2 style={{ marginTop: 0 }}>Interview Workspace</h2>
        <label>
          Language
          <select value={language} onChange={(event: any) => setLanguage(event.target.value)}>
            <option value="typescript">TypeScript</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </label>
        <textarea
          value={code}
          onChange={(event: any) => setCode(event.target.value)}
          rows={14}
          style={{ width: '100%', marginTop: 8, fontFamily: 'monospace' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="button" onClick={runCodeReview}>
            Run AI Code Review
          </button>
          <button type="button" onClick={runComplexity}>
            Analyze Complexity
          </button>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <VideoRecorder mode="webcam" onRecorded={(blob) => uploadRecording(blob, 'webcam')} />
        <VideoRecorder mode="screen" onRecorded={(blob) => uploadRecording(blob, 'screen')} withAudio={false} />
      </section>

      {uploadMessage ? <p>{uploadMessage}</p> : null}

      {reviewResult ? (
        <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>AI Review Score: {reviewResult.score}</h3>
          <ul>
            {(reviewResult.issues || []).map((issue: any, index: number) => (
              <li key={`${issue.category}-${index}`}>
                [{issue.severity}] {issue.category}: {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {complexity ? (
        <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Complexity</h3>
          <p>Time: {complexity.timeComplexity}</p>
          <p>Space: {complexity.spaceComplexity}</p>
          <p>Confidence: {complexity.confidence}</p>
        </section>
      ) : null}
    </main>
  );
}
