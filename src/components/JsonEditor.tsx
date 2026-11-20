import Editor, { type OnMount } from '@monaco-editor/react';
import { useRef } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { VStack } from '@astryxdesign/core/Layout';
import { Toolbar } from '@astryxdesign/core/Toolbar';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
}

/** Advanced editing of the raw project JSON. Loaded lazily: Monaco is large. */
export default function JsonEditor({ value, onChange, onApply }: JsonEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const isDark = useMediaQuery('(prefers-color-scheme: dark)');

  return (
    <VStack gap={2} height="100%">
      <Toolbar
        label="JSON actions"
        size="sm"
        endContent={
          <>
            <Button
              label="Format"
              size="sm"
              variant="ghost"
              onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
            />
            <Button label="Apply changes" size="sm" variant="primary" onClick={onApply} />
          </>
        }
      />
      <Editor
        height="60vh"
        defaultLanguage="json"
        theme={isDark ? 'vs-dark' : 'light'}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={(editor) => {
          editorRef.current = editor;
        }}
        options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, fontSize: 12, wordWrap: 'on' }}
      />
    </VStack>
  );
}
