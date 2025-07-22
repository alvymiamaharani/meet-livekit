'use client';

import { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { CirclePlay, X } from 'lucide-react';
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
      <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden">
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
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-white hover:text-red-500 transition"
        >
          <X size={28} />
        </button>
      </div>
    </div>
  );
}
