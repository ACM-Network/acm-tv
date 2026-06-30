"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, Radio, ArrowRight } from 'lucide-react';
import { getRuntimeChannels } from '@/utils/scheduleEngine';
import { Channel, Program } from '@/types';

interface SearchResult {
  program: Program;
  channel: Channel;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute all programs once
  const allPrograms = useMemo(() => {
    const list: SearchResult[] = [];
    const channels = getRuntimeChannels();
    
    channels.forEach(ch => {
      const addPrograms = (progs: Program[]) => {
        progs.forEach(p => {
          if (!list.some(existing => existing.program.id === p.id)) {
            list.push({ program: p, channel: ch });
          }
        });
      };
      if (ch.programs) addPrograms(ch.programs);
      if (ch.idents) addPrograms(ch.idents);
      if (ch.promos) addPrograms(ch.promos);
    });
    return list;
  }, []);

  // Debounced Search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const filtered = allPrograms.filter(({ program, channel }) => 
        program.title.toLowerCase().includes(lowerQuery) ||
        program.category.toLowerCase().includes(lowerQuery) ||
        channel.name.toLowerCase().includes(lowerQuery)
      ).slice(0, 8); // limit results
      setResults(filtered);
      setSelectedIndex(-1);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, allPrograms]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        const selected = results[selectedIndex];
        router.push(`/program/${selected.program.id}?channel=${selected.channel.id}`);
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, router]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Search Button (Icon on mobile, Full bar on desktop) */}
      <button 
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-3 py-1.5 md:w-64 bg-signal-black hover:bg-signal-surface border border-signal-border rounded-sm transition-colors text-signal-text-secondary"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline-block text-xs font-mono uppercase tracking-wider">Search... (Ctrl+K)</span>
      </button>

      {/* Expanded Search Dropdown */}
      {isOpen && (
        <div className="absolute top-0 right-0 md:left-0 md:right-auto w-[calc(100vw-32px)] sm:w-96 md:w-[28rem] bg-signal-surface-raised border border-signal-border-active shadow-2xl rounded-md overflow-hidden z-50 animate-fade-in origin-top-right md:origin-top-left">
          
          <div className="flex items-center gap-3 p-3 border-b border-signal-border bg-signal-surface">
            <Search className="w-5 h-5 text-signal-amber" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search programs, movies, channels..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-signal-text-primary placeholder:text-signal-text-tertiary placeholder:font-normal"
            />
            <button onClick={() => setIsOpen(false)} className="p-1 rounded-sm hover:bg-signal-border transition-colors">
              <X className="w-4 h-4 text-signal-text-secondary" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {query.length > 0 && results.length === 0 ? (
              <div className="p-6 text-center text-signal-text-tertiary font-mono text-xs uppercase">
                No results found
              </div>
            ) : (
              results.map((res, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <Link
                    key={res.program.id}
                    href={`/program/${res.program.id}?channel=${res.channel.id}`}
                    onClick={() => { setIsOpen(false); setQuery(''); }}
                    className={`flex items-start gap-3 p-3 border-b border-signal-border/50 transition-colors ${
                      isSelected ? 'bg-signal-surface-hover border-signal-amber/30' : 'hover:bg-signal-surface'
                    }`}
                  >
                    <div className="w-16 h-10 bg-signal-black border border-signal-border flex-shrink-0 rounded-sm overflow-hidden relative">
                      <img 
                        src={res.program.thumbnail || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=150"} 
                        alt={res.program.title}
                        className="w-full h-full object-cover opacity-80"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-signal-text-primary truncate">{res.program.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-signal-text-secondary uppercase">{res.channel.name}</span>
                        <span className="w-1 h-1 rounded-full bg-signal-border"></span>
                        <span className="text-[10px] font-mono text-signal-text-tertiary uppercase">{res.program.category}</span>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 mt-1 transition-colors ${isSelected ? 'text-signal-amber' : 'text-signal-border'}`} />
                  </Link>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
}
