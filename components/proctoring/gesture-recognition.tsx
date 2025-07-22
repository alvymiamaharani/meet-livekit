// components/gesture-recognition.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';
import { toast } from 'react-toastify';
import { ref, update } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

interface Props {
  roomName: string;
  today: string; // YYYY-MM-DD
}

const labelAndImages = [
  { name: 'closed_fist', image: '/assets/closed_fist.png' },
  { name: 'open_palm', image: '/assets/open_palm.png' },
  { name: 'pointing_up', image: '/assets/pointing_up.png' },
  { name: 'thumb_up', image: '/assets/thumb_up.png' },
  { name: 'thumb_down', image: '/assets/thumb_down.png' },
  { name: 'victory', image: '/assets/victory.png' },
];

const GestureRecognition: React.FC<Props> = ({ roomName, today }) => {
  const webcamRef = useRef<Webcam>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);
  const [lastVideoTime, setLastVideoTime] = useState(-1);

  const indexQuestionRef = useRef(0);
  const [questions, setQuestions] = useState<typeof labelAndImages>([]);
  const [completed, setCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  /* ---------- Init GestureRecognizer ---------- */
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
        );
        const rec = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
        });
        setRecognizer(rec);

        // Pick 5 random gestures
        const shuffled = [...labelAndImages].sort(() => 0.5 - Math.random());
        setQuestions(shuffled.slice(0, 5));
      } catch (e) {
        console.error(e);
        setError('Gagal memuat model gestur');
      } finally {
        setIsLoading(false);
      }
    };
    init();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  /* ---------- Timer ---------- */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWebcamRunning && !completed && startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setCurrentTime(elapsed >= 0 ? elapsed : 0);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWebcamRunning, completed, startTime]);

  /* ---------- Format MM:SS ---------- */
  const formatTime = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  /* ---------- Predict loop ---------- */
  const predict = useCallback(() => {
    if (!recognizer || !webcamRef.current || !isWebcamRunning || completed) return;
    const video = webcamRef.current.video;
    if (!video) return;

    const now = Date.now();
    if (video.currentTime !== lastVideoTime) {
      setLastVideoTime(video.currentTime);
      try {
        const res = recognizer.recognizeForVideo(video, now);
        if (res.gestures.length > 0) {
          const name = res.gestures[0][0].categoryName.toLowerCase();
          if (name === questions[indexQuestionRef.current]?.name) {
            toast.success('Benar!');
            if (indexQuestionRef.current + 1 < questions.length) {
              indexQuestionRef.current += 1;
            } else {
              setCompleted(true);
              setIsWebcamRunning(false);
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    animationFrameRef.current = requestAnimationFrame(predict);
  }, [recognizer, isWebcamRunning, completed, lastVideoTime, questions]);

  useEffect(() => {
    if (isWebcamRunning && !completed) predict();
    else if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isWebcamRunning, completed, predict]);

  /* ---------- Toggle webcam ---------- */
  const toggleWebcam = () => {
    if (!recognizer) {
      toast.warn('Model belum siap');
      return;
    }
    if (isWebcamRunning) {
      setIsWebcamRunning(false);
      setStartTime(null);
      setCurrentTime(0);
    } else {
      setIsWebcamRunning(true);
      setStartTime(Date.now());
      setCurrentTime(0);
    }
  };

  /* ---------- Restart quiz ---------- */
  const restart = () => {
    setIsWebcamRunning(false);
    setCompleted(false);
    setStartTime(null);
    setCurrentTime(0);
    indexQuestionRef.current = 0;
    const shuffled = [...labelAndImages].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, 5));
  };

  /* ---------- Write RTDB on completion ---------- */
  useEffect(() => {
    if (completed) {
      update(ref(rtdb, `test-monitoring/${today}-${roomName}`), {
        handGesture: true,
      });
    }
  }, [completed, roomName, today]);

  /* ---------- Render ---------- */
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-red-600" />
      </div>
    );

  if (error)
    return (
      <div className="text-center text-red-600 p-4">
        <b>Error:</b> {error}
      </div>
    );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Webcam */}
        <div className="card shadow-md border border-red-200">
          <div className="card-body p-4">
            <h2 className="card-title text-red-700 text-sm">Kamera</h2>
            <Webcam
              mirrored
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="rounded w-full aspect-video object-cover"
            />
            {completed ? (
              <button
                onClick={restart}
                className="btn btn-primary bg-red-600 border-red-600 w-full mt-2"
              >
                Mulai Ulang
              </button>
            ) : (
              <button
                disabled={isWebcamRunning}
                onClick={toggleWebcam}
                className={`btn w-full mt-2 ${isWebcamRunning ? 'btn-disabled text-gray-600' : 'btn-success text-white bg-red-600 border-red-600 hover:bg-red-700'}`}
              >
                {isWebcamRunning ? 'Sedang Berlangsung...' : 'Mulai Verifikasi'}
              </button>
            )}
          </div>
        </div>

        {/* Instructions / Progress */}
        <div className="card shadow-md border border-red-200">
          <div className="card-body p-4">
            {(isWebcamRunning || completed) && (
              <div className="mb-4">
                <div className="stats shadow w-full">
                  <div className="stat">
                    <div className="stat-title text-red-600">Waktu</div>
                    <div className="stat-value text-red-600 text-2xl">
                      {formatTime(currentTime)}
                    </div>
                    <div className="stat-desc">{completed ? 'Selesai' : 'Berlangsung'}</div>
                  </div>
                </div>
              </div>
            )}

            {isWebcamRunning && !completed && (
              <div className="text-center">
                <p className="text-lg font-semibold text-red-600 mb-2">
                  Buat gestur seperti ini ({indexQuestionRef.current + 1}/{questions.length}):
                </p>
                <img
                  src={questions[indexQuestionRef.current]?.image}
                  alt="gesture"
                  className="w-32 h-32 mx-auto mb-2"
                />
                <span className="badge badge-lg badge-primary">
                  {questions[indexQuestionRef.current]?.name}
                </span>
              </div>
            )}

            {completed && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                <span>Semua gestur berhasil! Verifikasi selesai.</span>
              </div>
            )}

            {!isWebcamRunning && !completed && (
              <div className="text-center py-6">
                <h3 className="text-lg font-semibold mt-2 text-red-700">Instruksi</h3>
                <p className="text-sm mt-1 text-gray-600">
                  Klik “Mulai Verifikasi”
                  <br />
                  lalu ikuti 5 gestur tangan yang muncul secara acak.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestureRecognition;
