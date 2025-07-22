import { rtdb } from '@/lib/firebase';
import { getTodayString } from '@/lib/utils';
import { useProctoringState } from '@/store/proctoring';
import { useRoomContext } from '@livekit/components-react';
import { ref, update } from 'firebase/database';
import { useParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function useAutoRecord(roomName: string) {
  const room = useRoomContext();
  const isRecordingRef = useRef(false);
  const params = useParams();
  const isStartProctoring = useProctoringState((state) => state.isStartProctoring);
  const setStartProctoring = useProctoringState((state) => state.setStartProctoring);

  useEffect(() => {
    if (!room) return;

    const updateRecording = async () => {
      const participantCount = room.numParticipants;

      if (!isStartProctoring) {
        setStartProctoring(true);
      }

      console.log(`[AutoRecord] Checking participants: ${participantCount}`);
      const today = getTodayString();
      const roomName = params?.roomName || '';

      if (participantCount > 0 && !isRecordingRef.current) {
        try {
          await fetch(`/api/record/start?roomName=${roomName}`);
          isRecordingRef.current = true;

          const path = `test-monitoring/${today}-${roomName}`;
          update(ref(rtdb, path), {
            isJoined: true,
          });

          console.log('[AutoRecord] Recording started');
        } catch (err) {
          console.error('[AutoRecord] Failed to start recording:', err);
        }
      }

      if (participantCount === 0 && isRecordingRef.current) {
        try {
          await fetch(`/api/record/stop?roomName=${roomName}`);
          isRecordingRef.current = false;
          console.log('[AutoRecord] Recording stopped');
        } catch (err) {
          console.error('[AutoRecord] Failed to stop recording:', err);
        }
      }
    };

    const tryInitialUpdate = () => {
      if (room.state === 'connected') {
        console.log('[AutoRecord] Room already connected, checking recording...');
        updateRecording();
      } else {
        console.log('[AutoRecord] Waiting for room connection...');
        const handleConnected = () => {
          console.log('[AutoRecord] Room connected, checking recording...');
          updateRecording();
          room.off('connected', handleConnected);
        };
        room.on('connected', handleConnected);
      }
    };

    tryInitialUpdate();

    room.on('participantConnected', updateRecording);
    room.on('participantDisconnected', updateRecording);

    return () => {
      room.off('participantConnected', updateRecording);
      room.off('participantDisconnected', updateRecording);
    };
  }, [room, roomName]);
}
