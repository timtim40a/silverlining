import { useEffect, useRef } from 'react';
import { TextSegment } from '../types';
import './ScrollingText.css';

interface ScrollingTextProps {
  segments: TextSegment[];
  isPlaying: boolean;
  speed: number; // characters per second
  fontSize: number;
  position: number; // current position in characters
  onPositionChange: (position: number) => void;
}

export default function ScrollingText({
  segments,
  isPlaying,
  speed,
  fontSize,
  position,
  onPositionChange,
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number | null>(null);
  const pixelOffsetRef = useRef<number>(0);

  // Calculate total text length
  const totalLength = segments.reduce((sum, seg) => sum + seg.text.length, 0);

  // Get character width for pixel conversion
  const getCharWidth = () => {
    if (!contentRef.current) return fontSize * 0.6; // fallback estimate
    const measureSpan = document.createElement('span');
    measureSpan.style.fontSize = `${fontSize}px`;
    measureSpan.style.fontFamily = 'Fira Code, monospace';
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.position = 'absolute';
    measureSpan.style.whiteSpace = 'nowrap';
    measureSpan.textContent = 'M';
    document.body.appendChild(measureSpan);
    const width = measureSpan.offsetWidth;
    document.body.removeChild(measureSpan);
    return width;
  };

  // Convert character position to pixel offset
  useEffect(() => {
    const charWidth = getCharWidth();
    pixelOffsetRef.current = position * charWidth;
  }, [position, fontSize]);

  // Keep the cursor visible by scrolling the content (when not playing)
  useEffect(() => {
    if (isPlaying) return; // Animation handles scrolling when playing
    if (contentRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      // Keep cursor at the right edge with some padding
      const offset = Math.max(0, pixelOffsetRef.current - containerWidth + 50);
      contentRef.current.style.transform = `translateX(-${offset}px)`;
    }
  }, [isPlaying, position, fontSize]);

  // Mouse wheel scrolling when paused
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (isPlaying) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 20 : -20; // scroll forward/backward by 20 chars
      const newPosition = Math.max(0, Math.min(totalLength, position + delta));
      onPositionChange(newPosition);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [isPlaying, position, totalLength, onPositionChange]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = null;
      return;
    }

    const charWidth = getCharWidth();
    const maxPixelOffset = totalLength * charWidth;

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // Convert to seconds
      lastTimeRef.current = currentTime;

      // Scroll by pixels per second (convert speed from chars/s to pixels/s)
      const pixelsPerSecond = speed * charWidth;
      pixelOffsetRef.current = Math.min(
        pixelOffsetRef.current + pixelsPerSecond * deltaTime,
        maxPixelOffset
      );

      // Update position based on pixel offset for tracking
      const newPosition = Math.min(pixelOffsetRef.current / charWidth, totalLength);
      onPositionChange(newPosition);

      // Update transform for smooth scrolling
      if (contentRef.current && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const offset = Math.max(0, pixelOffsetRef.current - containerWidth + 50);
        contentRef.current.style.transform = `translateX(-${offset}px)`;
      }

      if (pixelOffsetRef.current < maxPixelOffset) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed, totalLength, onPositionChange, fontSize]);

  // Render text segments up to current position
  const renderText = () => {
    let currentPos = 0;
    const elements: React.ReactNode[] = [];

    for (const segment of segments) {
      const segmentLength = segment.text.length;
      const segmentEnd = currentPos + segmentLength;

      if (segmentEnd <= position) {
        // Fully displayed segment
        const style: React.CSSProperties = {};
        if (segment.bold) style.fontWeight = 'bold';
        if (segment.italic) style.fontStyle = 'italic';
        if (segment.underline) style.textDecoration = 'underline';

        elements.push(
          <span key={currentPos} style={style}>
            {segment.text}
          </span>
        );
      } else if (currentPos < position) {
        // Partially displayed segment
        const visibleLength = position - currentPos;
        const visibleText = segment.text.substring(0, visibleLength);
        const style: React.CSSProperties = {};
        if (segment.bold) style.fontWeight = 'bold';
        if (segment.italic) style.fontStyle = 'italic';
        if (segment.underline) style.textDecoration = 'underline';

        elements.push(
          <span key={currentPos} style={style}>
            {visibleText}
          </span>
        );
        break;
      } else {
        break;
      }

      currentPos = segmentEnd;
    }

    return elements;
  };

  return (
    <div
      ref={containerRef}
      className="scrolling-text-container"
      style={{ fontSize: `${fontSize}px` }}
    >
      <div ref={contentRef} className="scrolling-text-content">
        {renderText()}
        <span className="cursor">|</span>
      </div>
    </div>
  );
}

