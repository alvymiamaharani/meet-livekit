import { useRoomContext } from '@livekit/components-react';
import { useEffect, useRef } from 'react';

export function useAutoRecord(roomName: string) {
  const room = useRoomContext();
  const isRecordingRef = useRef(false); // Hindari trigger ganda

  useEffect(() => {
    if (!room) return;

    const updateRecording = async () => {
      const participantCount = room.numParticipants;

      console.log(`[AutoRecord] Checking participants: ${participantCount}`);

      if (participantCount === 1 && !isRecordingRef.current) {
        try {
          await fetch(`/api/record/start?roomName=${roomName}`);
          isRecordingRef.current = true;
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
