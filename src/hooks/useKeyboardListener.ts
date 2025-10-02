'use client';

import { useEffect } from 'react';

interface UseKeyboardListenerOptions {
  onRandomEntry?: () => void;
}

export function useKeyboardListener({ onRandomEntry }: UseKeyboardListenerOptions) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }

        event.preventDefault();
        onRandomEntry?.();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onRandomEntry]);
}