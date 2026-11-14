"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getIntegrations } from "@/lib/integrations";
import type { LiveData } from "@/lib/integrations/live-data";
import type { MovementErrorCode } from "@/lib/integrations/movement";
import { requestLiveToken, type LiveTokenRequest } from "@/lib/live/client";
import {
  coachExitForLobbyEvent,
  coachPresenceHeartbeatMs,
  liveExitCopy,
  tokenRenewDelayMs,
  pageTiles,
  peerKey,
  type IssuedLiveToken,
  type LivePeer,
} from "@/lib/live/contract";
import type { LobbyEvent } from "@/lib/lobby/events";
import { lobbyRefreshMs } from "@/lib/lobby/presence";

export type LiveConnection = "connected" | "reconnecting" | "disconnected";
export type LivePhase = "loading" | "empty" | "denied" | "ready" | "error";

export type RecentLiveError = {
  participantId: string;
  rep: number;
  code: MovementErrorCode;
  severity: "INFO" | "WARN" | "CRITICAL";
};

export function useCoachLive(target: LiveTokenRequest) {
  const [phase, setPhase] = useState<LivePhase>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [peers, setPeers] = useState<LivePeer[]>([]);
  const [streams, setStreams] = useState<Record<string, MediaStream | null>>({});
  const [data, setData] = useState<Record<string, LiveData>>({});
  const [recent, setRecent] = useState<RecentLiveError[]>([]);
  const [connection, setConnection] = useState<LiveConnection>("disconnected");
  const [page, setPage] = useState(0);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [audibleId, setAudibleId] = useState<string | null>(null);
  const blockedRef = useRef(false);
  const busyRef = useRef(false);
  const peersRef = useRef<LivePeer[]>([]);
  const ticketRef = useRef<IssuedLiveToken | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renewRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetKey = "scope" in target ? "lobby" : target.sessionId;

  const applyMedia = useCallback((nextPeers: LivePeer[], focus: string | null, audible: string | null) => {
    const room = getIntegrations().room;
    if (room.status !== "running") return;
    for (const peer of nextPeers) {
      try {
        room.muteRemote(peer.id, peer.id !== audible);
        room.setQuality(peer.id, peer.id === focus ? "high" : "low");
      } catch {
        // Il partecipante non è ancora nella stanza.
      }
    }
  }, []);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    const room = getIntegrations().room;
    const stopParticipants = room.subscribe(
      (participant, state) => {
        setStreams((current) => {
          if (state === "left") {
            const next = { ...current };
            delete next[participant.id];
            return next;
          }
          return current;
        });
      },
      (participantId, stream) => {
        setStreams((current) => ({ ...current, [participantId]: stream }));
      },
    );
    const stopData = room.onData((message) => {
      setData((current) => ({ ...current, [message.participantId]: message.data }));
      if (!message.data.error) return;
      const entry: RecentLiveError = {
        participantId: message.participantId,
        rep: message.data.repCount,
        code: message.data.error.code,
        severity: message.data.error.severity,
      };
      setRecent((current) => {
        const last = current[0];
        if (last && last.participantId === entry.participantId && last.code === entry.code && last.rep === entry.rep) return current;
        return [entry, ...current].slice(0, 12);
      });
    });
    const stopConnection = room.onConnectionChange((state) => {
      if (state === "connected") {
        setConnection("connected");
        return;
      }
      setConnection("reconnecting");
    });
    return () => {
      stopParticipants();
      stopData();
      stopConnection();
    };
  }, []);

  useEffect(() => {
    const shown = pageTiles(peers, page).tiles;
    const focus = shown.some((peer) => peer.id === focusedId) ? focusedId : (shown[0]?.id ?? null);
    applyMedia(peers, focus, audibleId);
  }, [applyMedia, audibleId, focusedId, page, peers, connection]);

  useEffect(() => {
    const shown = pageTiles(peers, page).tiles;
    if (shown.length === 0) return;
    if (!shown.some((peer) => peer.id === focusedId)) setFocusedId(shown[0]?.id ?? null);
    if (audibleId && !shown.some((peer) => peer.id === audibleId)) setAudibleId(null);
  }, [audibleId, focusedId, page, peers]);

  useEffect(() => {
    let cancelled = false;
    const room = getIntegrations().room;

    async function connect(rejoin: boolean) {
      if (cancelled || blockedRef.current || busyRef.current) return;
      busyRef.current = true;
      try {
      if (cancelled || blockedRef.current) return;
      const issued = await requestLiveToken("scope" in target ? { scope: "lobby" } : { sessionId: target.sessionId });
      if (cancelled || blockedRef.current) return;
      if (!issued.ok) {
        await room.leave().catch(() => undefined);
        setConnection("disconnected");
        setPeers([]);
        if (issued.kind === "denied") {
          blockedRef.current = issued.reason === "privacy" || "sessionId" in target;
          setNotice(issued.reason === "privacy" ? liveExitCopy.PRIVACY_ENABLED : issued.error);
          setPhase("denied");
          return;
        }
        if (peersRef.current.length > 0) {
          setConnection("reconnecting");
          schedule();
          return;
        }
        setPhase("error");
        return;
      }
      ticketRef.current = issued.ticket;
      if (issued.ticket.peers.length === 0) {
        await room.leave().catch(() => undefined);
        setPeers([]);
        setConnection("disconnected");
        setPhase("empty");
        return;
      }
      const sameRoom = room.status === "running" && peerKey(peersRef.current) === peerKey(issued.ticket.peers);
      if (sameRoom && !rejoin) {
        try {
          await room.refreshToken({
            token: issued.ticket.token,
            roomName: issued.ticket.roomName,
            expiresAt: issued.ticket.expiresAt,
            publish: issued.ticket.publish,
          });
          armRenew(issued.ticket.expiresAt);
        } catch {
          if (!cancelled) schedule();
        }
        return;
      }
      setConnection("reconnecting");
      if (room.status === "running") await room.leave().catch(() => undefined);
      try {
        await room.join({
          token: issued.ticket.token,
          roomName: issued.ticket.roomName,
          expiresAt: issued.ticket.expiresAt,
          publish: issued.ticket.publish,
          peers: issued.ticket.peers.map((peer) => ({ id: peer.id, displayName: peer.displayName })),
        });
      } catch {
        if (cancelled) return;
        setConnection("reconnecting");
        schedule();
        return;
      }
      if (cancelled) {
        await room.leave().catch(() => undefined);
        return;
      }
      for (const peer of issued.ticket.peers) {
        try {
          room.muteRemote(peer.id, true);
          room.setQuality(peer.id, "low");
        } catch {
          // La tile resta in attesa del prossimo aggiornamento.
        }
      }
      setAudibleId(null);
      setPeers(issued.ticket.peers);
      setFocusedId((current) =>
        issued.ticket.peers.some((peer) => peer.id === current) ? current : (issued.ticket.peers[0]?.id ?? null),
      );
      setConnection("connected");
      setPhase("ready");
      armRenew(issued.ticket.expiresAt);
      } finally {
        busyRef.current = false;
      }
    }

    function armRenew(expiresAt: string) {
      if (renewRef.current) clearTimeout(renewRef.current);
      const wait = tokenRenewDelayMs(expiresAt);
      renewRef.current = setTimeout(() => {
        renewRef.current = null;
        void connect(false);
      }, wait);
    }

    function leaveBody() {
      return JSON.stringify("scope" in target ? { scope: "lobby" } : { sessionId: target.sessionId });
    }

    function beat() {
      void fetch("/api/live/heartbeat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: leaveBody(),
        keepalive: true,
      }).catch(() => undefined);
    }

    function schedule() {
      if (retryRef.current || blockedRef.current) return;
      retryRef.current = setTimeout(() => {
        retryRef.current = null;
        void connect(true);
      }, 1000);
    }

    const stopDrop = room.onConnectionChange((state) => {
      if (state === "disconnected") schedule();
    });

    void connect(false);
    beat();
    const refresh = setInterval(() => void connect(false), lobbyRefreshMs);
    const presence = setInterval(beat, coachPresenceHeartbeatMs);
    const onHide = () => {
      void fetch("/api/live/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: leaveBody(),
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", onHide);
    const source = new EventSource("/api/lobby/events");
    source.addEventListener("live", (message) => {
      if (!(message instanceof MessageEvent) || typeof message.data !== "string") return;
      let event: LobbyEvent;
      try {
        event = JSON.parse(message.data) as LobbyEvent;
      } catch {
        return;
      }
      const exit = coachExitForLobbyEvent(event);
      if (exit === "PRIVACY_ENABLED") {
        const name = event.type === "privacyChanged" ? event.athleteName : "Il cliente";
        setNotice(`${name} ha attivato la privacy. La diretta è chiusa e non puoi rientrare.`);
        if ("sessionId" in target) {
          blockedRef.current = true;
          setPhase("denied");
          void room.leave().catch(() => undefined);
          return;
        }
      } else if (exit === "ATHLETE_LEFT") {
        setNotice(liveExitCopy.ATHLETE_LEFT);
        if ("sessionId" in target && event.type === "sessionEnded" && event.sessionId === target.sessionId) {
          blockedRef.current = true;
          setPhase("denied");
          void room.leave().catch(() => undefined);
          return;
        }
      }
      void connect(false);
    });

    return () => {
      cancelled = true;
      stopDrop();
      clearInterval(refresh);
      clearInterval(presence);
      window.removeEventListener("pagehide", onHide);
      if (retryRef.current) clearTimeout(retryRef.current);
      if (renewRef.current) clearTimeout(renewRef.current);
      source.close();
      void room.leave().catch(() => undefined);
      void fetch("/api/live/leave", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify("scope" in target ? { scope: "lobby" } : { sessionId: target.sessionId }),
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [targetKey]);

  const paged = pageTiles(peers, page);
  const visible = paged.tiles;

  function chooseAudio(participantId: string) {
    setAudibleId((current) => (current === participantId ? null : participantId));
  }

  function retry() {
    blockedRef.current = false;
    setNotice(null);
    setPhase("loading");
    setPage(0);
    window.location.reload();
  }

  return {
    phase,
    notice,
    peers,
    visible,
    page: paged.page,
    pages: paged.pages,
    setPage,
    streams,
    data,
    recent,
    connection,
    focusedId,
    setFocusedId,
    audibleId,
    chooseAudio,
    retry,
  };
}
