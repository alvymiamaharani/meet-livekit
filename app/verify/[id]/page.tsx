import { getTodayString } from '@/lib/utils';
import FaceEmbedLive from '@/components/proctoring/face-embed'; // real-time face
import GestureRecognition from '@/components/proctoring/gesture-recognition'; // hand gesture
import { rtdb } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const today = getTodayString(); // "2025-07-22"

  // 1️⃣  Read from RTDB
  const snap = await get(ref(rtdb, `test-monitoring/${today}-${id}/isVerified`));
  const isVerified = snap.val() === true;

  // 2️⃣  Conditional render
  return (
    <div className="min-h-screen bg-white p-4">
      <h1 className="py-4 text-3xl font-bold text-center text-red-600 mb-6">
        {isVerified ? 'Verifikasi Gestur Tangan' : 'Verifikasi Identitas'}
      </h1>

      {isVerified ? (
        // Hand-gesture stage
        <GestureRecognition roomName={id} today={today} />
      ) : (
        // Face-verification stage
        <FaceEmbedLive roomName={id} today={today} />
      )}
    </div>
  );
}
