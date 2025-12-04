import { useState, useCallback, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import './App.css';
import videoCutdownResults from './data/video_cutdown_results.json';
import { SegmentPlayer } from './components/SegmentPlayer';
import { MainPlayer } from './components/MainPlayer';
import type { SampleData } from './types';

function App() {
  // State for selected project index
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number>(() => {
    const saved = localStorage.getItem('selectedProjectIndex');
    const index = saved ? parseInt(saved, 10) : 0;
    // Validate index is within bounds
    if (index >= 0 && index < videoCutdownResults.length) {
      return index;
    }
    return 0;
  });

  // State for the currently active data (used by players)
  const [activeData, setActiveData] = useState<SampleData>(videoCutdownResults[selectedProjectIndex] as unknown as SampleData);
  
  // State for the editor content
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(videoCutdownResults[selectedProjectIndex], null, 2));
  
  // State to force remount/reset of players
  const [resetKey, setResetKey] = useState<number>(0);

  const [processingIndex, setProcessingIndex] = useState(0);

  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  const handleExecute = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      // Basic validation could go here
      setActiveData(parsed);
      setResetKey(prev => prev + 1);
      setProcessingIndex(0); // Reset queue
    } catch (e) {
      alert('Invalid JSON: ' + (e as Error).message);
    }
  };

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(event.target.value, 10);
    setSelectedProjectIndex(index);
    localStorage.setItem('selectedProjectIndex', index.toString());
    const newData = videoCutdownResults[index] as unknown as SampleData;
    setActiveData(newData);
    setJsonInput(JSON.stringify(newData, null, 2));
    setResetKey(prev => prev + 1);
    setProcessingIndex(0);
  };

  const handleSegmentComplete = useCallback(() => {
    setProcessingIndex(prev => prev + 1);
  }, []);

  const { segments, source_files } = activeData.video_cutdown_result;

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>MediaBunny Video Segments</h1>
      
      {/* Top Section: Split View */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
        
        {/* Left: JSON Editor (50%) */}
        <div style={{ 
          flex: '1', 
          minWidth: '400px', 
          display: 'flex', 
          flexDirection: 'column', 
          height: '750px', // Increased height
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#1e1e1e'
        }}>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#252526', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid #3e3e42'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>Configuration JSON</span>
              <select 
                value={selectedProjectIndex}
                onChange={handleProjectChange}
                style={{ 
                  padding: '5px', 
                  borderRadius: '4px', 
                  backgroundColor: '#333', 
                  color: 'white',
                  border: '1px solid #555',
                  maxWidth: '200px'
                }}
              >
                {videoCutdownResults.map((item, index) => (
                  <option key={index} value={index}>
                    {(item as unknown as SampleData).video_cutdown_result.project_name || `Project ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleFormat}
                style={{ padding: '5px 10px', fontSize: '0.8em', cursor: 'pointer' }}
              >
                Format
              </button>
              <button 
                onClick={handleExecute}
                style={{ 
                  padding: '5px 15px', 
                  fontSize: '0.8em', 
                  backgroundColor: '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Execute
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              defaultLanguage="json"
              theme="vs-dark"
              value={jsonInput}
              onChange={(value) => setJsonInput(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
              }}
            />
          </div>
        </div>

        {/* Right: Main Player (50%) */}
        <div style={{ flex: '1', minWidth: '500px' }}>
          <MainPlayer 
            key={`main-${resetKey}`} 
            segments={segments} 
            sourceFiles={source_files} 
          />
        </div>

      </div>

      {/* Bottom Section: Segment Players */}
      <div className="segments-container" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '20px', 
        justifyContent: 'center',
        padding: '20px',
        // backgroundColor: '#f9f9f9', // Removed to respect dark theme
        // borderRadius: '12px'
      }}>
        {segments.map((segment, index) => {
          const source = source_files.find(s => s.source_id === segment.source_id);
          
          if (!source) {
            return (
              <div key={segment.scene_id} style={{ color: 'red' }}>
                Source not found for segment {segment.scene_id}
              </div>
            );
          }

          return (
            <SegmentPlayer 
              key={`seg-${resetKey}-${segment.scene_id}`} 
              segment={segment} 
              sourceUrl={source.url}
              canProcess={index === processingIndex}
              onComplete={handleSegmentComplete}
            />
          );
        })}
      </div>
    </div>
  );
}

export default App;
