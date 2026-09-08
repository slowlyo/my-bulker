import React from 'react';
import Editor from '@monaco-editor/react';

interface SQLEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    height?: number | string;
}

/**
 * SQL 代码编辑器组件，基于 Monaco Editor 提供高亮与代码编辑能力。
 * @param props 编辑器属性配置
 */
const SQLEditor: React.FC<SQLEditorProps> = ({
    value = '',
    onChange,
    placeholder = '请输入 SQL 语句，支持多条语句（以分号分隔）',
    height = 360,
}) => {
    return (
        <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-xs">
            <Editor
                height={height}
                language="sql"
                value={value}
                onChange={(v: string | undefined) => {
                    // 当内容发生变更时向外层表单同步，空值兜底为空字符串
                    if (onChange) {
                        onChange(v ?? '');
                    }
                }}
                options={{
                    minimap: { enabled: false },
                    lineNumbers: 'on',
                    lineNumbersMinChars: 3,
                    glyphMargin: false,
                    folding: true,
                    fontSize: 13,
                    lineHeight: 20,
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    renderLineHighlight: 'all',
                }}
                theme="vs"
                loading={<div className="p-4 text-xs text-slate-400">加载编辑器中...</div>}
            />
            <div className="px-3 py-1.5 text-xs text-slate-400 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                <span>{placeholder}</span>
                <span className="font-mono">SQL Mode</span>
            </div>
        </div>
    );
};

export default SQLEditor; 
