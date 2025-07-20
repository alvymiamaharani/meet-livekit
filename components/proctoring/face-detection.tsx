'use client';

import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { toast } from 'react-toastify';
import { db, rtdb } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Howl } from 'howler';
import { off, onValue, ref, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { getTodayString } from '@/lib/utils';

interface Props {
  id: string;
}

const noFaceAudio = new Howl({ src: ['/noFace.mp3'] });
const multipleFaceAudio = new Howl({ src: ['/multipleFace.mp3'] });

export default function FaceDetection({ id }: Props) {
  const router = useRouter();
  const today = getTodayString();

  const webcamRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const faceDetectorRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const noFaceTimerRef = useRef<any>(null);
  const noFaceCooldownRef = useRef<any>(false);
  const multipleFaceCooldownRef = useRef<any>(false);

  const [faceCount, setFaceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [realtimeData, setRealtimeData] = useState({
    isVerified: false,
  });

  // RTDB listener
  useEffect(() => {
    const path = `test-monitoring/${today}-${id}`;
    const dataRef = ref(rtdb, path);

    onValue(dataRef, (snapshot) => {
      const data = snapshot.val();
      setRealtimeData({
        isVerified: data?.isVerified || false,
      });
    });

    return () => off(dataRef);
  }, []);

  useEffect(() => {
    const initializeDetector = async () => {
      try {
        setIsLoading(true);

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        faceDetectorRef.current = await FaceDetector.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: '/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Model initialization error:', err);
        setIsLoading(false);
        toast.error('Gagal memuat model deteksi wajah.');
      }
    };

    initializeDetector();

    return () => {
      clearInterval(intervalRef.current);
      if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && webcamRef.current) {
      intervalRef.current = setInterval(detectFaces, 500);
    }
    return () => {
      clearInterval(intervalRef.current);
      if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const logToFirestore = async (logEntry: unknown) => {
    const logDocRef = doc(db, `TESTING-LOG-PELANGGARAN/${id}`);

    try {
      const docSnap = await getDoc(logDocRef);
      if (!docSnap.exists()) {
        await setDoc(logDocRef, { entries: [] });
      }
      await updateDoc(logDocRef, {
        entries: arrayUnion(logEntry),
      });
    } catch (error) {
      console.error('Error logging to Firestore:', error);
      toast.error('Gagal menyimpan peringatan ke database.');
    }
  };

  const handleVerify = async () => {
    const path = `test-monitoring/${today}-${id}`;
    update(ref(rtdb, path), {
      isVerified: true,
    });
  };

  const detectFaces = async () => {
    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    if (!video || !canvas || !faceDetectorRef.current || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    const detector = faceDetectorRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const results = await detector.detectForVideo(video, performance.now());
      const detections = results.detections;

      setFaceCount(detections.length);

      const timestamp = new Date().getTime();

      // 🚨 No face
      if (detections.length === 0) {
        if (!noFaceTimerRef.current) {
          noFaceTimerRef.current = setTimeout(() => {
            if (!noFaceCooldownRef.current) {
              toast.warning('Wajah tidak terdeteksi! Pastikan terlihat kamera.');
              noFaceAudio.play();
              logToFirestore({
                message: 'Wajah tidak terdeteksi',
                timestamp,
              });

              // Set cooldown selama 10 detik
              noFaceCooldownRef.current = true;
              setTimeout(() => {
                noFaceCooldownRef.current = false;
              }, 10_000);
            }
          }, 2000);
        }
      } else {
        if (noFaceTimerRef.current) {
          clearTimeout(noFaceTimerRef.current);
          noFaceTimerRef.current = null;
        }
      }

      // 🚨 Multiple face
      if (detections.length > 1 && !multipleFaceCooldownRef.current) {
        toast.warning(`Terdeteksi lebih dari satu wajah (${detections.length})!`);
        multipleFaceAudio.play();
        logToFirestore({
          message: `Lebih dari 1 wajah terdeteksi (${detections.length})`,
          timestamp,
        });

        // Set cooldown selama 10 detik
        multipleFaceCooldownRef.current = true;
        setTimeout(() => {
          multipleFaceCooldownRef.current = false;
        }, 10_000);
      }
    } catch (err) {
      console.error('Detection error:', err);
      toast.error('Terjadi kesalahan dalam deteksi wajah.');
    }
  };

  useEffect(() => {
    if (!realtimeData.isVerified) return;

    router.push(`/rooms/${id}`);
  }, [realtimeData, id]);

  if (isLoading) {
    return (
      <div className="w-full max-w-[100ch] mx-auto px-4 md:px-0 py-10">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="skeleton w-full aspect-[16/10]"></div>
          <div className="skeleton w-full aspect-[16/10]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 sm:p-6 md:p-8 text-black">
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="relative aspect-video rounded-xl overflow-hidden">
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user' }}
              className="w-full h-full object-cover"
              onUserMediaError={(error) => {
                console.log({ error });
                toast.error('Gagal mengakses webcam. Pastikan izin kamera diberikan.');
              }}
            />
            <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
          </div>

          <div className="mt-4 text-sm text-center">
            <strong>Jumlah Wajah: {faceCount}</strong>
          </div>
          <button
            onClick={handleVerify}
            className="btn btn-success py-3 bg-red-600 hover:bg-red-600 text-white border-red-700"
          >
            Verifikasi
          </button>
        </div>
      </div>
    </div>
  );
}
