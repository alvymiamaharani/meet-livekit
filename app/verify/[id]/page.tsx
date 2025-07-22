'use client';

import { useEffect, useState } from 'react';
import { getTodayString } from '@/lib/utils';
import FaceEmbedLive from '@/components/proctoring/face-embed';
import GestureRecognition from '@/components/proctoring/gesture-recognition';
import { rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useParams, useRouter } from 'next/navigation';

export default function Page() {
  const params = useParams();
  const id = String(params.id || '');
  const today = getTodayString();
  const router = useRouter();

  const [faceVerified, setFaceVerified] = useState(false);
  const [gestureVerified, setGestureVerified] = useState(false);

  // 🔁 Listener for faceVerified
  useEffect(() => {
    const faceRef = ref(rtdb, `test-monitoring/${today}-${id}/isVerified`);
    const unsub = onValue(faceRef, (snap) => {
      setFaceVerified(snap.val() === true);
    });
    return () => unsub();
  }, [id, today]);

  // 🔁 Listener for gestureVerified
  useEffect(() => {
    const gestureRef = ref(rtdb, `test-monitoring/${today}-${id}/handGesture`);
    const unsub = onValue(gestureRef, (snap) => {
      setGestureVerified(snap.val() === true);
    });
    return () => unsub();
  }, [id, today]);

  // ✅ Navigate when both are verified
  useEffect(() => {
    if (faceVerified && gestureVerified) {
      router.push(`/rooms/${id}`);
    }
  }, [faceVerified, gestureVerified, id, router]);

  // 👤 Face verification first
  return (
    <div className="min-h-screen bg-white px-4 py-8 space-y-8">
      <h1 className="text-3xl font-bold text-center text-black">
        {faceVerified ? 'Verifikasi Gestur Tangan' : 'Verifikasi Identitas'}
      </h1>

      {faceVerified ? (
        <GestureRecognition roomName={id} today={today} />
      ) : (
        <FaceEmbedLive roomName={id} today={today} />
      )}
    </div>
  );
}
