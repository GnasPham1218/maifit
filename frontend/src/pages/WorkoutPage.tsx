import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, Check, Gauge, Maximize2, Minimize2, RotateCcw, Save } from 'lucide-react';
import { Link } from 'react-router';
import { workoutApi } from '../apis/workoutApi';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getErrorMessage } from '../constants/errorMessages';
import { EXERCISE_IDS, EXERCISES, type ExerciseId } from '../exercises';
import { savedPoseModel, savePoseModel, usePoseLandmarker, type PoseModel } from '../hooks/usePoseLandmarker';
import { analyzeFrame, type FrameAnalysis } from '../utils/pose/analyzeFrame';
import { createLandmarkFilter } from '../utils/pose/landmarkFilter';
import type { RepEvent, RepPhase } from '../utils/pose/repCounter';
import {
  holdProgress,
  INITIAL_SESSION,
  stepSession,
  type SessionStage,
  type SessionState,
} from '../utils/pose/workoutSession';

const PHASE_LABELS: Record<RepPhase, string> = {
  WAITING: 'Vào tư thế bắt đầu',
  UP: 'Lên',
  DOWN: 'Xuống',
};

// Under this many frames per second after the first seconds, the full model is too slow for the
// phone: a fast rep then has only 1-2 frames near the bottom. Switch to lite.
const MIN_FPS = 12;
const FPS_WARMUP_MS = 3000;

const SKELETON_OK = '#ffffff';
const SKELETON_BAD = '#f87171';

// What the screen shows; the full counter state lives in a ref and changes every frame
interface View {
  stage: SessionStage;
  setupMessage: string | null; // SETUP: what to do to get into position
  hold: number; // SETUP: 0..1 progress of holding still, in steps of 0.1
  reps: number;
  phase: RepPhase;
  angle: number | null; // rounded
  seen: boolean; // the counting joint was usable in the last frame
  formMessage: string | null; // a form rule broken right now
  formUnknown: boolean; // the form lines are hidden (e.g. legs behind the shoulders)
  event: RepEvent | null;
  debug: string | null; // raw measurements, shown with "Hiện số đo" to tune the thresholds
}

const INITIAL_VIEW: View = {
  stage: 'SETUP',
  setupMessage: null,
  hold: 0,
  reps: 0,
  phase: 'WAITING',
  angle: null,
  seen: false,
  formMessage: null,
  formUnknown: false,
  event: null,
  debug: null,
};

const sameView = (a: View, b: View) =>
  a.stage === b.stage && a.setupMessage === b.setupMessage && a.hold === b.hold && a.reps === b.reps && a.phase === b.phase && a.angle === b.angle && a.seen === b.seen &&
  a.formMessage === b.formMessage && a.formUnknown === b.formUnknown && a.event?.seq === b.event?.seq && a.debug === b.debug;

const round = (n: number | null | undefined) => (n == null ? '—' : String(Math.round(n)));

// One line of raw numbers to tune the thresholds on a real phone
function debugLine(analysis: FrameAnalysis, session: SessionState, fps: number, model: string): string {
  const { topHeight, lowHeight, limb } = session.counter;
  const drop = topHeight != null && lowHeight != null && limb ? ((topHeight - lowHeight) / limb) * 100 : null;
  return [
    `góc ${round(analysis.angle)}°`,
    `lưng ${round(analysis.tilt)}°`,
    `hạ ${round(drop)}%`,
    `tư thế ${analysis.posture.kind}`,
    `form ${analysis.form.kind}`,
    `${round(fps)} fps (${model})`,
  ].join(' · ');
}

// One line per attempt in the set log: what the lowest angle was and whether it counted
interface Attempt {
  seq: number;
  rep: number | null; // rep number when it counted
  low: number | null;
  ok: boolean;
  reason: string | null;
}

function toAttempt(event: RepEvent, reps: number, downBelow: number): Attempt {
  const reason =
    event.kind === 'TOO_SHALLOW' ? `chưa đủ sâu (cần dưới ${downBelow}°)`
      : event.kind === 'TOO_FAST' ? 'quá nhanh'
        : event.kind === 'BAD_FORM' ? (event.message ?? 'sai tư thế')
          : null;
  return { seq: event.seq, rep: event.kind === 'COUNTED' ? reps : null, low: event.low, ok: event.kind === 'COUNTED', reason };
}

