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
  const lastVideoTimeRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);

  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWebcamRunning, setIsWebcamRunning] = useState(false);

  const indexQuestionRef = useRef(0);
  const [questions, setQuestions] = useState<typeof labelAndImages>([]);
  const [completed, setCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Init recognizer
  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm',
        );
        const rec = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/gesture_recognizer.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
        });
        setRecognizer(rec);
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

  // Timer
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

  // Predict gesture loop
  const predict = useCallback(() => {
    if (!recognizer || !webcamRef.current || !isWebcamRunning || completed) return;
    const video = webcamRef.current.video;
    if (!video) return;

    const now = Date.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;

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
      } catch (err) {
        console.error(err);
      }
    }
    animationFrameRef.current = requestAnimationFrame(predict);
  }, [recognizer, isWebcamRunning, completed, questions]);

  useEffect(() => {
    if (isWebcamRunning && !completed) {
      animationFrameRef.current = requestAnimationFrame(predict);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isWebcamRunning, completed, predict]);

  // Auto start webcam after 3s
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (recognizer && !isWebcamRunning) {
        setIsWebcamRunning(true);
        setStartTime(Date.now());
        setCurrentTime(0);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [recognizer]);

  // Write to RTDB
  useEffect(() => {
    if (completed) {
      update(ref(rtdb, `test-monitoring/${today}-${roomName}`), {
        handGesture: true,
      });
    }
  }, [completed, roomName, today]);

  // UI loading or error
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
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="flex flex-col justify-center items-center gap-4">
        {/* Webcam */}
        <div className="relative w-full max-w-2xl aspect-[16/10] bg-gray-100 border-[3px] rounded-xl overflow-hidden shadow-lg">
          <Webcam
            mirrored
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: 'user' }}
            className="w-full h-full object-cover"
          />
          {/* Gesture image top-left */}
          {isWebcamRunning && !completed && (
            <div className="absolute top-4 left-4 w-20 h-20 border border-gray-300 bg-white rounded shadow flex items-center justify-center">
              <img
                src={questions[indexQuestionRef.current]?.image}
                alt="gesture"
                className="w-full h-full object-contain p-1"
              />
            </div>
          )}
        </div>

        {/* Instruction below webcam */}
        <div className="mt-4 text-center">
          {completed ? (
            <div className="text-green-700 font-semibold bg-green-100 border border-green-400 rounded px-4 py-2 inline-block">
              Semua gestur berhasil dikenali! Verifikasi selesai.
            </div>
          ) : isWebcamRunning ? (
            <p className="text-sm text-red-700 font-medium">
              <strong>Instruksi:</strong> Ikuti gesture di kiri atas video webcam untuk proses
              verifikasi.
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">Menyiapkan verifikasi gestur tangan...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GestureRecognition;
