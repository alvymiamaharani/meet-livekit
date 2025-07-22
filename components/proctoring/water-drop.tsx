'use client';

import { useFaceDetection } from '@/hooks/use-face-detection';
import { useProctoringState } from '@/store/proctoring';
import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export default function WaterDropWebcam({ id }: { id: string }) {
  const isHydrated = useProctoringState((state) => state.isHydrated);
  const isStartProctoring = useProctoringState((state) => state.isStartProctoring);

  if (!isHydrated || !isStartProctoring) return <></>;
  return <AiProctoring id={id} />;
}

function AiProctoring({ id }: { id: string }) {
  const webcamRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const { isLoading } = useFaceDetection(id, webcamRef, canvasRef);

  if (isLoading) return <></>;

  return (
    <div className="fixed top-0 left-1/2 z-50 -translate-x-1/2 pt-1.5">
      <div className="relative aspect-[16/10] h-16 bg-black rounded-b shadow-lg overflow-hidden border-2 border-white">
        <Webcam
          mirrored
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: 'user' }}
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
      </div>
    </div>
  );
}
