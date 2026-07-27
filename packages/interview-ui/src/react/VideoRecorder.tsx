import { useMemo, useRef, useState } from 'react';

type CaptureMode = 'webcam' | 'screen';

interface VideoRecorderProps {
  onRecorded: (blob: Blob) => void;
  mode?: CaptureMode;
  withAudio?: boolean;
}

export function VideoRecorder({ onRecorded, mode = 'webcam', withAudio = true }: VideoRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = useMemo(() => (mode === 'screen' ? 'Screen Recorder' : 'Webcam Recorder'), [mode]);

  const start = async () => {
    setError(null);
    try {
      const stream =
        mode === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: withAudio })
          : await navigator.mediaDevices.getUserMedia({ video: true, audio: withAudio });

      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onRecorded(blob);
        streamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      };

      recorder.start(300);
      setRecording(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{label}</h3>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={start} disabled={recording}>
          Start
        </button>
        <button type="button" onClick={stop} disabled={!recording}>
          Stop
        </button>
      </div>
      {error ? <p style={{ color: '#9f2222' }}>{error}</p> : null}
    </section>
  );
}
