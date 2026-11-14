import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, RotateCcw, Save } from 'lucide-react';
import { useBlocker } from 'react-router';
import { workoutApi } from '../apis/workoutApi';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { WorkoutCalendarCard, WorkoutHistoryCard } from '../components/WorkoutHistory';
import { CameraControls, CameraTopBar, DepthMeter, RepBlock, RepToast, SetupPanel, WarningBanner } from '../components/workout/CameraOverlay';
import { SetLog } from '../components/workout/SetLog';
import { SetLogCard } from '../components/workout/SetLogCard';
import { useWorkoutHistory } from '../hooks/useWorkoutHistory';
import type { Attempt } from '../utils/workoutDisplay';
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

// Under this many frames per second after the first seconds, the full model is too slow for the
// phone: a fast rep then has only 1-2 frames near the bottom. Switch to lite.
const MIN_FPS = 12;
const FPS_WARMUP_MS = 3000;

const SKELETON_OK = '#e9eef8';
const SKELETON_BAD = '#ff6b6b';
const JOINT_DOT = '#2b6cf6'; // the accent, same in both themes (the camera is always dark)

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
  startedAt: number | null; // wall clock ms when the set started counting (for the timer)
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
  startedAt: null,
};

const sameView = (a: View, b: View) =>
  a.stage === b.stage && a.setupMessage === b.setupMessage && a.hold === b.hold && a.reps === b.reps && a.phase === b.phase && a.angle === b.angle && a.seen === b.seen &&
  a.formMessage === b.formMessage && a.formUnknown === b.formUnknown && a.event?.seq === b.event?.seq && a.debug === b.debug &&
  a.startedAt === b.startedAt;

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

// Why an attempt did not count: a full sentence for the camera, a short tag for the set log
function whyNot(event: RepEvent, downBelow: number, upAbove: number): { reason: string; tag: string } | null {
  switch (event.kind) {
    case 'TOO_SHALLOW': return { reason: `chưa đủ sâu (cần dưới ${downBelow}°)`, tag: 'Chưa đủ sâu' };
    case 'NOT_UP': return { reason: `chưa lên hết (cần trên ${upAbove}°)`, tag: 'Chưa lên hết' };
    case 'TOO_FAST': return { reason: 'quá nhanh', tag: 'Quá nhanh' };
    case 'BAD_FORM': return { reason: event.message ?? 'sai tư thế', tag: 'Sai tư thế' };
    case 'COUNTED': return null;
  }
}

