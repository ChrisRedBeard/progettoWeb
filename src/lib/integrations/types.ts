import type { IntegrationError } from "@/lib/integrations/errors";
import type { LiveData } from "@/lib/integrations/live-data";
import type { ErrorSeverity, MovementError, MovementErrorCode } from "@/lib/integrations/movement";

export type IntegrationStatus = "idle" | "starting" | "running" | "error";

export type Unsubscribe = () => void;

export type StatusListener = (status: IntegrationStatus, error: IntegrationError | null) => void;

export interface StatusSource {
  readonly status: IntegrationStatus;
  readonly lastError: IntegrationError | null;
  onStatusChange(listener: StatusListener): Unsubscribe;
}

export type VoiceMode = "FULL" | "CRITICAL_ONLY" | "OFF";

export type VoicePriority = ErrorSeverity;

export type SpeakContext = {
  errorCode?: MovementErrorCode;
  setKey?: string;
};

export type SpeakResult =
  | { spoken: true }
  | { spoken: false; reason: "DEDUPED" | "MODE" | "PAUSED" | "EMPTY" };

export type SpeakingState = {
  speaking: boolean;
  text: string | null;
};

export interface VoiceFeedback extends StatusSource {
  readonly mode: VoiceMode;
  readonly paused: boolean;
  speak(text: string, priority: VoicePriority, context?: SpeakContext): SpeakResult;
  stop(): void;
  setMode(mode: VoiceMode): void;
  pause(): void;
  resume(): void;
  onSpeakingChange(listener: (state: SpeakingState) => void): Unsubscribe;
}

export type PoseCallbacks = {
  onRep: (count: number) => void;
  onError: (error: MovementError) => void;
  onTrackingLost: () => void;
  onTrackingRecovered: () => void;
  onFormScore: (score: number) => void;
};

export interface PoseAnalyzer extends StatusSource {
  start(video: HTMLVideoElement | null, exerciseKey: string, callbacks: PoseCallbacks): void;
  stop(): void;
}

export type LiveRole = "coach" | "athlete";

export type DisconnectReason = "PRIVACY_ENABLED" | "ATHLETE_LEFT" | "TOKEN_EXPIRED";

export type StreamQuality = "low" | "high";

export type ConnectionState = "connected" | "reconnecting" | "disconnected";

export type LiveToken = {
  token: string;
  roomName: string;
  expiresAt: string;
  publish: { audio: boolean; video: boolean };
  peers?: { id: string; displayName: string }[];
};

export type LiveDataMessage = {
  participantId: string;
  data: LiveData;
};

export type CoachPresence = {
  present: boolean;
  displayName: string | null;
};

export type LiveParticipant = {
  id: string;
  role: LiveRole;
  displayName: string;
};

export type ParticipantListener = (participant: LiveParticipant, state: "joined" | "left") => void;

export type StreamListener = (participantId: string, stream: MediaStream | null) => void;

export interface LiveRoomProvider extends StatusSource {
  getToken(role: LiveRole, sessionId: string): Promise<LiveToken>;
  join(room: LiveToken): Promise<void>;
  refreshToken(room: LiveToken): Promise<void>;
  leave(): Promise<void>;
  publishLocalStream(stream: MediaStream): Promise<void>;
  subscribe(onParticipant: ParticipantListener, onStream: StreamListener): Unsubscribe;
  muteRemote(participantId: string, muted?: boolean): void;
  setQuality(participantId: string, quality: StreamQuality): void;
  publishData(payload: LiveData): void;
  onData(listener: (message: LiveDataMessage) => void): Unsubscribe;
  onCoachPresence(listener: (event: CoachPresence) => void): Unsubscribe;
  onRemoteSpeaking(listener: (event: { participantId: string; speaking: boolean }) => void): Unsubscribe;
  onForcedDisconnect(listener: (reason: DisconnectReason) => void): Unsubscribe;
  onConnectionChange(listener: (state: ConnectionState) => void): Unsubscribe;
}

export type LiveSessionEvent =
  | { type: "sessionStarted"; sessionId: string; athleteId: string; at: string }
  | { type: "sessionEnded"; sessionId: string; athleteId: string; at: string }
  | { type: "privacyChanged"; sessionId: string; athleteId: string; privateLive: boolean; at: string };

export interface LiveEvents extends StatusSource {
  subscribe(listener: (event: LiveSessionEvent) => void): Unsubscribe;
  start(): void;
  stop(): void;
}

export interface IntegrationBundle {
  pose: PoseAnalyzer;
  voice: VoiceFeedback;
  room: LiveRoomProvider;
  events: LiveEvents;
}
