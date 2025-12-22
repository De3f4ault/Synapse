/**
 * Session Tracking Hook - COMPLETE IMPLEMENTATION
 *
 * Provides real-time activity tracking and session detection using WebSocket.
 *
 * Features:
 * - Real-time activity logging via WebSocket
 * - Automatic session detection
 * - Live activity feed
 * - Session statistics
 *
 * This replaces the stub version with full WebSocket integration.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket } from "@/api/websocket/hooks/useWebSocket";
import { detectSessions, type DetectedSession } from "../utils/sessionDetector";

/**
 * Activity log entry for session tracking
 */
export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  activity_type: string;
  module: string;
  resource_id?: number;
  resource_title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to track study sessions
 *
 * COMPLETE IMPLEMENTATION with WebSocket integration.
 */
export function useSessionTracking() {
  const { manager, isConnected } = useWebSocket();

  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [sessions, setSessions] = useState<DetectedSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DetectedSession | null>(
    null,
  );
  const [isInSession, setIsInSession] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Connect to activity WebSocket and setup listeners
   */
  useEffect(() => {
    if (!manager || !isConnected) {
      return;
    }

    // Subscribe to activity channel
    const unsubscribe = manager.subscribe("activity", (message: any) => {
      handleActivityMessage(message);
    });

    console.log("[Session Tracking] Subscribed to activity channel");

    return () => {
      unsubscribe();
      console.log("[Session Tracking] Unsubscribed from activity channel");
    };
  }, [manager, isConnected]);

  /**
   * Handle incoming activity messages
   */
  const handleActivityMessage = useCallback((message: any) => {
    console.log("[Session Tracking] Received message:", message);

    switch (message.type || message.event) {
      case "connected":
        console.log("[Session Tracking] Connected to activity WebSocket");
        break;

      case "activity_history":
        // Initial activity history on connect
        if (message.data?.activities) {
          const activities = message.data.activities;
          setActivityLog(activities);
          console.log(
            "[Session Tracking] Loaded activity history:",
            activities.length,
          );
        }
        break;

      case "activity_logged":
        // New activity logged
        if (message.data) {
          const newActivity = message.data;
          setActivityLog((prev) => [newActivity, ...prev].slice(0, 50)); // Keep last 50

          // Reset session timeout
          if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
          }

          sessionTimeoutRef.current = setTimeout(
            () => {
              detectAndUpdateSessions();
            },
            30 * 60 * 1000,
          ); // 30-minute timeout

          console.log(
            "[Session Tracking] Activity logged:",
            newActivity.activity_type,
          );
        }
        break;

      case "sessions_detected":
        // Backend-detected sessions
        if (message.data?.sessions) {
          const detectedSessions = message.data.sessions.map((s: any) => ({
            id: s.id,
            startTime: new Date(s.start_time),
            endTime: new Date(s.end_time),
            duration: s.duration * 1000, // Convert to ms
            activityCount: s.activity_count,
            modulesUsed: s.modules_used,
            resourcesAccessed: s.resources_accessed,
          }));

          setSessions(detectedSessions);

          if (detectedSessions.length > 0) {
            setCurrentSession(detectedSessions[detectedSessions.length - 1]);
            setIsInSession(true);
          }

          console.log(
            "[Session Tracking] Sessions detected:",
            detectedSessions.length,
          );
        }
        break;
    }
  }, []);

  /**
   * Log a new activity
   */
  const logActivity = useCallback(
    (activity: Omit<ActivityLogEntry, "id" | "timestamp">) => {
      if (!manager || !isConnected) {
        console.warn("[Session Tracking] Cannot log activity - not connected");
        return null;
      }

      // Send activity log message via WebSocket
      manager.send({
        type: "activity_log",
        activity_type: activity.activity_type,
        module: activity.module,
        resource_id: activity.resource_id,
        resource_title: activity.resource_title,
        metadata: activity.metadata || {},
      });

      console.log(
        "[Session Tracking] Logging activity:",
        activity.activity_type,
        activity.module,
      );

      // Create temporary activity for immediate feedback
      const tempActivity: ActivityLogEntry = {
        id: `temp-${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...activity,
      };

      return tempActivity;
    },
    [manager, isConnected],
  );

  /**
   * Detect sessions from current activity log
   */
  const detectAndUpdateSessions = useCallback(() => {
    if (activityLog.length === 0) {
      return;
    }

    const detectedSessions = detectSessions(activityLog, {
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      minActivities: 2,
      minDuration: 5 * 60 * 1000, // 5 minutes
    });

    setSessions(detectedSessions);

    if (detectedSessions.length > 0) {
      const mostRecent = detectedSessions[detectedSessions.length - 1];
      setCurrentSession(mostRecent);
      setIsInSession(true);
    } else {
      setCurrentSession(null);
      setIsInSession(false);
    }

    console.log(
      "[Session Tracking] Local sessions detected:",
      detectedSessions.length,
    );
  }, [activityLog]);

  /**
   * Request session detection from backend
   */
  const requestSessionDetection = useCallback(() => {
    if (!manager || !isConnected) {
      console.warn(
        "[Session Tracking] Cannot request detection - not connected",
      );
      return;
    }

    manager.send({
      type: "detect_sessions",
    });

    console.log("[Session Tracking] Requested session detection from backend");
  }, [manager, isConnected]);

  /**
   * End current session manually
   */
  const endSession = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    setCurrentSession(null);
    setIsInSession(false);

    console.log("[Session Tracking] Session ended manually");
  }, []);

  /**
   * Detect sessions periodically
   */
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (activityLog.length > 0) {
          detectAndUpdateSessions();
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes

    return () => clearInterval(interval);
  }, [activityLog, detectAndUpdateSessions]);

  /**
   * Session statistics
   */
  const sessionStats = {
    totalSessions: sessions.length,
    totalActivities: activityLog.length,
    currentSessionActive: isInSession,
    currentSessionDuration: currentSession ? currentSession.duration : 0,
    averageSessionDuration:
      sessions.length > 0
        ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
        : 0,
  };

  return {
    // State
    currentSession,
    isInSession,
    sessions,
    activityLog,
    stats: sessionStats,

    // Actions
    logActivity,
    endSession,
    requestSessionDetection,
  };
}
