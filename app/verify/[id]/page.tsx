import FaceDetection from '@/components/proctoring/face-detection';
import { getTodayString } from '@/lib/utils';
import * as React from 'react';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const _params = await params;

  return <FaceDetection id={_params.id} />;
}
