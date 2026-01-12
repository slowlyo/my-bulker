import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, InputNumber, Radio, Space, Card, Typography, List, Divider } from 'antd';
const cronParser = require('cron-parser');
import dayjs from 'dayjs';
import type { TextProps } from 'antd/es/typography/Text';

const { Text } = Typography;

interface CustomTextProps extends TextProps {
  block?: boolean;
}

const CustomText = Text as React.FC<CustomTextProps>;

interface CronEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

const CronEditor: React.FC<CronEditorProps> = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState('second');
  const [second, setSecond] = useState('0');
  const [minute, setMinute] = useState('*');
  const [hour, setHour] = useState('*');
  const [day, setDay] = useState('*');
  const [month, setMonth] = useState('*');
  const [week, setWeek] = useState('*');

  useEffect(() => {
    if (value) {
      const parts = value.split(' ');
      if (parts.length === 6) {
        setSecond(parts[0]);
        setMinute(parts[1]);
        setHour(parts[2]);
        setDay(parts[3]);
        setMonth(parts[4]);
        setWeek(parts[5]);
      }
    }
  }, [value]);

  const cronValue = useMemo(() => {
    return `${second} ${minute} ${hour} ${day} ${month} ${week}`;
  }, [second, minute, hour, day, month, week]);

  useEffect(() => {
    onChange?.(cronValue);
  }, [cronValue]);

  const previewDates = useMemo(() => {
    try {
      const interval = cronParser.parseExpression(cronValue, { iterator: true });
      const dates = [];
      for (let i = 0; i < 10; i++) {
        dates.push(dayjs(interval.next().value.toDate()).format('YYYY-MM-DD HH:mm:ss'));
      }
      return dates;
    } catch (e) {
      return ['表达式不合法'];
    }
  }, [cronValue]);

  const renderPanel = (
    currentValue: string,
    setter: (v: string) => void,
    type: 'second' | 'minute' | 'hour' | 'day' | 'month' | 'week'
  ) => {
    const rangeMap = {
      second: { min: 0, max: 59, label: '秒' },
      minute: { min: 0, max: 59, label: '分' },
      hour: { min: 0, max: 23, label: '时' },
      day: { min: 1, max: 31, label: '日' },
      month: { min: 1, max: 12, label: '月' },
      week: { min: 0, max: 6, label: '周' },
    };
    const range = rangeMap[type];

    const isStar = currentValue === '*';
    const isInterval = currentValue.includes('/');
    const isRange = currentValue.includes('-') && !currentValue.includes('/');
    const isFixed = !isStar && !isInterval && !isRange;

    let intervalBase = 0;
    let intervalStep = 1;
    if (isInterval) {
      const parts = currentValue.split('/');
      intervalBase = parts[0] === '*' ? 0 : parseInt(parts[0]) || 0;
      intervalStep = parseInt(parts[1]) || 1;
    }

    let rangeStart = range.min;
    let rangeEnd = range.min + 1;
    if (isRange) {
      const parts = currentValue.split('-');
      rangeStart = parseInt(parts[0]) || range.min;
      rangeEnd = parseInt(parts[1]) || (range.min + 1);
    }

    let fixedValue = isFixed ? parseInt(currentValue) || 0 : 0;

    return (
      <div style={{ padding: '16px 0' }}>
        <Radio.Group
          value={isStar ? 'star' : isInterval ? 'interval' : isRange ? 'range' : 'fixed'}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'star') setter('*');
            else if (val === 'interval') setter('0/1');
            else if (val === 'range') setter(`${range.min}-${range.min + 1}`);
            else setter('0');
          }}
        >
          <Space direction="vertical" size="middle">
            <Radio value="star">
              每一{range.label} <Text type="secondary">（允许的值: {range.min}-{range.max}）</Text>
            </Radio>
            <Radio value="interval">
              从 <InputNumber size="small" min={range.min} max={range.max} value={intervalBase} onChange={v => setter(`${v || 0}/${intervalStep}`)} /> {range.label}开始，
              每隔 <InputNumber size="small" min={1} max={range.max} value={intervalStep} onChange={v => setter(`${intervalBase}/${v || 1}`)} /> {range.label}执行一次
            </Radio>
            <Radio value="range">
              周期从 <InputNumber size="small" min={range.min} max={range.max} value={rangeStart} onChange={v => setter(`${v || range.min}-${rangeEnd}`)} /> {range.label} 
              到 <InputNumber size="small" min={range.min} max={range.max} value={rangeEnd} onChange={v => setter(`${rangeStart}-${v || (range.min + 1)}`)} /> {range.label}
            </Radio>
            <Radio value="fixed">
              指定 {range.label}: <InputNumber size="small" min={range.min} max={range.max} value={fixedValue} onChange={v => setter(`${v || 0}`)} />
            </Radio>
          </Space>
        </Radio.Group>
        
        {type === 'day' && (
          <div style={{ marginTop: 16 }}>
            <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>特殊值说明</Text></Divider>
            <ul style={{ fontSize: 12, color: '#888', paddingLeft: 20 }}>
              <li>L: 月份的最后一天</li>
              <li>LW: 月份里的最后一个工作日</li>
              <li>1,15: 指定多天（请在输入框手动编辑）</li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  const tabItems = [
    { label: '秒', key: 'second', children: renderPanel(second, setSecond, 'second') },
    { label: '分', key: 'minute', children: renderPanel(minute, setMinute, 'minute') },
    { label: '时', key: 'hour', children: renderPanel(hour, setHour, 'hour') },
    { label: '日', key: 'day', children: renderPanel(day, setDay, 'day') },
    { label: '月', key: 'month', children: renderPanel(month, setMonth, 'month') },
    { label: '周', key: 'week', children: renderPanel(week, setWeek, 'week') },
  ];

  return (
    <Card size="small" bordered style={{ width: '100%' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ flex: 1, paddingRight: 16, borderRight: '1px solid #f0f0f0' }}>
          <Text strong>参数设定</Text>
          <Tabs
            size="small"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginTop: 8 }}
          />
          <div style={{ marginTop: 16, padding: '12px', background: '#fafafa', borderRadius: 4 }}>
            <CustomText strong block style={{ marginBottom: 4 }}>Cron 表达式:</CustomText>
            <code style={{ fontSize: 16, color: '#1890ff', letterSpacing: 1 }}>{cronValue}</code>
          </div>
        </div>
        <div style={{ width: 220, paddingLeft: 16 }}>
          <Text strong>触发时间预览:</Text>
          <List
            size="small"
            dataSource={previewDates}
            renderItem={item => (
              <List.Item style={{ padding: '4px 0', fontSize: 12 }}>
                <Text type="secondary">{item}</Text>
              </List.Item>
            )}
            style={{ marginTop: 8, height: 320, overflow: 'auto' }}
          />
        </div>
      </div>
    </Card>
  );
};

export default CronEditor;
