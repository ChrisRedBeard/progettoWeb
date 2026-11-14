import { IntegrationError } from "@/lib/integrations/errors";
import { demoLiveScript, parseLiveData, publishIsAllowed } from "@/lib/integrations/live-data";
import { createListeners } from "@/lib/integrations/listeners";
import { createStatus } from "@/lib/integrations/status";
import type {
  CoachPresence,
  DisconnectReason,
  LiveDataMessage,
  LiveParticipant,
  LiveRole,
  LiveRoomProvider,
  LiveToken,
  StreamQuality,
} from "@/lib/integrations/types";

export type RoomDebug = {
  setCoachSpeaking: (speaking: boolean) => void;
  setCoachPresent: (present: boolean, displayName?: string) => void;
  dropConnection: () => void;
  forceDisconnect: (reason: DisconnectReason) => void;
};

type TokenRecord = LiveToken & { sessionId: string; role: LiveRole };

type RemotePeer = LiveParticipant & { stream: MediaStream | null };

function fakeStream(): MediaStream | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext("2d");
  if (!context || !("captureStream" in canvas)) return null;
  context.fillStyle = "#0b5cab";
  context.fillRect(0, 0, 16, 16);
  const capture = canvas as HTMLCanvasElement & { captureStream: (frameRate?: number) => MediaStream };
  try {
    return capture.captureStream(1);
  } catch {
    return null;
  }
}

