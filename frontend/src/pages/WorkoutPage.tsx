import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EXERCISE_IDS, EXERCISES, type ExerciseId } from '../constants/exercises';
import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import { exerciseAngle } from '../utils/pose/exerciseAngle';
import { INITIAL_REP_STATE, stepRepCounter, type RepCounterState, type RepPhase } from '../utils/pose/repCounter';

const PHASE_LABELS: Record<RepPhase, string> = {
  WAITING: 'Vào tư thế bắt đầu',
  UP: 'Lên',
  DOWN: 'Xuống',
};

// What the screen shows; the full counter state lives in a ref and changes every frame
interface View {
  reps: number;
  phase: RepPhase;
  angle: number | null; // rounded
  seen: boolean; // the body was usable in the last frame
}

const INITIAL_VIEW: View = { reps: 0, phase: 'WAITING', angle: null, seen: false };

function toView(state: RepCounterState, seen: boolean): View {
  return {
    reps: state.reps,
    phase: state.phase,
    angle: state.angle == null ? null : Math.round(state.angle),
    seen,
  };
}

const sameView = (a: View, b: View) => a.reps === b.reps && a.phase === b.phase && a.angle === b.angle && a.seen === b.seen;

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError') return 'Bạn đã chặn quyền dùng camera. Mở cài đặt trang trên trình duyệt để cho phép rồi thử lại.';
  if (name === 'NotFoundError') return 'Không tìm thấy camera trên thiết bị này.';
  if (name === 'NotReadableError') return 'Camera đang được ứng dụng khác dùng. Hãy tắt ứng dụng đó rồi thử lại.';
  return 'Không mở được camera. Hãy thử lại.';
}

// Rep counter: everything runs in the browser. Camera frames never leave the device:
// only the final rep count will be sent to the server (when saving a session).
export default function WorkoutPage() {
  const pose = usePoseLandmarker();
  const [exerciseId, setExerciseId] = useState<ExerciseId>('SQUAT');
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const counterRef = useRef<RepCounterState>(INITIAL_REP_STATE);

  const exercise = EXERCISES[exerciseId];

  function resetCounter() {
    counterRef.current = INITIAL_REP_STATE;
    setView(INITIAL_VIEW);
  }

  async function startCamera() {
    setError(null);
    // getUserMedia only exists on HTTPS pages (and localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Trình duyệt không cho dùng camera ở trang này (cần HTTPS).');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, // small frames = faster model
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      resetCounter();
      setRunning(true);
    } catch (err) {
      stopCamera();
      setError(cameraErrorMessage(err));
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop()); // turns the camera light off
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setRunning(false);
  }

  function chooseExercise(id: ExerciseId) {
    setExerciseId(id);
    resetCounter(); // reps of another exercise must not carry over
  }

  // Leaving the page while the camera is on: release it
  useEffect(() => {
    const streams = streamRef;
    return () => streams.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // Frame loop: detect -> draw the skeleton -> angle -> counter
  useEffect(() => {
    if (!running || pose.kind !== 'ready') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!video || !canvas || !ctx) return;

    const landmarker = pose.landmarker;
    const drawer = new DrawingUtils(ctx);
    const current = EXERCISES[exerciseId];
    let frameId = 0;
    let lastVideoTime = -1;
    let shown = INITIAL_VIEW;

    const loop = () => {
      frameId = requestAnimationFrame(loop);
      // Same video frame as last time (screen refresh faster than the camera): nothing new to do
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const landmarks = result.landmarks[0];

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (landmarks) {
        drawer.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#ffffff', lineWidth: 3 });
        drawer.drawLandmarks(landmarks, { color: '#dcf0b9', radius: 3 });
      }

      const angle = exerciseAngle(landmarks, current, video.videoWidth, video.videoHeight);
      counterRef.current = stepRepCounter(counterRef.current, angle, now, current);

      // Re-render only when something on screen changes, not 30 times a second
      const next = toView(counterRef.current, angle != null);
      if (!sameView(next, shown)) {
        shown = next;
        setView(next);
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [running, pose, exerciseId]);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <Card className="min-w-0 lg:col-span-2">
        {/* Mirrored like a mirror (front camera); angles are not affected by mirroring */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink">
          <video ref={videoRef} playsInline muted className="absolute inset-0 size-full -scale-x-100 object-contain" />
          <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-contain" />
          {!running && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white">
              <Camera aria-hidden="true" className="size-8" />
              <p className="text-sm">Camera đang tắt</p>
            </div>
          )}
          {running && !view.seen && (
            <p className="absolute inset-x-4 bottom-4 rounded-xl bg-black/60 px-3 py-2 text-center text-sm text-white" role="status">
              Chưa thấy rõ người: lùi ra xa để camera thấy cả người.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          Video chỉ được xử lý trên thiết bị của bạn, không gửi lên máy chủ.
        </p>
      </Card>

      <div className="grid min-w-0 gap-5">
        {error && <Alert type="error">{error}</Alert>}
        {pose.kind === 'error' && (
          <Alert type="error">Không tải được bộ nhận diện tư thế. Hãy tải lại trang.</Alert>
        )}

        <Card title="Bài tập">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Chọn bài tập">
            {EXERCISE_IDS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={id === exerciseId}
                onClick={() => chooseExercise(id)}
                className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${
                  id === exerciseId ? 'bg-ink text-white' : 'bg-bg text-ink hover:bg-line'}`}>
                {EXERCISES[id].label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">{exercise.cameraHint}</p>
        </Card>

        <Card tone="lime">
          <p className="text-sm text-ink-soft">Số rep</p>
          <p className="text-6xl font-bold tabular-nums" aria-live="polite">{view.reps}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {running ? PHASE_LABELS[view.phase] : 'Bật camera để bắt đầu'}
            {running && view.angle != null && <span className="text-muted"> · góc {view.angle}°</span>}
          </p>
        </Card>

        <div className="flex flex-wrap gap-2">
          {running ? (
            <Button variant="secondary" onClick={stopCamera}>
              <CameraOff aria-hidden="true" className="size-4" /> Tắt camera
            </Button>
          ) : (
            <Button onClick={() => void startCamera()} disabled={pose.kind !== 'ready'}>
              <Camera aria-hidden="true" className="size-4" />
              {pose.kind === 'loading' ? 'Đang tải bộ nhận diện…' : 'Bắt đầu'}
            </Button>
          )}
          <Button variant="secondary" onClick={resetCounter} disabled={view.reps === 0}>
            <RotateCcw aria-hidden="true" className="size-4" /> Đếm lại
          </Button>
        </div>
      </div>
    </div>
  );
}
