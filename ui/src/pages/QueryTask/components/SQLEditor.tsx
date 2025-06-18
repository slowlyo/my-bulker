import React from 'react';
import { Input } from 'antd';

const { TextArea } = Input;

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
        <TextArea
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={6}
            showCount
            maxLength={10000}
            style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: '1.5',
            }}
        />
    );
};

export default SQLEditor; 