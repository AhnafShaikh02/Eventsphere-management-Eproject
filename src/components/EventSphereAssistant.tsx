import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  MapPin,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { eventSphereApi } from '../services/eventSphereClient';
import type { ExpoBooth, UserAccount } from '../types/eventsphere';
import { Button } from './ui';

type AssistantPersona = 'concierge' | 'exhibitor' | 'organizer';
type AssistantVoice = 'Kore' | 'Puck' | 'Zephyr';

interface ThreadMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  model?: string;
  mentionedBoothIds?: string[];
  audioBase64?: string;
  audioMime?: string;
  isVoiceInput?: boolean;
}

interface EventSphereAssistantProps {
  booths: ExpoBooth[];
  currentUser: UserAccount | null;
  authToken: string | null;
  activeView: string;
  selectedBoothId: string | null;
  exploreHudVisible: boolean;
  onFocusBoothIn3D: (boothId: string) => void;
  onToast: (message: string) => void;
}

const PERSONA_OPTIONS: Array<{ id: AssistantPersona; label: string; hint: string }> = [
  { id: 'concierge', label: 'Concierge', hint: 'Sessions, booths & 3D navigation' },
  { id: 'exhibitor', label: 'Exhibitor', hint: 'Booth sizing, pricing & booking' },
  { id: 'organizer', label: 'Operations', hint: 'Analytics, approvals & live sync' },
];

const QUICK_PROMPTS: Record<AssistantPersona, string[]> = {
  concierge: [
    'Which booths are open right now?',
    'What keynotes are scheduled today?',
    'Where is Lumina Robotics located?',
  ],
  exhibitor: [
    'Compare 3x3m, 6x3m, and 6x6m booth prices',
    'Recommend an available corner booth',
    'How do exhibitor approvals work?',
  ],
  organizer: [
    'Summarize floor occupancy by zone',
    'Which applications are pending review?',
    'How does real-time floor sync work?',
  ],
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to read recorded audio.'));
    reader.readAsDataURL(blob);
  });
}

