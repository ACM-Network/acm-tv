"use client";

import { useState, useEffect } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('acmtv_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse favorites", e);
      }
    }
  }, []);

  const addFavorite = (id: string) => {
    setFavorites(prev => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem('acmtv_favorites', JSON.stringify(next));
      // Dispatch custom event for cross-tab or cross-component sync if needed
      window.dispatchEvent(new Event('favorites_updated'));
      return next;
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.filter(f => f !== id);
      localStorage.setItem('acmtv_favorites', JSON.stringify(next));
      window.dispatchEvent(new Event('favorites_updated'));
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) {
      removeFavorite(id);
    } else {
      addFavorite(id);
    }
  };

  const isFavorite = (id: string) => favorites.includes(id);

  // Sync state if another component updates localStorage
  useEffect(() => {
    const handleSync = () => {
      const stored = localStorage.getItem('acmtv_favorites');
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (e) {}
      }
    };
    window.addEventListener('favorites_updated', handleSync);
    return () => window.removeEventListener('favorites_updated', handleSync);
  }, []);

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite, isMounted };
}
