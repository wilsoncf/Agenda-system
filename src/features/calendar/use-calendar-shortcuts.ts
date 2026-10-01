'use client';

/**
 * Calendar keyboard shortcuts hook.
 */

import { useEffect } from 'react';

/**
 * Detects if an event target is an editable text editing context
 * where browser-native undo/redo must take precedence.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (target.isContentEditable) {
    return true;
  }

  return false;
}

export type ShortcutAction = 'undo' | 'redo' | null;

/**
 * Pure function mapping keyboard event attributes to a calendar shortcut action.
 */
export function resolveKeyboardShortcut(
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>
): ShortcutAction {
  // Disregard if Alt key is pressed (e.g. Alt+Ctrl combinations or AltGraph)
  if (e.altKey) {
    return null;
  }

  const hasModifier = e.ctrlKey || e.metaKey;
  if (!hasModifier) {
    return null;
  }

  const key = e.key.toLowerCase();

  // Redo: Ctrl/Cmd + Shift + Z OR Ctrl/Cmd + Y
  if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.shiftKey)) {
    return 'redo';
  }

  // Undo: Ctrl/Cmd + Z (without shift)
  if (key === 'z' && !e.shiftKey) {
    return 'undo';
  }

  return null;
}

export type UseCalendarShortcutsOptions = {
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly enabled?: boolean;
};

export function useCalendarShortcuts({
  onUndo,
  onRedo,
  enabled = true,
}: UseCalendarShortcutsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) {
        return;
      }

      const action = resolveKeyboardShortcut(e);
      if (action === 'undo') {
        e.preventDefault();
        onUndo();
      } else if (action === 'redo') {
        e.preventDefault();
        onRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUndo, onRedo, enabled]);
}
