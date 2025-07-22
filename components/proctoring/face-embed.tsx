'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as vision from '@mediapipe/tasks-vision';
import { ImageEmbedder, FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import { toast } from 'react-toastify';
import { doc, getDoc } from 'firebase/firestore';
import { ref, update } from 'firebase/database';
import { db, rtdb } from '@/lib/firebase';

interface Props {
  roomName: string;
  today: string;
}

const THRESHOLD = 0.4;
const HOLD_DURATION = 1500;

export default function FaceEmbedLive({ roomName, today }: Props) {
  const webcamRef = useRef<Webcam>(null);
  const [refImg, setRefImg] = useState<string | null>(null);
  const [refEmbed, setRefEmbed] = useState<vision.Embedding | null>(null);
  const [similarity, setSimilarity] = useState<number>(0);
  const [detector, setDetector] = useState<vision.FaceDetector | null>(null);
  const [embedder, setEmbedder] = useState<vision.ImageEmbedder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const uploadToCloudinary = async (dataUrl: string): Promise<string> => {
    const file = dataURLtoFile(dataUrl, 'verified.jpg');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    const json = await res.json();
    return json.secure_url as string;
  };

  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const fs = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm',
        );

        const fd = await FaceDetector.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath: '/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'IMAGE',
        });
        setDetector(fd);

        const ie = await ImageEmbedder.createFromOptions(fs, {
          baseOptions: { modelAssetPath: '/mobilenet_v3_small.tflite' },
          runningMode: 'IMAGE',
        });
        setEmbedder(ie);
      } catch (e) {
        console.error(e);
        setError('Gagal inisialisasi engine');
      }
    })();
  }, []);

  useEffect(() => {
    if (!detector || !embedder) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', roomName));
        const url = snap.data()?.photoUrl;
        if (!url) throw new Error('Foto referensi tidak ada');

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        await new Promise((r) => (img.onload = r));

        const dets = detector.detect(img).detections;
        if (!dets?.length) throw new Error('Tidak ada wajah di referensi');

        const best = dets.reduce((a, b) => (b.categories[0].score > a.categories[0].score ? b : a));
        if (!best.boundingBox) throw new Error('Bounding box tidak ditemukan');
        const { originX, originY, width, height } = best.boundingBox;
        const cvs = document.createElement('canvas');
        cvs.width = width;
        cvs.height = height;
        const ctx = cvs.getContext('2d')!;
        ctx.drawImage(img, originX, originY, width, height, 0, 0, width, height);
        const dataUrl = cvs.toDataURL('image/jpeg');
        setRefImg(dataUrl);

        const embed = await embedder.embed(await toImg(dataUrl));
        setRefEmbed(embed.embeddings[0]);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Gagal muat referensi');
      }
    })();
  }, [roomName, detector, embedder]);

  useEffect(() => {
    if (!detector || !embedder || !refEmbed || done) return;

    const interval = setInterval(async () => {
      const cam = webcamRef.current;
      if (!cam) return;

      const src = cam.getScreenshot();
      if (!src) return;

      try {
        const img = await toImg(src);
        const dets = detector.detect(img).detections;
        if (!dets?.length) return;

        const best = dets.reduce((a, b) => (b.categories[0].score > a.categories[0].score ? b : a));
        if (!best.boundingBox) throw new Error('Bounding box tidak ditemukan');
        const { originX, originY, width, height } = best.boundingBox;
        const cvs = document.createElement('canvas');
        cvs.width = width;
        cvs.height = height;
        const ctx = cvs.getContext('2d')!;
        ctx.drawImage(img, originX, originY, width, height, 0, 0, width, height);

        const emb = await embedder.embed(await toImg(cvs.toDataURL()));
        const sim = vision.ImageEmbedder.cosineSimilarity(refEmbed, emb.embeddings[0]);
        setSimilarity(sim);

        if (sim >= THRESHOLD) {
          if (!holdTimer.current) {
            holdTimer.current = setTimeout(async () => {
              const url = await uploadToCloudinary(cvs.toDataURL());
              await update(ref(rtdb, `test-monitoring/${today}-${roomName}`), {
                isVerified: true,
                newPhotoUrl: url,
              });
              toast.success('Verifikasi wajah berhasil!');
              setDone(true);
            }, HOLD_DURATION);
          }
        } else {
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
        }
      } catch (e) {
        /* silent - frame gagal diproses */
      }
    }, 250); // 4 FPS cukup smooth

    return () => {
      clearInterval(interval);
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, [detector, embedder, refEmbed, done, roomName, today]);

  const toImg = (src: string) =>
    new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });

  if (error)
    return (
      <div className="text-center text-red-600 p-4">
        <b>Error:</b> {error}
      </div>
    );

  return (
    <div className="bg-white flex flex-col items-center justify-center">
      {/* Webcam container dengan posisi relatif */}
      <div className="relative w-full max-w-2xl aspect-[16/10] bg-gray-100 border-[3px] rounded-xl overflow-hidden shadow-lg">
        {/* Webcam Live Feed */}
        <Webcam
          mirrored
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user' }}
          className="w-full h-full object-cover"
        />

        {/* Foto referensi melayang di dalam webcam */}
        <div className="absolute top-4 left-4 z-10">
          {/* Foto Referensi Box */}
          <div className="w-24 h-24 border-[3px] border-gray-100 rounded-lg shadow-md overflow-hidden">
            {refImg ? (
              <img src={refImg} alt="Referensi" className="w-full h-full object-cover" />
            ) : (
              <span className="loading loading-spinner text-red-600 flex items-center justify-center w-full h-full" />
            )}
          </div>

          {/* Label di bawah foto, tidak overlap */}
          <div className="mt-1 bg-gray-100 text-black text-[10px] font-semibold px-1.5 py-0.5 rounded w-full text-center shadow-sm">
            Foto Referensi
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl pt-4">
        {done ? (
          <div className="text-green-700 font-semibold bg-green-100 border border-green-400 rounded px-4 py-2 inline-block">
            Verifikasi wajah berhasil
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-start text-red-800 mb-2 uppercase tracking-wide">
              {`Tingkat Kemiripan : ${Math.round(similarity * 100)}%`}
            </p>
            <div className="w-full h-3 bg-neutral-200 rounded overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-300 ease-in-out"
                style={{ width: `${Math.round(similarity * 100)}%` }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
