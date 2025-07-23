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
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!room) return;

    const updateRecording = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const participantCount = room.remoteParticipants.size + (room.localParticipant ? 1 : 0);

      if (!isStartProctoring) {
        setStartProctoring(true);
      }

      console.log(`[AutoRecord] Checking participants: ${participantCount}`);
      const today = getTodayString();
      const roomName = params?.roomName || '';

      if (participantCount > 0 && !isRecordingRef.current) {
        const startWithRetry = async (attempt = 0) => {
          try {
            const response = await fetch(`/api/record/start?roomName=${roomName}`);
            if (!response.ok && response.status !== 204 && response.status !== 409) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle 409 (recording already active) as success
            if (response.status === 409) {
              console.log('[AutoRecord] Recording already active, no retry needed');
              isRecordingRef.current = true;

              const path = `test-monitoring/${today}-${roomName}`;
              await update(ref(rtdb, path), {
                isJoined: true,
              });

              return; // Exit without retrying
            }

            // Only parse JSON if the response has a body (not 204)
            let data;
            if (response.status !== 204) {
              console.log('[AutoRecord] Start recording response:', response);
            } else {
              console.log('[AutoRecord] Start recording response: 204 No Content');
            }

            isRecordingRef.current = true;

            const path = `test-monitoring/${today}-${roomName}`;
            await update(ref(rtdb, path), {
              isJoined: true,
            });

            console.log('[AutoRecord] Recording started');
          } catch (err) {
            console.error(`[AutoRecord] Failed to start recording (attempt ${attempt + 1}):`, err);

            // Retry after 2 seconds, up to 5 attempts
            if (attempt < 4) {
              retryTimeoutRef.current = setTimeout(() => startWithRetry(attempt + 1), 2000);
            } else {
              console.error('[AutoRecord] Max retry attempts reached');
            }
          }
        };

        startWithRetry();
      }

      if (participantCount === 0 && isRecordingRef.current) {
        try {
          const response = await fetch(`/api/record/stop?roomName=${roomName}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          isRecordingRef.current = false;
          console.log('[AutoRecord] Recording stopped');
        } catch (err) {
          console.error('[AutoRecord] Failed to stop recording:', err);
        }
      }
    };

    const tryInitialUpdate = async () => {
      if (room.state === 'connected') {
        console.log('[AutoRecord] Room already connected, checking recording...');
        await updateRecording();
      } else {
        console.log('[AutoRecord] Waiting for room connection...');
        const handleConnected = async () => {
          console.log('[AutoRecord] Room connected, checking recording...');
          await updateRecording();
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [room, roomName, isStartProctoring, setStartProctoring, params]);
}