export function createLiveRoom(options: { simulate?: boolean; session: { id: string; athleteId: string } }): LiveRoomProvider & { debug: RoomDebug } {
  const machine = createStatus();
  const simulate = options.simulate !== false;
  const tokens = new Map<string, TokenRecord>();
  const burned = new Set<string>();
  const participants = new Map<string, RemotePeer>();
  const mutedIds = new Set<string>();
  const quality = new Map<string, StreamQuality>();
  const participantListeners = createListeners<[LiveParticipant, "joined" | "left"]>();
  const streamListeners = createListeners<[string, MediaStream | null]>();
  const speakingListeners = createListeners<[{ participantId: string; speaking: boolean }]>();
  const disconnectListeners = createListeners<[DisconnectReason]>();
  const connectionListeners = createListeners<["connected" | "reconnecting" | "disconnected"]>();
  const dataListeners = createListeners<[LiveDataMessage]>();
  const presenceListeners = createListeners<[CoachPresence]>();
  let active: TokenRecord | null = null;
  let coachAnnounced = false;
  let demoTimer: ReturnType<typeof setInterval> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;

  function requireRunning() {
    if (machine.status !== "running" || !active) {
      throw new IntegrationError("INVALID_STATE", "La diretta non è aperta.");
    }
  }

  function knownPeer(participantId: string) {
    requireRunning();
    if (!participants.has(participantId)) {
      throw new IntegrationError("NOT_ALLOWED", "Partecipante sconosciuto in questa stanza.");
    }
  }

  function addPeer(peer: RemotePeer) {
    participants.set(peer.id, peer);
    participantListeners.emit(peer, "joined");
    streamListeners.emit(peer.id, peer.stream);
  }

  function stopDemo() {
    if (demoTimer) clearInterval(demoTimer);
    demoTimer = null;
  }

  function stopExpiry() {
    if (expiryTimer) clearTimeout(expiryTimer);
    expiryTimer = null;
  }

  function armExpiry(record: TokenRecord) {
    stopExpiry();
    const delay = Date.parse(record.expiresAt) - Date.now();
    const fire = () => {
      if (!active || active.token !== record.token || machine.status !== "running") return;
      debug.forceDisconnect("TOKEN_EXPIRED");
    };
    if (!Number.isFinite(delay) || delay <= 0) {
      fire();
      return;
    }
    const timer = setTimeout(fire, delay);
    if (typeof timer === "object" && timer && "unref" in timer) timer.unref();
    expiryTimer = timer;
  }

  function startDemo(ids: string[]) {
    stopDemo();
    if (!simulate || ids.length === 0) return;
    const cursors = new Map(ids.map((id, index) => [id, index % demoLiveScript.length]));
    demoTimer = setInterval(() => {
      if (machine.status !== "running") return;
      for (const id of ids) {
        const cursor = cursors.get(id) ?? 0;
        const frame = demoLiveScript[cursor % demoLiveScript.length];
        const parsed = frame ? parseLiveData(frame) : null;
        if (parsed?.ok) dataListeners.emit({ participantId: id, data: parsed.data });
        cursors.set(id, (cursor + 1) % demoLiveScript.length);
      }
    }, 1500);
  }

  function announceCoach(present: boolean, displayName: string | null) {
    coachAnnounced = present;
    presenceListeners.emit({ present, displayName });
  }

  function dropPeers() {
    stopDemo();
    for (const peer of participants.values()) participantListeners.emit(peer, "left");
    participants.clear();
    mutedIds.clear();
    quality.clear();
    if (coachAnnounced) announceCoach(false, null);
  }

  function recordFrom(room: LiveToken, known: TokenRecord | null): TokenRecord {
    if (known) return { ...known, expiresAt: room.expiresAt, publish: room.publish };
    const role: LiveRole = room.publish.video ? "athlete" : "coach";
    return {
      token: room.token,
      roomName: room.roomName,
      expiresAt: room.expiresAt,
      publish: room.publish,
      peers: room.peers,
      sessionId: room.roomName.startsWith("room-") ? room.roomName.slice("room-".length) : room.roomName,
      role,
    };
  }

  const debug: RoomDebug = {
    setCoachSpeaking(speaking) {
      requireRunning();
      speakingListeners.emit({ participantId: "remote-coach", speaking });
    },
    setCoachPresent(present, displayName = "Coach") {
      requireRunning();
      if (present) {
        const existing = participants.get("remote-coach");
        if (existing) existing.displayName = displayName;
        else addPeer({ id: "remote-coach", role: "coach", displayName, stream: fakeStream() });
        announceCoach(true, displayName);
        return;
      }
      const peer = participants.get("remote-coach");
      if (peer) {
        participants.delete("remote-coach");
        participantListeners.emit(peer, "left");
        streamListeners.emit(peer.id, null);
      }
      announceCoach(false, null);
    },
    dropConnection() {
      requireRunning();
      stopDemo();
      stopExpiry();
      const error = new IntegrationError("CONNECTION_LOST", "Connessione della diretta interrotta.");
      connectionListeners.emit("disconnected");
      machine.set("error", error);
    },
    forceDisconnect(reason) {
      requireRunning();
      stopExpiry();
      if (reason === "TOKEN_EXPIRED" && active) {
        burned.add(active.token);
        tokens.delete(active.token);
      }
      dropPeers();
      active = null;
      disconnectListeners.emit(reason);
      connectionListeners.emit("disconnected");
      if (reason === "TOKEN_EXPIRED") {
        machine.set("error", new IntegrationError("TOKEN_EXPIRED", "Il token della diretta è scaduto."));
        return;
      }
      machine.set("idle");
    },
  };

  return {
    get status() {
      return machine.status;
    },
    get lastError() {
      return machine.lastError;
    },
    onStatusChange: machine.onStatusChange,
    debug,
    async getToken(role, sessionId) {
      if (!sessionId.trim()) throw new IntegrationError("INVALID_STATE", "Manca l'id della sessione.");
      if (role !== "coach" && role !== "athlete") throw new IntegrationError("INVALID_STATE", "Ruolo della diretta non valido.");
      const token = crypto.randomUUID();
      const record: TokenRecord = {
        token,
        roomName: `room-${sessionId}`,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        publish: { audio: true, video: role === "athlete" },
        sessionId,
        role,
      };
      tokens.set(token, record);
      return { token: record.token, roomName: record.roomName, expiresAt: record.expiresAt, publish: record.publish };
    },
    async join(room) {
      if (burned.has(room.token)) {
        const error = new IntegrationError("TOKEN_EXPIRED", "Token della diretta non valido.");
        machine.set("error", error);
        throw error;
      }
      const known = tokens.get(room.token) ?? null;
      const expiresAt = Date.parse(room.expiresAt);
      const expired = !Number.isFinite(expiresAt) || expiresAt <= Date.now();
      if (known ? known.roomName !== room.roomName || expired : !room.token || !room.roomName || !room.publish || expired) {
        const error = new IntegrationError("TOKEN_EXPIRED", "Token della diretta non valido.");
        machine.set("error", error);
        throw error;
      }
      if (machine.status === "running") throw new IntegrationError("INVALID_STATE", "Sei già nella diretta.");
      const record = recordFrom(room, known);
      if (!known) tokens.set(record.token, record);
      if (active) dropPeers();
      machine.set("starting");
      active = record;
      options.session.id = record.sessionId;
      machine.set("running");
      armExpiry(record);
      connectionListeners.emit("connected");
      if (!simulate) return;
      const peers = room.peers ?? [];
      if (record.role === "coach" && peers.length > 0) {
        for (const peer of peers) {
          addPeer({ id: peer.id, role: "athlete", displayName: peer.displayName, stream: fakeStream() });
        }
        startDemo(peers.map((peer) => peer.id));
        return;
      }
      const remoteRole: LiveRole = record.role === "athlete" ? "coach" : "athlete";
      addPeer({
        id: remoteRole === "coach" ? "remote-coach" : "remote-athlete",
        role: remoteRole,
        displayName: remoteRole === "coach" ? "Coach" : "Atleta",
        stream: fakeStream(),
      });
    },
    async refreshToken(room) {
      requireRunning();
      if (!active) return;
      if (room.roomName !== active.roomName) {
        throw new IntegrationError("INVALID_STATE", "Il token non appartiene a questa stanza.");
      }
      const expiresAt = Date.parse(room.expiresAt);
      const expired = burned.has(room.token) || !room.token || !Number.isFinite(expiresAt) || expiresAt <= Date.now();
      if (expired) {
        debug.forceDisconnect("TOKEN_EXPIRED");
        throw new IntegrationError("TOKEN_EXPIRED", "Token della diretta non valido.");
      }
      const next: TokenRecord = { ...active, token: room.token, expiresAt: room.expiresAt, publish: room.publish };
      tokens.set(room.token, next);
      active = next;
      armExpiry(next);
    },
    async leave() {
      if (!active && machine.status === "idle") return;
      stopExpiry();
      dropPeers();
      active = null;
      if (machine.status !== "idle") machine.set("idle");
    },
    async publishLocalStream(stream) {
      requireRunning();
      if (!active) return;
      if (typeof MediaStream !== "undefined" && !(stream instanceof MediaStream)) {
        throw new IntegrationError("CAMERA_UNAVAILABLE", "Lo stream locale non è valido.");
      }
      const videoTracks = typeof stream.getVideoTracks === "function" ? stream.getVideoTracks().length : 0;
      const audioTracks = typeof stream.getAudioTracks === "function" ? stream.getAudioTracks().length : 0;
      if (videoTracks === 0 && audioTracks === 0) {
        throw new IntegrationError("CAMERA_UNAVAILABLE", "Lo stream locale non ha tracce.");
      }
      if (!publishIsAllowed(active.publish, { audio: audioTracks, video: videoTracks })) {
        throw new IntegrationError("NOT_ALLOWED", "Questo ruolo non può pubblicare quel tipo di traccia.");
      }
    },
    subscribe(onParticipant, onStream) {
      const stopParticipant = participantListeners.add(onParticipant);
      const stopStream = streamListeners.add(onStream);
      for (const peer of participants.values()) {
        onParticipant(peer, "joined");
        onStream(peer.id, peer.stream);
      }
      return () => {
        stopParticipant();
        stopStream();
      };
    },
    muteRemote(participantId, muted = true) {
      knownPeer(participantId);
      if (muted) mutedIds.add(participantId);
      else mutedIds.delete(participantId);
    },
    setQuality(participantId, next) {
      knownPeer(participantId);
      if (next !== "low" && next !== "high") throw new IntegrationError("INVALID_STATE", "Qualità non valida.");
      quality.set(participantId, next);
    },
    publishData(payload) {
      requireRunning();
      const parsed = parseLiveData(payload);
      if (!parsed.ok) throw parsed.error;
      dataListeners.emit({
        participantId: active?.role === "coach" ? "local-coach" : "local-athlete",
        data: parsed.data,
      });
    },
    onData(listener) {
      return dataListeners.add(listener);
    },
    onCoachPresence(listener) {
      return presenceListeners.add(listener);
    },
    onRemoteSpeaking(listener) {
      return speakingListeners.add(listener);
    },
    onForcedDisconnect(listener) {
      return disconnectListeners.add(listener);
    },
    onConnectionChange(listener) {
      return connectionListeners.add(listener);
    },
  };
}
