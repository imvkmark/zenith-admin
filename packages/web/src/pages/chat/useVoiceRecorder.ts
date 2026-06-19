import { useCallback, useRef, useState, useEffect } from 'react';

/** 选择浏览器支持的音频录制 mime 类型 */
function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  if (typeof MediaRecorder === 'undefined') return '';
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

export interface VoiceRecorderResult {
  isRecording: boolean;
  seconds: number;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

/**
 * 语音录制 hook：基于 MediaRecorder。
 * - start() 申请麦克风并开始录制，达到 maxSeconds 自动停止
 * - stop() 结束并通过 onStop 回调返回 Blob 与时长
 * - cancel() 丢弃当前录音
 */
export function useVoiceRecorder({
  maxSeconds = 60,
  onStop,
  onError,
}: Readonly<{
  maxSeconds?: number;
  onStop: (blob: Blob, durationSec: number, mimeType: string) => void;
  onError?: (message: string) => void;
}>): VoiceRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const canceledRef = useRef(false);
  const supported = typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof MediaRecorder !== 'undefined';

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      canceledRef.current = false;
      rec.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      canceledRef.current = true;
      rec.stop();
    } else {
      cleanup();
    }
  }, [cleanup]);

  const start = useCallback(async () => {
    if (!supported) { onError?.('当前浏览器不支持语音录制'); return; }
    const mimeType = pickMimeType();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      canceledRef.current = false;
      secondsRef.current = 0;
      setSeconds(0);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalSeconds = secondsRef.current;
        const wasCanceled = canceledRef.current;
        const type = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        cleanup();
        if (!wasCanceled && blob.size > 0 && finalSeconds >= 1) {
          onStop(blob, finalSeconds, type);
        } else if (!wasCanceled && finalSeconds < 1) {
          onError?.('录音时间太短');
        }
      };

      recorder.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= maxSeconds) stop();
      }, 1000);
    } catch {
      cleanup();
      onError?.('无法访问麦克风，请检查权限');
    }
  }, [supported, maxSeconds, onStop, onError, cleanup, stop]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  return { isRecording, seconds, supported, start, stop, cancel };
}
