'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { ArrowLeft, CirclePlay } from 'lucide-react';
import Link from 'next/link';
// import { rtdb } from '@/lib/firebase';
// import { ref, onValue } from 'firebase/database';

export default function VideoPlayerPage() {
  const params = useParams();
  const roomName = params.roomName as string;

  const videoUrl = '/videos/sample-1.mp4';
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);

  // useEffect(() => {
  //   const urlRef = ref(rtdb, 'videos/url-1');
  //   const unsubscribe = onValue(
  //     urlRef,
  //     (snap) => {
  //       const url = snap.val();
  //       if (url) {
  //         setVideoUrl(url);
  //       } else {
  //         setError('Video belum tersedia');
  //       }
  //       setLoading(false);
  //     },
  //     (err) => {
  //       console.error(err);
  //       setError('Gagal memuat video');
  //       setLoading(false);
  //     },
  //   );
  //   return unsubscribe;
  // }, []);

  // if (loading)
  //   return (
  //     <div className="min-h-screen bg-white flex items-center justify-center">
  //       <div className="text-red-600">Loading…</div>
  //     </div>
  //   );

  // if (error || !videoUrl)
  //   return (
  //     <div className="min-h-screen bg-white flex flex-col items-center justify-center">
  //       <div className="text-red-600 text-xl mb-4">{error}</div>
  //       <Link
  //         href={`/rooms/${roomName}`}
  //         className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
  //       >
  //         <ArrowLeft className="w-5 h-5" />
  //         <span>Kembali ke Meeting</span>
  //       </Link>
  //     </div>
  //   );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white p-4 flex items-center justify-between">
        <Link
          href={`/rooms/${roomName}`}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali ke Meeting</span>
        </Link>
        <h1 className="text-red-600 font-semibold">Room: {roomName}</h1>
      </header>

      {/* Player */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="w-full relative min-h-screen flex justify-center">
            <VideoPlayer videoUrl={videoUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  return (
    <div className="absolute top-0 w-full max-w-xl mx-auto">
      <ReactPlayer
        ref={playerRef}
        src={videoUrl}
        width="100%"
        height="100%"
        playing={isPlaying}
        controls
        playsInline
      />
      {!isPlaying && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black hover:bg-black transition"
        >
          <span className="mb-4 text-white text-lg font-medium animate-pulse">
            Klik untuk mulai menonton
          </span>
          <CirclePlay size={64} className="text-white drop-shadow-xl" />
        </button>
      )}
    </div>
  );
}
