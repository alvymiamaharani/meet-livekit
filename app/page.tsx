'use client';

import { useRouter } from 'next/navigation';
import { generateRoomId } from '@/lib/client-utils';
import Image from 'next/image';
import { Video } from 'lucide-react';

export default function Page() {
  const router = useRouter();

  const startMeeting = () => {
    router.push(`/rooms/${generateRoomId()}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-800 overflow-hidden relative">
      {/* Background Decorations */}
      <div className="absolute inset-0 bg-grid-gray-200/40 bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute top-0 left-0 w-80 h-80 bg-red-100 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-red-200 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 text-center space-y-6 max-w-3xl px-4 w-full h-full flex flex-col justify-center items-center">
        {/* Logo */}
        <div className="mb-4">
          <Image
            src="/logo_alpha_resized.png"
            alt="Tim Alpha Logo"
            width={100}
            height={100}
            className="mx-auto drop-shadow-md"
          />
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-red-600">
          Demo Platform Video Conference
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
          Aplikasi video conference untuk keperluan ujian daring dan presentasi, dikembangkan oleh
          Tim Alpha Unair dengan teknologi LiveKit dan Next.js.
        </p>

        {/* Start Meeting Button */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={startMeeting}
            className="cursor-pointer w-48 h-12 rounded-md bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow"
          >
            <Video className="w-4 h-4" />
            Mulai Meeting
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 text-gray-400 text-sm">
          <p className="mb-1">Platform versi demo untuk konferensi video</p>
          <p>© 2025 Tim Alpha Unair</p>
        </div>
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        .bg-grid-gray-200\/40 {
          background-image:
            linear-gradient(rgba(229, 231, 235, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(229, 231, 235, 0.4) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}