function toAttempt(event: RepEvent, reps: number, downBelow: number, upAbove: number): Attempt {
  const why = whyNot(event, downBelow, upAbove);
  return {
    seq: event.seq,
    rep: why ? null : reps,
    low: event.low,
    ok: !why,
    reason: why?.reason ?? null,
    tag: why?.tag ?? null,
    high: event.high ?? null,
  };
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
  const [attempts, setAttempts] = useState<Attempt[]>([]); // the set log, newest last, every attempt of the set

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
  const [historyKey, setHistoryKey] = useState(0); // bumped after a save: the history below reloads
  const [setNo, setSetNo] = useState(1); // sets saved on this page + 1, shown on the camera
  const [now, setNow] = useState(() => Date.now()); // ticks every second while the camera is on (set timer)

  const exercise = EXERCISES[exerciseId];
  const history = useWorkoutHistory(historyKey);

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
      setSetNo((n) => n + 1);
      setHistoryKey((k) => k + 1);
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
    setSetNo(1);
  }

  // Moving to another page of the app (sidebar, tabs, Back) with a set not saved: ask first.
  // beforeunload below only covers closing or reloading the browser tab.
  const blocker = useBlocker(unsaved);

  // Closing or reloading the tab with a set not saved: the browser asks first
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  // The set timer on the camera: one re-render per second, only while the camera is on
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

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
        drawer.drawConnectors(image, PoseLandmarker.POSE_CONNECTIONS, { color, lineWidth: 4 });
        drawer.drawLandmarks(image, { color: state.formMessage ? SKELETON_BAD : JOINT_DOT, radius: 4 });
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
        const attempt = toAttempt(state.event, state.reps, current.downBelow, current.upAbove);
        setAttempts((list) => [...list, attempt]); // the whole set: a few numbers per attempt
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
        startedAt: set.startedAt,
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
      {pose.kind === 'loading' ? 'Đang tải bộ nhận diện…' : 'Bật camera'}
    </Button>
  );

  const joint = exercise.jointLabel;
  const seconds = running && view.startedAt != null ? Math.max(0, Math.floor((now - view.startedAt) / 1000)) : null;
  const lastAttempt = attempts.at(-1);

  // The persistent warning at the top: the most useful one right now
  const warning = !running || view.stage === 'SETUP'
    ? null
    : !view.seen
      ? 'Chưa thấy rõ người: lùi ra xa để camera thấy cả người'
      : view.formMessage
        ? view.formMessage
        : view.formUnknown
          ? 'Chưa thấy rõ chân: chưa kiểm tra được tư thế'
          : null;

  // Set not saved: a bottom sheet on phones, a card in the middle from sm. Rendered INSIDE the stage:
  // in real fullscreen (Fullscreen API) the browser only shows the fullscreen element and its children.
  const sheet = (titleId: string, text: string, actions: ReactNode) => (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog"
      aria-modal="true" aria-labelledby={titleId}>
      <div className="grid w-full gap-4 rounded-t-[28px] bg-[#1c1e24] p-6 pb-8 text-white sm:max-w-sm sm:rounded-[28px] sm:pb-6">
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <p id={titleId} className="font-display text-3xl font-semibold">Set chưa được lưu</p>
        <p className="text-[#9ba1ae]">{text}</p>
        <div className="grid gap-2">{actions}</div>
      </div>
    </div>
  );
  const SHEET_PRIMARY = 'flex min-h-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-accent font-bold text-white disabled:opacity-60';
  const SHEET_SECONDARY = 'min-h-12 cursor-pointer rounded-full border border-white/15 font-semibold text-white disabled:opacity-60';
  const SHEET_GHOST = 'min-h-11 cursor-pointer rounded-full font-semibold text-[#9ba1ae] disabled:opacity-60';

  // Camera off with a set not saved: save it, drop it, or keep training
  const unsavedDialog = confirmStop && sheet('unsaved-title',
    `Bạn đã tập ${view.reps} rep ${exercise.label.toLowerCase()} nhưng chưa lưu. Lưu trước khi tắt camera?`, (
      <>
        <button type="button" className={SHEET_PRIMARY} disabled={saving} onClick={() => void saveSet().then((ok) => {
          setConfirmStop(false);
          if (ok) stopCamera();
        })}>
          <Save aria-hidden="true" className="size-5" /> {saving ? 'Đang lưu…' : 'Lưu rồi tắt'}
        </button>
        <button type="button" className={SHEET_SECONDARY} disabled={saving} onClick={() => {
          setConfirmStop(false);
          resetCounter();
          stopCamera();
        }}>Tắt, không lưu</button>
        <button type="button" className={SHEET_GHOST} disabled={saving} onClick={() => setConfirmStop(false)}>Tiếp tục tập</button>
      </>
    ));

  // Same choices, for leaving the page instead of turning the camera off
  const leaveDialog = blocker.state === 'blocked' && sheet('leave-title',
    `Bạn đã tập ${view.reps} rep ${exercise.label.toLowerCase()} nhưng chưa lưu. Rời trang sẽ mất set này.`, (
      <>
        <button type="button" className={SHEET_PRIMARY} disabled={saving} onClick={() => void saveSet().then((ok) => {
          if (ok) blocker.proceed();
          else blocker.reset(); // the error stays on the page
        })}>
          <Save aria-hidden="true" className="size-5" /> {saving ? 'Đang lưu…' : 'Lưu rồi đi'}
        </button>
        <button type="button" className={SHEET_SECONDARY} disabled={saving} onClick={() => blocker.proceed()}>Rời trang, không lưu</button>
        <button type="button" className={SHEET_GHOST} disabled={saving} onClick={() => blocker.reset()}>Ở lại tập tiếp</button>
      </>
    ));

  const stage = (
    <div
      ref={stageRef}
      className={focus
        ? 'fixed inset-0 z-50 bg-[#0c0d10]'
        : 'relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#0c0d10] sm:aspect-[4/3]'}
    >
      {/* Mirrored like a mirror (front camera); angles are not affected by mirroring */}
      <video ref={videoRef} playsInline muted className="absolute inset-0 size-full -scale-x-100 object-contain" />
      <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-contain" />

      {!running && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <Camera aria-hidden="true" className="size-8" />
          <p className="max-w-xs text-sm text-[#c9d2e6]">{exercise.cameraHint}</p>
          {startButton}
        </div>
      )}

      {running && (
        <>
          <CameraTopBar focus={focus} onToggleFocus={focus ? exitFocus : enterFocus}
            title={`${exercise.label}, set ${setNo}`} seconds={seconds}
            debug={showDebug} onToggleDebug={() => setShowDebug(!showDebug)} />

          {/* Top messages: a warning that stays, or the last attempt (counted or not) for a moment */}
          <div className="pointer-events-none absolute inset-x-3 top-[4.5rem] flex flex-col items-center gap-2 sm:inset-x-4">
            {warning ? (
              <WarningBanner>{warning}</WarningBanner>
            ) : lastAttempt && view.event?.seq === lastAttempt.seq && (
              lastAttempt.ok
                ? <RepToast key={lastAttempt.seq}>Rep {lastAttempt.rep} hợp lệ{lastAttempt.low != null && `, ${joint} ${lastAttempt.low}°`}</RepToast>
                : <WarningBanner key={lastAttempt.seq} fading>Không tính rep: {lastAttempt.reason}</WarningBanner>
            )}
            {view.debug && (
              <p className="max-w-full rounded-xl bg-black/70 px-3 py-2 font-mono text-xs text-white">{view.debug}</p>
            )}
          </div>

          {/* Depth bar on the right while counting */}
          {view.stage !== 'SETUP' && (
            <div className="pointer-events-none absolute top-1/4 right-5 bottom-[38%] sm:right-6">
              <DepthMeter angle={view.angle} downBelow={exercise.downBelow} bad={view.formMessage != null} />
            </div>
          )}

          {/* Desktop fullscreen: the set log stays visible on the right */}
          {focus && attempts.length > 0 && (
            <div className="absolute top-20 right-6 hidden w-72 rounded-[22px] bg-black/72 p-4 text-white lg:block">
              <p className="mb-3 font-semibold">Nhật ký set</p>
              <SetLog attempts={attempts} joint={joint} onCamera max={6} />
            </div>
          )}

          <div className={`absolute inset-x-3 bottom-3 grid gap-4 sm:inset-x-4 sm:bottom-5 ${focus ? 'mx-auto max-w-xl' : ''}`}>
            {view.stage === 'SETUP' ? (
              <SetupPanel message={view.setupMessage ?? exercise.setupHint} hold={view.hold} />
            ) : (
              <div className="pointer-events-none">
                <RepBlock reps={view.reps} stage={view.stage} phase={view.phase} big={focus} />
              </div>
            )}
            {focus && (
              <CameraControls reps={view.reps} saving={saving} onReset={confirmReset}
                onSave={() => void saveSet()} onStop={requestStop} />
            )}
          </div>
        </>
      )}

      {unsavedDialog}
      {leaveDialog}
    </div>
  );

  // Phones: one column in reading order (exercise, camera, set log, history, calendar).
  // lg: camera + history on the left, exercise + set log + calendar on the right. The column
  // wrappers are display: contents on phones, so `order` places the cards in one list.
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="contents lg:grid lg:min-w-0 lg:gap-5">
        <Card className="order-2 min-w-0 p-3 sm:p-4">
          {stage}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {running ? (
              <>
                <Button onClick={() => void saveSet()} disabled={!unsaved || saving}>
                  <Save aria-hidden="true" className="size-4" />
                  {saving ? 'Đang lưu…' : unsaved ? `Lưu set ${view.reps} rep` : 'Lưu set'}
                </Button>
                <Button variant="secondary" onClick={requestStop}>
                  <CameraOff aria-hidden="true" className="size-4" /> Tắt camera
                </Button>
              </>
            ) : (
              <>
                {startButton}
                {unsaved && (
                  <Button variant="secondary" onClick={() => void saveSet()} disabled={saving}>
                    <Save aria-hidden="true" className="size-4" /> {saving ? 'Đang lưu…' : `Lưu set ${view.reps} rep`}
                  </Button>
                )}
              </>
            )}
            <Button variant="ghost" onClick={confirmReset} disabled={view.reps === 0}>
              <RotateCcw aria-hidden="true" className="size-4" /> Đếm lại
            </Button>
          </div>
          {saveNote && (
            <p className={`mt-2 text-sm ${saveNote.ok ? 'text-good' : 'text-danger'}`} role="status">{saveNote.text}</p>
          )}
          <p className="mt-2 text-xs text-muted">Video chỉ xử lý trên máy của bạn, không gửi lên máy chủ.</p>
        </Card>

        <div className="order-4 min-w-0">
          <WorkoutHistoryCard history={history} />
        </div>
      </div>

      <div className="contents lg:grid lg:min-w-0 lg:gap-5">
        {error && <div className="order-0"><Alert type="error">{error}</Alert></div>}
        {pose.kind === 'error' && (
          <div className="order-0"><Alert type="error">Không tải được bộ nhận diện tư thế. Hãy tải lại trang.</Alert></div>
        )}

        <Card title="Bài tập" className="order-1">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Chọn bài tập">
            {EXERCISE_IDS.map((id) => (
              <Chip key={id} selected={id === exerciseId} onClick={() => chooseExercise(id)}>
                {EXERCISES[id].label}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">{exercise.cameraHint}</p>
        </Card>

        <div className="order-3 min-w-0">
          <SetLogCard attempts={attempts} reps={view.reps} joint={joint} downBelow={exercise.downBelow}
            title={`${exercise.label}, set ${setNo}`} live={running && view.stage !== 'SETUP'} />
        </div>

        <div className="order-5 min-w-0">
          <WorkoutCalendarCard history={history} />
        </div>
      </div>
    </div>
  );
}
