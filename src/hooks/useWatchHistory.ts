"use client";

import { useState, useEffect } from 'react';

export interface WatchHistoryEntry {
  programId: string;
  channelId: string;
  lastViewed: number; // timestamp
  percentageWatched: number;
}

const MAX_HISTORY = 50;

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('acmtv_history');
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const updateHistory = (entry: WatchHistoryEntry) => {
    setHistory(prev => {
      const filtered = prev.filter(h => h.programId !== entry.programId);
      const next = [entry, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem('acmtv_history', JSON.stringify(next));
      window.dispatchEvent(new Event('history_updated'));
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('acmtv_history');
    window.dispatchEvent(new Event('history_updated'));
  };
  
  const removeHistoryItem = (programId: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h.programId !== programId);
      localStorage.setItem('acmtv_history', JSON.stringify(next));
      window.dispatchEvent(new Event('history_updated'));
      return next;
    });
  };

  // Sync state if another component updates localStorage
  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem('acmtv_history');
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch (e) {}
      } else {
        setHistory([]);
      }
    };
    window.addEventListener('history_updated', handleSync);
    return () => window.removeEventListener('history_updated', handleSync);
  }, []);

  return { history, updateHistory, clearHistory, removeHistoryItem, isMounted };
}
