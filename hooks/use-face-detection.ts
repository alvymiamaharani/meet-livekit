import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Howl } from 'howler';
import { getDoc, setDoc, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db, rtdb } from '@/lib/firebase';
import { getTodayString } from '@/lib/utils';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const noFaceAudio = new Howl({ src: ['/notifications/noFace.mp3'] });
const multipleFaceAudio = new Howl({ src: ['/notifications/multipleFace.mp3'] });

export function useFaceDetection(id: string, webcamRef: any, canvasRef: any) {
  const today = getTodayString();

  const faceDetectorRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const noFaceTimerRef = useRef<any>(null);
  const noFaceCooldownRef = useRef(false);
  const multipleFaceCooldownRef = useRef(false);

  const [faceCount, setFaceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 🎯 Firestore logging
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

  // ✅ Init model
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

  // 🔁 Run detection every 500ms
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

  // 📷 Main detection
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

      if (detections.length === 0) {
        if (!noFaceTimerRef.current) {
          noFaceTimerRef.current = setTimeout(() => {
            if (!noFaceCooldownRef.current) {
              toast.warning('Wajah tidak terdeteksi!');
              noFaceAudio.play();
              logToFirestore({ message: 'Wajah tidak terdeteksi', timestamp });

              noFaceCooldownRef.current = true;
              setTimeout(() => (noFaceCooldownRef.current = false), 10_000);
            }
          }, 2000);
        }
      } else {
        if (noFaceTimerRef.current) {
          clearTimeout(noFaceTimerRef.current);
          noFaceTimerRef.current = null;
        }
      }

      if (detections.length > 1 && !multipleFaceCooldownRef.current) {
        toast.warning(`Terdeteksi ${detections.length} wajah!`);
        multipleFaceAudio.play();
        logToFirestore({
          message: `Lebih dari 1 wajah terdeteksi (${detections.length})`,
          timestamp,
        });

        multipleFaceCooldownRef.current = true;
        setTimeout(() => (multipleFaceCooldownRef.current = false), 10_000);
      }
    } catch (err) {
      console.error('Detection error:', err);
      toast.error('Terjadi kesalahan saat deteksi wajah.');
    }
  };

  return {
    faceCount,
    isLoading,
  };
}
