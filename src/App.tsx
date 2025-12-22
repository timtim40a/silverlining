import { useState, useEffect } from 'react';
import { TextSegment } from './types';
import { parseBook } from './utils/bookParser';
import ScrollingText from './components/ScrollingText';
import Controls from './components/Controls';
import './App.css';

function App() {
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(20); // characters per second
  const [fontSize, setFontSize] = useState(24);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);
  const [bookName, setBookName] = useState<string | null>(null);

  // Update document title when book changes
  useEffect(() => {
    document.title = bookName ? `${bookName} - Silver Lining` : 'Silver Lining';
  }, [bookName]);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setLoadStatus(`Loading "${file.name}"...`);
    const name = file.name.replace(/\.(txt|fb2|epub)$/i, '');
    try {
      const parsedSegments = await parseBook(file);
      setSegments(parsedSegments);
      setPosition(0);
      setIsPlaying(false);
      setBookName(name);
      const totalChars = parsedSegments.reduce((sum, seg) => sum + seg.text.length, 0);
      setLoadStatus(`Loaded "${file.name}" (${totalChars.toLocaleString()} characters)`);
    } catch (error) {
      console.error('Error parsing book:', error);
      setLoadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSegments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRewind = () => {
    const newPosition = Math.max(0, position - 100);
    setPosition(newPosition);
  };

  const handleForward = () => {
    const totalLength = segments.reduce((sum, seg) => sum + seg.text.length, 0);
    const newPosition = Math.min(totalLength, position + 100);
    setPosition(newPosition);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
  };

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
  };

  const totalLength = segments.reduce((sum, seg) => sum + seg.text.length, 0);

  return (
    <div className="app">
      {segments.length === 0 ? (
        <div className="welcome-screen">
          <h1>Silver Lining</h1>
          <p>Convert your books into a single line of scrolling text</p>
          <p className="subtitle">Import a book to get started</p>
          {isLoading && <p className="loading">Loading...</p>}
          {loadStatus && <p className={`status ${loadStatus.startsWith('Error') ? 'error' : ''}`}>{loadStatus}</p>}
        </div>
      ) : (
        <>
          {loadStatus && <div className="load-banner">{loadStatus}</div>}
          <ScrollingText
            segments={segments}
            isPlaying={isPlaying}
            speed={speed}
            fontSize={fontSize}
            position={position}
            onPositionChange={setPosition}
          />
        </>
      )}
      <Controls
        isPlaying={isPlaying}
        speed={speed}
        fontSize={fontSize}
        position={Math.round(position)}
        totalLength={totalLength}
        onPlayPause={handlePlayPause}
        onRewind={handleRewind}
        onForward={handleForward}
        onSpeedChange={handleSpeedChange}
        onFontSizeChange={handleFontSizeChange}
        onFileSelect={handleFileSelect}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;


