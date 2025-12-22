import React from 'react';
import './Controls.css';

interface ControlsProps {
  isPlaying: boolean;
  speed: number;
  fontSize: number;
  position: number;
  totalLength: number;
  onPlayPause: () => void;
  onRewind: () => void;
  onForward: () => void;
  onSpeedChange: (speed: number) => void;
  onFontSizeChange: (size: number) => void;
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export default function Controls({
  isPlaying,
  speed,
  fontSize,
  position,
  totalLength,
  onPlayPause,
  onRewind,
  onForward,
  onSpeedChange,
  onFontSizeChange,
  onFileSelect,
  isLoading,
}: ControlsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const progress = totalLength > 0 ? (position / totalLength) * 100 : 0;

  return (
    <div className="controls">
      <div className="controls-row">
        <button
          className="control-button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Import book"
          disabled={isLoading}
        >
          {isLoading ? '⏳ Loading...' : '📚 Import Book'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.fb2,.epub"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="controls-row">
        <button
          className="control-button"
          onClick={onRewind}
          aria-label="Rewind"
        >
          ⏪ Rewind
        </button>
        <button
          className="control-button play-pause"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        <button
          className="control-button"
          onClick={onForward}
          aria-label="Forward"
        >
          ⏩ Forward
        </button>
      </div>

      <div className="controls-row">
        <label className="control-label">
          Speed: {speed.toFixed(1)} chars/s
          <input
            type="range"
            min="5"
            max="40"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="control-slider"
          />
        </label>
      </div>

      <div className="controls-row">
        <label className="control-label">
          Font Size: {fontSize}px
          <input
            type="range"
            min="16"
            max="72"
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="control-slider"
          />
        </label>
      </div>

      <div className="controls-row">
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
          <span className="progress-text">
            {Math.round(progress)}% ({Math.round(position)} / {totalLength})
          </span>
        </div>
      </div>
    </div>
  );
}