function attemptText(a: Attempt): string {
  const head = a.ok ? `Rep ${a.rep}` : `Lần ${a.seq}`;
  const low = a.low != null ? ` · xuống ${a.low}°` : '';
  return a.ok ? `${head}${low} · đạt` : `${head}${low} · chưa đạt: ${a.reason}`;
}

interface SetTiming {
  clientId: string;
  startedAt: number | null; // ms, when counting started (wall clock)
  lastRepAt: number | null; // ms, when the last rep was counted
}

const newSet = (): SetTiming => ({ clientId: crypto.randomUUID(), startedAt: null, lastRepAt: null });

// From "in position" to the last rep, 5 s .. 1 h like the server
function setWindow(set: SetTiming): { start: number; durationSec: number } {
  const now = Date.now();
  const start = set.startedAt ?? now;
  const end = set.lastRepAt ?? now;
  return { start, durationSec: Math.min(3600, Math.max(5, Math.ceil((end - start) / 1000))) };
}

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
  const [model, setModel] = useState<PoseModel>(savedPoseModel);
  const pose = usePoseLandmarker(model);
  const [exerciseId, setExerciseId] = useState<ExerciseId>('SQUAT');
  const [running, setRunning] = useState(false);
  const [focus, setFocus] = useState(false); // camera fills the screen
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]); // the set log, newest last

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<SessionState>(INITIAL_SESSION);
  // The set being recorded: its id (a retried save is stored once) and its timing for the server
  const setRef = useRef<SetTiming>(newSet());
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmStop, setConfirmStop] = useState(false); // "set not saved" dialog

  const exercise = EXERCISES[exerciseId];

  function resetCounter() {
    sessionRef.current = INITIAL_SESSION;
    setRef.current = newSet();
    setView(INITIAL_VIEW);
    setAttempts([]);
  }

  const unsaved = view.reps > 0;

  // Sends the set to the server, which checks it again (pace, time, daily limits), then starts a new set
  async function saveSet(): Promise<boolean> {
    const reps = sessionRef.current.counter.reps;
    if (reps === 0) return true;
    const { start, durationSec } = setWindow(setRef.current);
    setSaving(true);
    setSaveNote(null);
    try {
      await workoutApi.create({
        exercise: exerciseId,
        reps,
        startedAt: new Date(start).toISOString(),
        durationSec,
        clientId: setRef.current.clientId,
      });
      setSaveNote({ ok: true, text: `Đã lưu ${reps} rep ${exercise.label.toLowerCase()}.` });
      resetCounter();
      return true;
    } catch (err) {
      setSaveNote({ ok: false, text: getErrorMessage(err) });
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Turning the camera off with reps not saved: ask first instead of losing the set
  function requestStop() {
    if (unsaved) setConfirmStop(true);
    else stopCamera();
  }

  function confirmReset() {
    if (unsaved && !window.confirm(`Bỏ set ${view.reps} rep chưa lưu và đếm lại từ đầu?`)) return;
    resetCounter();
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
    exitFocus();
  }

  // Real fullscreen where the browser allows it on an element (Android, desktop);
  // iPhone Safari does not, so the stage also covers the page with position: fixed
  function enterFocus() {
    setFocus(true);
    stageRef.current?.requestFullscreen?.().catch(() => {});
  }

  function exitFocus() {
    setFocus(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }

  function chooseExercise(id: ExerciseId) {
    if (id === exerciseId) return;
    if (unsaved && !window.confirm(`Đổi bài sẽ bỏ set ${view.reps} rep chưa lưu. Đổi bài?`)) return;
    setExerciseId(id);
    resetCounter(); // reps of another exercise must not carry over
  }

  // Closing or reloading the tab with a set not saved: the browser asks first
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // Leaving the page while the camera is on: release it
  useEffect(() => {
    const streams = streamRef;
    return () => streams.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // Fullscreen closed by the browser (Esc, back gesture): leave focus mode too.
  // While focused, the page behind must not scroll.
  useEffect(() => {
    if (!focus) return;
    const onChange = () => {
      if (!document.fullscreenElement) setFocus(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.body.style.overflow = overflow;
    };
  }, [focus]);

  // Frame loop: detect -> analyze -> count -> draw
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
    // Steady the landmarks before drawing and measuring (a new filter per run: no old pose blended in)
    const filterImage = createLandmarkFilter();
    const filterWorld = createLandmarkFilter();
    let fps = 0;
    let lastFrameAt = 0;
    let loopStartedAt = 0; // set on the first frame
    let switchedModel = false;
    let loggedSeq = sessionRef.current.counter.event?.seq ?? 0;
    let lastReps = sessionRef.current.counter.reps;

    const loop = () => {
      frameId = requestAnimationFrame(loop);
      // Same video frame as last time (screen refresh faster than the camera): nothing new to do
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const image = filterImage(result.landmarks[0], now);
      const world = filterWorld(result.worldLandmarks[0], now);
      if (!loopStartedAt) loopStartedAt = now;
      if (lastFrameAt) fps = fps * 0.9 + (1000 / (now - lastFrameAt)) * 0.1;
      lastFrameAt = now;
      // Too slow with the full model: use lite from now on (the set and its reps are kept)
      if (!switchedModel && pose.model === 'full' && now - loopStartedAt > FPS_WARMUP_MS && fps < MIN_FPS) {
        switchedModel = true;
        savePoseModel('lite');
        setModel('lite');
      }
      const frameSize = { width: video.videoWidth, height: video.videoHeight };
      const analysis = analyzeFrame(image, world, current, frameSize);
      const session = stepSession(sessionRef.current, analysis, now, current);
      sessionRef.current = session;
      const state = session.counter;

      // Set timing (wall clock, sent to the server): starts when counting starts, ends at the last rep
      const set = setRef.current;
      if (session.stage === 'ACTIVE' && set.startedAt == null) set.startedAt = Date.now();
      if (state.reps > lastReps) set.lastRepAt = Date.now();
      lastReps = state.reps;

      // Draw: skeleton (red while the form is wrong) + the angle next to the counting joint
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (image) {
        const color = state.formMessage ? SKELETON_BAD : SKELETON_OK;
        drawer.drawConnectors(image, PoseLandmarker.POSE_CONNECTIONS, { color, lineWidth: 3 });
        drawer.drawLandmarks(image, { color: '#dcf0b9', radius: 3 });
      }
      if (analysis.joint && state.angle != null) {
        const size = Math.round(canvas.height / 16);
        ctx.save();
        // The canvas is mirrored with CSS like the video; mirror the text back so it reads normally
        ctx.translate(analysis.joint.x * canvas.width, analysis.joint.y * canvas.height);
        ctx.scale(-1, 1);
        ctx.font = `600 ${size}px system-ui, sans-serif`;
        ctx.lineWidth = Math.max(3, size / 6);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillStyle = '#ffffff';
        const label = `${Math.round(state.angle)}°`;
        ctx.strokeText(label, size * 0.4, -size * 0.4);
        ctx.fillText(label, size * 0.4, -size * 0.4);
        ctx.restore();
      }

      // A finished attempt (counted or not) goes into the set log once
      if (state.event && state.event.seq !== loggedSeq) {
        loggedSeq = state.event.seq;
        const attempt = toAttempt(state.event, state.reps, current.downBelow);
        setAttempts((list) => [...list.slice(-49), attempt]);
      }

      // Re-render only when something on screen changes, not 30 times a second
      const next: View = {
        stage: session.stage,
        setupMessage: session.message,
        hold: Math.round(holdProgress(session, now) * 10) / 10,
        reps: state.reps,
        phase: state.phase,
        angle: state.angle == null ? null : Math.round(state.angle),
        seen: analysis.angle != null,
        formMessage: state.formMessage,
        formUnknown: current.formRules.length > 0 && analysis.form.kind === 'unknown',
        event: state.event,
        debug: showDebug ? debugLine(analysis, session, fps, pose.model) : null,
      };
      if (!sameView(next, shown)) {
        shown = next;
        setView(next);
      }
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
      // Camera off (or exercise changed): the last skeleton must not stay drawn over the screen
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [running, pose, exerciseId, showDebug]);

  const startButton = (
    <Button onClick={() => void startCamera()} disabled={pose.kind !== 'ready'}>
      <Camera aria-hidden="true" className="size-4" />
      {pose.kind === 'loading' ? 'Đang tải bộ nhận diện…' : 'Bắt đầu'}
    </Button>
  );

  // Bottom line on the camera: the most useful message right now
  const liveMessage = !running || view.stage === 'SETUP'
    ? null
    : !view.seen
      ? { tone: 'bg-black/70', text: 'Chưa thấy rõ người: lùi ra xa để camera thấy cả người.' }
      : view.formMessage
        ? { tone: 'bg-danger', text: view.formMessage }
        : view.formUnknown
          ? { tone: 'bg-black/70', text: 'Chưa thấy rõ chân: chưa kiểm tra được tư thế.' }
          : null;

  // Camera off with a set not saved: save it, drop it, or keep training.
  // Rendered INSIDE the stage: in real fullscreen (Fullscreen API) the browser only shows the
  // fullscreen element and its children, so a dialog outside it stayed invisible on the phone.
  const unsavedDialog = confirmStop && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog"
          aria-modal="true" aria-labelledby="unsaved-title">
          <div className="grid w-full max-w-sm gap-4 rounded-card bg-surface p-6">
            <p id="unsaved-title" className="text-lg font-semibold">Set chưa được lưu</p>
            <p className="text-sm text-ink-soft">
              Bạn đã tập {view.reps} rep {exercise.label.toLowerCase()} nhưng chưa lưu. Lưu trước khi tắt camera?
            </p>
            <div className="grid gap-2">
              <Button disabled={saving} onClick={() => void saveSet().then((ok) => {
                setConfirmStop(false);
                if (ok) stopCamera();
              })}>
                <Save aria-hidden="true" className="size-4" /> {saving ? 'Đang lưu…' : 'Lưu rồi tắt'}
              </Button>
              <Button variant="secondary" disabled={saving} onClick={() => {
                setConfirmStop(false);
                resetCounter();
                stopCamera();
              }}>
                Tắt, không lưu
              </Button>
              <Button variant="secondary" disabled={saving} onClick={() => setConfirmStop(false)}>Tiếp tục tập</Button>
            </div>
          </div>
        </div>
  );

  const stage = (
    <div
      ref={stageRef}
      className={focus
        ? 'fixed inset-0 z-50 bg-black'
        : 'relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink sm:aspect-[4/3]'}
    >
      {/* Mirrored like a mirror (front camera); angles are not affected by mirroring */}
      <video ref={videoRef} playsInline muted className="absolute inset-0 size-full -scale-x-100 object-contain" />
      <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-contain" />

      {!running && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <Camera aria-hidden="true" className="size-8" />
          <p className="text-sm">Camera đang tắt</p>
          {focus && startButton}
        </div>
      )}

      {running && (
        <div className="pointer-events-none absolute inset-0 text-white">
          {/* Rep count + phase, top left */}
          <div className="absolute top-3 left-3 rounded-2xl bg-black/55 px-4 py-2">
            <p className="text-5xl leading-none font-bold tabular-nums sm:text-6xl" aria-live="polite">{view.reps}</p>
            <p className="mt-1 text-sm">
              {exercise.label} · {view.stage === 'SETUP' ? 'Chưa đếm' : PHASE_LABELS[view.phase]}
              {view.angle != null && <span className="text-white/70"> · {view.angle}°</span>}
            </p>
          </div>

          {attempts.length > 0 && (
            <ol className="absolute top-28 left-3 grid gap-1 text-xs sm:top-32" aria-label="Các lần gần nhất">
              {attempts.slice(-4).map((a) => (
                <li key={a.seq} className={`rounded-lg px-2 py-1 ${a.ok ? 'bg-lime-strong/80' : 'bg-black/60'}`}>
                  {attemptText(a)}
                </li>
              ))}
            </ol>
          )}

          {view.debug && (
            <p className="absolute top-3 right-3 max-w-[60%] rounded-xl bg-black/70 px-3 py-2 text-right font-mono text-xs">
              {view.debug}
            </p>
          )}

          {/* Not counting yet (or paused): get into position and hold still */}
          {view.stage === 'SETUP' && (
            <div className="absolute inset-x-6 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-black/70 p-4 text-center" role="status">
              <p className="text-lg font-semibold">Vào vị trí</p>
              <p className="mt-1 text-sm">{view.setupMessage ?? exercise.setupHint}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25" aria-hidden="true">
                <div className="h-full rounded-full bg-lime transition-[width] duration-100" style={{ width: `${view.hold * 100}%` }} />
              </div>
            </div>
          )}

          {/* A counted rep: a check mark that pops in the middle */}
          {view.event?.kind === 'COUNTED' && (
            <div key={view.event.seq} className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-24 animate-rep-pop items-center justify-center rounded-full bg-lime-strong opacity-0 shadow-lg">
                <Check aria-hidden="true" className="size-14" strokeWidth={3} />
              </div>
            </div>
          )}

          <div className="absolute inset-x-3 bottom-16 flex flex-col items-center gap-2 sm:bottom-20">
            {/* A rep that did not count: says why, then fades out */}
            {view.event && view.event.kind !== 'COUNTED' && (
              <p key={view.event.seq} role="status"
                className={`animate-toast rounded-xl px-3 py-2 text-center text-sm font-medium opacity-0 ${
                  view.event.kind === 'BAD_FORM' ? 'bg-danger' : 'bg-peach-strong'}`}>
                {view.event.kind === 'BAD_FORM' ? `Không tính rep: ${view.event.message}` : 'Chưa đủ sâu: xuống thấp hơn'}
              </p>
            )}
            {liveMessage && (
              <p className={`rounded-xl px-3 py-2 text-center text-sm ${liveMessage.tone}`}>{liveMessage.text}</p>
            )}
          </div>
        </div>
      )}

      {unsavedDialog}

      {/* Controls on the camera: always the fullscreen toggle; in focus mode, the others too */}
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-end gap-2">
        {focus && running && (
          <>
            {unsaved && (
              <button type="button" onClick={() => void saveSet()} disabled={saving}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-lime-strong px-4 text-sm text-white hover:bg-lime-strong/80">
                <Save aria-hidden="true" className="size-4" /> Lưu
              </button>
            )}
            <button type="button" onClick={confirmReset}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-black/55 px-4 text-sm text-white hover:bg-black/70">
              <RotateCcw aria-hidden="true" className="size-4" /> Đếm lại
            </button>
            <button type="button" onClick={requestStop}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-black/55 px-4 text-sm text-white hover:bg-black/70">
              <CameraOff aria-hidden="true" className="size-4" /> Tắt
            </button>
          </>
        )}
        <button type="button" onClick={() => setShowDebug(!showDebug)} aria-pressed={showDebug}
          className={`flex size-10 cursor-pointer items-center justify-center rounded-full text-white hover:bg-black/70 ${
            showDebug ? 'bg-sky-strong' : 'bg-black/55'}`}
          aria-label="Hiện số đo" title="Hiện số đo">
          <Gauge aria-hidden="true" className="size-5" />
        </button>
        <button type="button" onClick={focus ? exitFocus : enterFocus}
          className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
          aria-label={focus ? 'Thu nhỏ' : 'Toàn màn hình'} title={focus ? 'Thu nhỏ' : 'Toàn màn hình'}>
          {focus ? <Minimize2 aria-hidden="true" className="size-5" /> : <Maximize2 aria-hidden="true" className="size-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <Card className="min-w-0 p-3 sm:p-6 lg:col-span-2">
        {stage}
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

        {/* Stays after the camera is off, so the result of the set is still visible */}
        <Card tone="lime">
          <p className="text-sm text-ink-soft">{exercise.label}: số rep</p>
          <p className="text-6xl font-bold tabular-nums">{view.reps}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => void saveSet()} disabled={!unsaved || saving}>
              <Save aria-hidden="true" className="size-4" /> {saving ? 'Đang lưu…' : 'Lưu set'}
            </Button>
            <Link to="/leaderboard" className="text-sm">Bảng xếp hạng</Link>
          </div>
          {saveNote && (
            <p className={`mt-2 text-sm ${saveNote.ok ? 'text-success' : 'text-danger'}`} role="status">{saveNote.text}</p>
          )}
        </Card>

        {attempts.length > 0 && (
          <Card title="Nhật ký set">
            <ol className="grid max-h-64 gap-1 overflow-y-auto text-sm">
              {[...attempts].reverse().map((a) => (
                <li key={a.seq} className={a.ok ? 'text-success' : 'text-ink-soft'}>
                  {a.ok ? '✓ ' : '✗ '}{attemptText(a)}
                </li>
              ))}
            </ol>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {running ? (
            <Button variant="secondary" onClick={requestStop}>
              <CameraOff aria-hidden="true" className="size-4" /> Tắt camera
            </Button>
          ) : (
            startButton
          )}
          <Button variant="secondary" onClick={confirmReset} disabled={view.reps === 0}>
            <RotateCcw aria-hidden="true" className="size-4" /> Đếm lại
          </Button>
        </div>
      </div>

    </div>
  );
}
