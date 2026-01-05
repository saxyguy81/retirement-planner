/**
 * ResizeHandle - Draggable handle for resizing the inspector panel
 */

import { GripVertical } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * ResizeHandle component
 *
 * @param {Object} props
 * @param {number} props.width - Current panel width
 * @param {Function} props.onResize - Callback when width changes
 * @param {number} [props.minWidth=300] - Minimum width
 * @param {number} [props.maxWidth=500] - Maximum width
 */
export function ResizeHandle({ width, onResize, minWidth = 300, maxWidth = 500 }) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const handleMouseDown = useCallback(
    e => {
      e.preventDefault();
      setIsResizing(true);
      startXRef.current = e.clientX;
      startWidthRef.current = width;
    },
    [width]
  );

  const handleMouseMove = useCallback(
    e => {
      if (!isResizing) return;

      // Calculate new width (panel is on right, so movement to left increases width)
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta));
      onResize(newWidth);
    },
    [isResizing, minWidth, maxWidth, onResize]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add global mouse event listeners when resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        absolute left-0 top-0 bottom-0 w-1
        cursor-col-resize
        flex items-center justify-center
        group
        ${isResizing ? 'bg-blue-500' : 'bg-slate-700 hover:bg-blue-500'}
        transition-colors
      `}
    >
      <GripVertical className="w-3 h-3 text-slate-500 group-hover:text-white absolute -left-1" />
    </div>
  );
}

export default ResizeHandle;
