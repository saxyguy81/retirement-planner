/**
 * useChatPanelState Hook
 *
 * Manages chat panel visibility, position, size, and drag state.
 * Persists settings to localStorage.
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const STORAGE_KEY = 'retirement-planner-chat-panel';

const DEFAULT_STATE = {
  visible: false,
  position: 'right', // 'right' | 'top'
  size: 380, // pixels - width for right, height for top
};

const MIN_SIZE = 280;
const MAX_SIZE_PERCENT = 0.5; // 50% of container

export function useChatPanelState() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load chat panel state:', e);
    }
    return DEFAULT_STATE;
  });

  // Drag/resize state (not persisted)
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dropZone, setDropZone] = useState(null); // 'right' | 'top' | null
  const containerRef = useRef(null);

  // Persist to localStorage on change (only persistent state)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          visible: state.visible,
          position: state.position,
          size: state.size,
        })
      );
    } catch (e) {
      console.warn('Failed to save chat panel state:', e);
    }
  }, [state.visible, state.position, state.size]);

  // === Actions ===
  const toggleVisible = useCallback(() => {
    setState(prev => ({ ...prev, visible: !prev.visible }));
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  const setPosition = useCallback(position => {
    setState(prev => ({ ...prev, position }));
  }, []);

  const setSize = useCallback(size => {
    setState(prev => ({
      ...prev,
      size: Math.max(MIN_SIZE, size),
    }));
  }, []);

  // Get effective size clamped to container dimensions
  // This ensures the chat panel doesn't overflow when viewport is smaller than saved size
  const getEffectiveSize = useCallback(() => {
    if (!containerRef.current) return state.size;

    const rect = containerRef.current.getBoundingClientRect();
    const maxSize = (state.position === 'right' ? rect.width : rect.height) * MAX_SIZE_PERCENT;

    return Math.min(state.size, Math.max(MIN_SIZE, maxSize));
  }, [state.size, state.position]);

  // === Resize handlers ===
  const startResize = useCallback(e => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResize = useCallback(
    e => {
      if (!isResizing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newSize;

      if (state.position === 'right') {
        newSize = rect.right - e.clientX;
      } else {
        newSize = e.clientY - rect.top;
      }

      const maxSize = (state.position === 'right' ? rect.width : rect.height) * MAX_SIZE_PERCENT;
      setSize(Math.min(maxSize, Math.max(MIN_SIZE, newSize)));
    },
    [isResizing, state.position, setSize]
  );

  const endResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  // === Drag handlers (for repositioning) ===
  const startDrag = useCallback(e => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback(
    e => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Determine which edge is closest
      const distToRight = rect.width - x;
      const distToTop = y;

      // Threshold for showing drop zone
      if (distToRight < 120 && distToTop > 100) {
        setDropZone('right');
      } else if (distToTop < 100) {
        setDropZone('top');
      } else {
        setDropZone(null);
      }
    },
    [isDragging]
  );

  const endDrag = useCallback(() => {
    if (dropZone && dropZone !== state.position) {
      setPosition(dropZone);
    }
    setIsDragging(false);
    setDropZone(null);
  }, [dropZone, state.position, setPosition]);

  // Attach document-level mouse events during drag/resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', endResize);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', endResize);
      };
    }
  }, [isResizing, handleResize, endResize]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', endDrag);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', endDrag);
      };
    }
  }, [isDragging, handleDrag, endDrag]);

  return {
    // State
    visible: state.visible,
    position: state.position,
    size: state.size,
    isDragging,
    isResizing,
    dropZone,
    containerRef,

    // Constants
    MIN_SIZE,
    MAX_SIZE_PERCENT,

    // Actions
    toggleVisible,
    hide,
    setPosition,
    setSize,
    getEffectiveSize,

    // Drag/resize handlers
    startDrag,
    startResize,
  };
}
