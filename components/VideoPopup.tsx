'use client';

import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { CirclePlay, UserRoundCheck } from 'lucide-react';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { getTodayString } from '@/lib/utils';

export default function VideoPopup({ roomName }: { roomName: string }) {
  const [show, setShow] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);
  const today = getTodayString();

  useEffect(() => {
    const videoRef = ref(rtdb, `test-monitoring/${today}-${roomName}/showVideo`);

    const unsub = onValue(videoRef, (snapshot) => {
      const val = snapshot.val();
      if (val === true) {
        setShow(true);
        // otomatis set false agar hanya muncul sekali
        set(videoRef, false).catch(console.error);
      }
    });

    return () => unsub();
  }, [roomName]);

  const handlePlay = () => setIsPlaying(true);
  const handleClose = () => setShow(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="w-full h-screen max-w-4xl flex flex-col px-4 py-6 overflow-y-auto">
        {/* Judul */}
        <h2 className="text-xl md:text-2xl font-semibold text-center text-red-600 mb-4">
          Video Penjelasan & Tutorial Ujian
        </h2>

        {/* Video Player */}
        <div className="relative mx-auto aspect-video bg-black rounded-lg overflow-hidden">
          <ReactPlayer
            ref={playerRef}
            src="/videos/sample-1.mp4"
            width="100%"
            height="100%"
            playing={isPlaying}
            controls
          />
          {!isPlaying && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex flex-col items-center justify-center hover:bg-black/80 transition"
            >
              <span className="text-white mb-4 animate-pulse">Klik untuk mulai menonton</span>
              <CirclePlay size={64} className="text-white" />
            </button>
          )}
        </div>

        {/* Penjelasan tambahan */}
        <p className="text-center text-gray-700 text-sm md:text-base mt-6">
          Dengan menekan tombol di bawah, Anda menyatakan telah memahami isi video ini dan siap
          untuk mengikuti ujian. Silakan klik tombol tersebut untuk memulai ujian di platform{' '}
          <strong>ALPHA Exam</strong>.
        </p>

        {/* Tombol tutup */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition"
          >
            <UserRoundCheck size={20} className="text-white" />
            Saya sudah paham, kembali ke ruang ujian
          </button>
        </div>
      </div>
    </div>
  );
}
