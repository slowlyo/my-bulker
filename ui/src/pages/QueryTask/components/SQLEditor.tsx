import React from 'react';
import Editor from '@monaco-editor/react';

interface SQLEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
}

const SQLEditor: React.FC<SQLEditorProps> = ({
    value = '',
    onChange,
    placeholder = '请输入SQL语句，支持多条语句（用分号分隔）',
}) => {
    return (
        <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
            <Editor
                height={220}
                language="sql"
                value={value}
                onChange={(v: string | undefined) => onChange?.(v ?? '')}
                options={{
                    minimap: { enabled: false },
                    lineNumbers: 'off',
                    glyphMargin: false,
                    folding: false,
                    lineDecorationsWidth: 0,
                    lineNumbersMinChars: 0,
                    fontSize: 14,
                    lineHeight: 20,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                }}
                theme="vs"
                loading="加载编辑器中..."
            />
            <div style={{ padding: '6px 10px', fontSize: 12, color: '#8c8c8c', borderTop: '1px solid #f0f0f0' }}>
                {placeholder}
            </div>
        </div>
    );
};

export default SQLEditor; 