export const EventSphereAssistant: React.FC<EventSphereAssistantProps> = ({
  booths,
  currentUser,
  authToken,
  activeView,
  selectedBoothId,
  exploreHudVisible,
  onFocusBoothIn3D,
  onToast,
}) => {
  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState<AssistantPersona>(() =>
    currentUser?.role === 'admin'
      ? 'organizer'
      : currentUser?.role === 'exhibitor'
        ? 'exhibitor'
        : 'concierge',
  );
  const [voiceMode, setVoiceMode] = useState(true);
  const [voiceName, setVoiceName] = useState<AssistantVoice>('Kore');
  const [fastMode, setFastMode] = useState(false);

  const [messages, setMessages] = useState<ThreadMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Welcome to EventSphere. Ask me about open booths, exhibitor showcases, session times, or tap the mic to talk in Voice Mode — I can reply in both text and voice.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending, transcribing, open]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopAudioPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setSpeakingMessageId(null);
  };

  const playBase64Audio = async (msgId: string, base64: string, mimeType = 'audio/wav') => {
    stopAudioPlayback();
    try {
      const audio = new Audio(`data:${mimeType};base64,${base64}`);
      audioRef.current = audio;
      setSpeakingMessageId(msgId);
      audio.onended = () => {
        setSpeakingMessageId((cur) => (cur === msgId ? null : cur));
        audioRef.current = null;
      };
      audio.onerror = () => {
        setSpeakingMessageId((cur) => (cur === msgId ? null : cur));
        audioRef.current = null;
      };
      await audio.play();
    } catch {
      setSpeakingMessageId(null);
      onToast('Tap the speaker icon on the message to play voice audio.');
    }
  };

  const speakMessage = async (msg: ThreadMessage) => {
    if (speakingMessageId === msg.id) {
      stopAudioPlayback();
      return;
    }
    if (msg.audioBase64) {
      await playBase64Audio(msg.id, msg.audioBase64, msg.audioMime || 'audio/wav');
      return;
    }
    setLoadingTtsId(msg.id);
    const ttsRes = await eventSphereApi.assistantTts({
      text: msg.text,
      voiceName,
    });
    setLoadingTtsId(null);
    if (!ttsRes.ok) {
      setErrorBanner(ttsRes.error);
      return;
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? { ...m, audioBase64: ttsRes.data.audioBase64, audioMime: ttsRes.data.mimeType }
          : m,
      ),
    );
    await playBase64Audio(msg.id, ttsRes.data.audioBase64, ttsRes.data.mimeType);
  };

  const submitUserTurn = async (text: string, fromVoice = false) => {
    const clean = text.trim();
    if (!clean || sending) return;

    setErrorBanner(null);
    stopAudioPlayback();

    const userMsg: ThreadMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: clean,
      timestamp: new Date().toISOString(),
      isVoiceInput: fromVoice,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputText('');
    setSending(true);

    const historyPayload = nextHistory
      .filter((m) => m.id !== 'welcome-msg')
      .map((m) => ({ role: m.role, text: m.text }));

    const chatRes = await eventSphereApi.assistantChat(
      {
        messages: historyPayload,
        persona,
        fastMode,
        activeView,
        selectedBoothId,
        voiceMode,
      },
      authToken,
    );

    if (!chatRes.ok) {
      setSending(false);
      setErrorBanner(chatRes.error);
      return;
    }

    const assistantMsgId = `ai-${Date.now()}`;
    const assistantMsg: ThreadMessage = {
      id: assistantMsgId,
      role: 'model',
      text: chatRes.data.reply,
      timestamp: new Date().toISOString(),
      model: chatRes.data.model,
      mentionedBoothIds: chatRes.data.mentionedBoothIds,
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setSending(false);

    if (voiceMode) {
      setLoadingTtsId(assistantMsgId);
      const ttsRes = await eventSphereApi.assistantTts({
        text: chatRes.data.reply,
        voiceName,
      });
      setLoadingTtsId(null);
      if (ttsRes.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  audioBase64: ttsRes.data.audioBase64,
                  audioMime: ttsRes.data.mimeType,
                }
              : m,
          ),
        );
        await playBase64Audio(assistantMsgId, ttsRes.data.audioBase64, ttsRes.data.mimeType);
      } else {
        setErrorBanner(ttsRes.error);
      }
    }
  };

  const startVoiceRecording = async () => {
    if (recording || sending || transcribing) return;
    setErrorBanner(null);
    stopAudioPlayback();

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorBanner('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        setRecording(false);
        setRecordSeconds(0);

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 400) {
          setErrorBanner('Recording was too short. Hold or speak for at least 1 second.');
          return;
        }

        setTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const trRes = await eventSphereApi.assistantTranscribe({
            audioBase64,
            mimeType,
          });
          setTranscribing(false);
          if (!trRes.ok) {
            setErrorBanner(trRes.error);
            return;
          }
          await submitUserTurn(trRes.data.text, true);
        } catch (err) {
          setTranscribing(false);
          setErrorBanner(err instanceof Error ? err.message : 'Failed to process voice input.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setErrorBanner('Microphone access was denied. Allow mic permission to use Voice Mode.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetThread = () => {
    stopAudioPlayback();
    setErrorBanner(null);
    setMessages([
      {
        id: 'welcome-msg',
        role: 'model',
        text: 'Started a fresh EventSphere session. Ask by text or tap the mic for Voice Mode.',
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const bottomOffsetClass = exploreHudVisible ? 'bottom-20' : 'bottom-4';

  return (
    <>
      {/* Floating Concierge Launcher */}
      {!open && (
        <div className={`no-print fixed right-4 ${bottomOffsetClass} z-40 transition-all duration-200`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open EventSphere AI Voice and Text Assistant"
            className="surface-luxe group inline-flex items-center gap-2.5 rounded-2xl border border-[#272732]/20 bg-[#F8F8FB]/95 px-4 py-2.5 text-xs font-semibold text-[#0B0B0E] transition-transform hover:-translate-y-0.5 hover:border-[#8A621C]/55 dark:border-[#E8C987]/35 dark:bg-[#0B0B0E]/95 dark:text-[#F2F3F7]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[#B88B3D] to-[#F3DCAA] text-[#0B0B0E]">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-left leading-tight">
              <span className="block font-display text-xs font-bold">Sphere AI</span>
              <span className="block font-mono text-[10px] text-[#8A621C] dark:text-[#E8C987]">
                {voiceMode ? 'Voice + Text' : 'Text Chat'}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Expandable Multi-Turn + Voice Assistant Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            aria-label="EventSphere AI Assistant"
            className="no-print surface-luxe fixed right-3 bottom-3 z-50 flex h-[min(36rem,calc(100svh-5.5rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-[#272732]/22 bg-[#FFFFFF]/98 text-[#0B0B0E] shadow-2xl dark:border-[#2D2D3A]/42 dark:bg-[#101015]/98 dark:text-[#F2F3F7]"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-[#272732]/16 px-4 py-3 dark:border-[#2D2D3A]/32">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#B88B3D] to-[#F3DCAA] text-[#0B0B0E]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <div className="font-display text-sm font-extrabold tracking-tight">
                    EventSphere AI Concierge
                  </div>
                  <div className="font-mono text-[10px] text-[#525463] dark:text-[#9497A6]">
                    {fastMode ? 'Fast · 3.1 Lite' : 'Smart · 4 Hydrogen'} ·{' '}
                    {voiceMode ? `Voice (${voiceName})` : 'Text Only'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetThread}
                  title="New conversation"
                  aria-label="Reset conversation"
                  className="rounded-lg p-1.5 text-[#525463] transition-colors hover:bg-slate-100 hover:text-[#0B0B0E] dark:text-[#9497A6] dark:hover:bg-[#E8C987]/12 dark:hover:text-[#F8F9FC]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  title="Close assistant"
                  aria-label="Close assistant"
                  className="rounded-lg p-1.5 text-[#525463] transition-colors hover:bg-slate-100 hover:text-[#0B0B0E] dark:text-[#9497A6] dark:hover:bg-[#E8C987]/12 dark:hover:text-[#F8F9FC]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Persona & Mode Controls */}
            <div className="space-y-2 border-b border-[#272732]/14 bg-[#E6E7EE]/80 px-3.5 py-2.5 dark:border-[#2D2D3A]/28 dark:bg-[#121217]/90">
              <div className="flex items-center gap-1">
                {PERSONA_OPTIONS.map((p) => {
                  const active = persona === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersona(p.id)}
                      title={p.hint}
                      className={`flex-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors ${
                        active
                          ? 'bg-[#0B0B0E] text-[#F2F3F7] dark:bg-[#E8C987] dark:text-[#0B0B0E]'
                          : 'text-[#3E404D] hover:bg-[#FFFFFF] dark:text-[#9497A6] dark:hover:bg-[#0E0E13]'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !voiceMode;
                      setVoiceMode(next);
                      if (!next) stopAudioPlayback();
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                      voiceMode
                        ? 'border-[#8A621C]/45 bg-[#D4AF63]/14 text-[#8A621C] dark:border-[#E8C987]/40 dark:text-[#E8C987]'
                        : 'border-[#272732]/20 bg-[#FFFFFF] text-[#3E404D] dark:border-[#2D2D3A]/36 dark:bg-[#0E0E13] dark:text-[#9497A6]'
                    }`}
                  >
                    {voiceMode ? (
                      <Volume2 className="h-3 w-3" />
                    ) : (
                      <VolumeX className="h-3 w-3" />
                    )}
                    <span>{voiceMode ? 'Voice + Text' : 'Text Only'}</span>
                  </button>

                  {voiceMode && (
                    <select
                      aria-label="Assistant voice"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value as AssistantVoice)}
                      className="rounded-lg border border-[#272732]/20 bg-[#FFFFFF] px-1.5 py-1 font-mono text-[10px] font-semibold text-[#0B0B0E] dark:border-[#2D2D3A]/38 dark:bg-[#0E0E13] dark:text-[#F2F3F7]"
                    >
                      <option value="Kore">Kore</option>
                      <option value="Puck">Puck</option>
                      <option value="Zephyr">Zephyr</option>
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setFastMode((v) => !v)}
                  title="Switch between Gemini 4 Hydrogen (Smart) and Gemini 3.1 Flash Lite (Fast)"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                    fastMode
                      ? 'border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-300'
                      : 'border-[#272732]/20 bg-[#FFFFFF] text-[#3E404D] dark:border-[#2D2D3A]/36 dark:bg-[#0E0E13] dark:text-[#9497A6]'
                  }`}
                >
                  <Zap className="h-3 w-3" />
                  <span>{fastMode ? 'Fast' : 'Smart'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Multi-Turn Thread */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isSpeaking = speakingMessageId === msg.id;
                const isLoadingTts = loadingTtsId === msg.id;
                const linkedBooths = (msg.mentionedBoothIds || [])
                  .map((id) => booths.find((b) => b.id === id))
                  .filter((b): b is ExpoBooth => Boolean(b));

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-[#0B0B0E] text-[#F2F3F7] dark:bg-[#E8C987] dark:text-[#0B0B0E]'
                          : 'border border-[#272732]/16 bg-[#EAEBF1] text-[#0B0B0E] dark:border-[#2D2D3A]/34 dark:bg-[#121217] dark:text-[#F2F3F7]'
                      }`}
                    >
                      {msg.isVoiceInput && (
                        <div className="mb-1 inline-flex items-center gap-1 font-mono text-[10px] opacity-75">
                          <Mic className="h-2.5 w-2.5" />
                          <span>Voice</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {linkedBooths.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-[#272732]/16 pt-2 dark:border-[#2D2D3A]/30">
                          {linkedBooths.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => onFocusBoothIn3D(b.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#D4AF63]/35 bg-[#D4AF63]/12 px-2 py-1 font-mono text-[10px] font-semibold text-[#8A621C] transition-colors hover:bg-[#D4AF63]/22 dark:text-[#E8C987]"
                            >
                              <MapPin className="h-2.5 w-2.5" />
                              <span>Focus Booth {b.number}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-2 px-1 font-mono text-[10px] text-[#525463] dark:text-[#9497A6]">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => speakMessage(msg)}
                          disabled={isLoadingTts}
                          className="inline-flex items-center gap-1 font-semibold text-[#8A621C] hover:underline disabled:opacity-50 dark:text-[#E8C987]"
                        >
                          {isSpeaking ? (
                            <>
                              <Square className="h-2.5 w-2.5 fill-current" />
                              <span>Stop Voice</span>
                            </>
                          ) : isLoadingTts ? (
                            <span>Synthesizing...</span>
                          ) : (
                            <>
                              <Volume2 className="h-3 w-3" />
                              <span>Play Voice</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {(transcribing || sending) && (
                <div className="flex items-start">
                  <div className="rounded-2xl border border-[#272732]/16 bg-[#EAEBF1] px-3.5 py-2.5 text-xs text-[#3E404D] dark:border-[#2D2D3A]/34 dark:bg-[#121217] dark:text-[#9497A6]">
                    {transcribing ? 'Transcribing voice...' : 'EventSphere AI is thinking...'}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            {messages.length <= 2 && !sending && !recording && (
              <div className="flex gap-1.5 overflow-x-auto border-t border-[#272732]/14 px-3.5 py-2 dark:border-[#2D2D3A]/28">
                {QUICK_PROMPTS[persona].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitUserTurn(prompt)}
                    className="shrink-0 rounded-lg border border-[#272732]/18 bg-[#EAEBF1] px-2.5 py-1 text-[11px] font-medium text-[#0B0B0E] transition-colors hover:border-[#8A621C]/55 dark:border-[#2D2D3A]/36 dark:bg-[#121217] dark:text-[#F2F3F7]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Error Banner */}
            {errorBanner && (
              <div className="border-t border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                {errorBanner}
              </div>
            )}

            {/* Composer: Text + Voice Microphone */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitUserTurn(inputText, false);
              }}
              className="flex items-center gap-2 border-t border-[#272732]/16 bg-[#F8F8FB] px-3 py-2.5 dark:border-[#2D2D3A]/32 dark:bg-[#0E0E13]"
            >
              <button
                type="button"
                onClick={recording ? stopVoiceRecording : startVoiceRecording}
                disabled={sending || transcribing}
                title={recording ? 'Stop recording and send' : 'Tap to speak in Voice Mode'}
                aria-label={recording ? 'Stop voice recording' : 'Start voice recording'}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  recording
                    ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-300'
                    : 'border-[#272732]/20 bg-[#E6E7EE] text-[#0B0B0E] hover:border-[#8A621C]/55 dark:border-[#2D2D3A]/38 dark:bg-[#121217] dark:text-[#F2F3F7]'
                }`}
              >
                {recording ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    <span className="font-mono text-[11px] tabular-nums">{recordSeconds}s</span>
                  </>
                ) : (
                  <Mic className="h-3.5 w-3.5 text-[#8A621C] dark:text-[#E8C987]" />
                )}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={recording || sending || transcribing}
                placeholder={
                  recording
                    ? 'Listening... tap mic to send'
                    : 'Ask about booths, sessions, pricing...'
                }
                className="h-9 min-w-0 flex-1 rounded-xl border border-[#272732]/20 bg-[#F5F6F9] px-3 text-xs text-[#0B0B0E] placeholder:text-[#3E404D]/70 focus:border-[#8A621C] focus:outline-none dark:border-[#2D2D3A]/38 dark:bg-[#121217] dark:text-[#F2F3F7] dark:placeholder:text-[#9497A6]/70"
              />

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!inputText.trim() || sending || transcribing || recording}
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};
