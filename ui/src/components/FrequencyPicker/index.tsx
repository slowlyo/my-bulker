import React, { useState, useEffect } from 'react';
import { Select, InputNumber, Radio, Space, Typography, TimePicker, Card } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

export interface FrequencyPickerProps {
  value?: number;
  onChange?: (value: number) => void;
}

const FrequencyPicker: React.FC<FrequencyPickerProps> = ({ value = 0, onChange }) => {
  const [unit, setUnit] = useState<'minute' | 'hour' | 'day'>(() => {
    if (value === 0) return 'minute';
    if (value < 0) return 'day';
    if (value % 1440 === 0) return 'day';
    if (value % 60 === 0) return 'hour';
    return 'minute';
  });

  const [num, setNum] = useState<number>(() => {
    if (value <= 0) return 1;
    if (value % 1440 === 0) return value / 1440;
    if (value % 60 === 0) return value / 60;
    return value;
  });

  const [time, setTime] = useState<string>(() => {
    if (value < 0) {
      const totalMinutes = Math.abs(value) - 1;
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '00:00';
  });

  const [type, setType] = useState<'off' | 'on'>(value === 0 ? 'off' : 'on');
  const [dayType, setDayType] = useState<'interval' | 'fixed'>(value < 0 ? 'fixed' : 'interval');

  // 处理值变更
  const triggerChange = (newType: 'off' | 'on', newUnit: string, newNum: number, newDayType: string, newTime: string) => {
    if (newType === 'off') {
      onChange?.(0);
      return;
    }

    if (newUnit === 'day' && newDayType === 'fixed') {
      const [h, m] = newTime.split(':').map(Number);
      // 使用负数表示当天的固定时间点: -(h * 60 + m + 1)
      onChange?.(-(h * 60 + m + 1));
    } else {
      const multiplier = newUnit === 'day' ? 1440 : newUnit === 'hour' ? 60 : 1;
      onChange?.(newNum * multiplier);
    }
  };

  // 同步外部传入的 value
  useEffect(() => {
    if (value === 0) {
      setType('off');
    } else {
      setType('on');
      if (value < 0) {
        setUnit('day');
        setDayType('fixed');
        const totalMinutes = Math.abs(value) - 1;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        setTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      } else {
        setDayType('interval');
        if (value % 1440 === 0) {
          setUnit('day');
          setNum(value / 1440);
        } else if (value % 60 === 0) {
          setUnit('hour');
          setNum(value / 60);
        } else {
          setUnit('minute');
          setNum(value);
        }
      }
    }
  }, [value]);

  return (
    <Card 
      size="small" 
      styles={{ body: { padding: '12px' } }}
      style={{ 
        background: '#fafafa',
        border: '1px solid #f0f0f0',
        borderRadius: '8px'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Radio.Group 
          value={type} 
          onChange={(e) => {
            const val = e.target.value;
            setType(val);
            triggerChange(val, unit, num, dayType, time);
          }}
          optionType="button"
          buttonStyle="solid"
          size="small"
        >
          <Radio value="off">关闭定时</Radio>
          <Radio value="on">开启定时</Radio>
        </Radio.Group>

        {type === 'on' && (
          <div style={{ 
            padding: '12px', 
            background: '#fff', 
            borderRadius: '6px',
            border: '1px solid #f0f0f0'
          }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Space wrap>
                <Text type="secondary">频率单位</Text>
                <Select
                  value={unit}
                  onChange={(val) => {
                    setUnit(val);
                    const newDayType = val !== 'day' ? 'interval' : dayType;
                    if (val !== 'day') setDayType('interval');
                    triggerChange(type, val, num, newDayType, time);
                  }}
                  style={{ width: 100 }}
                  size="small"
                  options={[
                    { label: '分钟', value: 'minute' },
                    { label: '小时', value: 'hour' },
                    { label: '天', value: 'day' },
                  ]}
                />
                {unit === 'day' && (
                  <Radio.Group 
                    value={dayType} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setDayType(val);
                      triggerChange(type, unit, num, val, time);
                    }}
                    size="small"
                    optionType="button"
                  >
                    <Radio.Button value="interval">间隔执行</Radio.Button>
                    <Radio.Button value="fixed">固定时间</Radio.Button>
                  </Radio.Group>
                )}
              </Space>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text type="secondary">具体配置</Text>
                {unit === 'day' && dayType === 'fixed' ? (
                  <TimePicker
                    value={dayjs(time, 'HH:mm')}
                    format="HH:mm"
                    onChange={(_, timeStr) => {
                      const val = timeStr as string;
                      setTime(val);
                      triggerChange(type, unit, num, dayType, val);
                    }}
                    allowClear={false}
                    style={{ width: 120 }}
                    size="small"
                  />
                ) : (
                  <Space size={4}>
                    <Text>每隔</Text>
                    <InputNumber
                      min={1}
                      value={num}
                      onChange={(val) => {
                        const n = val || 1;
                        setNum(n);
                        triggerChange(type, unit, n, dayType, time);
                      }}
                      style={{ width: 70 }}
                      size="small"
                    />
                    <Text>{unit === 'day' ? '天' : unit === 'hour' ? '小时' : '分钟'}</Text>
                  </Space>
                )}
              </div>

              <div style={{ 
                marginTop: '4px',
                padding: '4px 8px',
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: '4px',
                display: 'inline-block'
              }}>
                <Text type="success" style={{ fontSize: '12px' }}>
                  <Space size={4}>
                    <span>当前策略：</span>
                    <strong>
                      {unit === 'day' && dayType === 'fixed' 
                        ? `每天 ${time} 执行一次`
                        : `每隔 ${num} ${unit === 'day' ? '天' : unit === 'hour' ? '小时' : '分钟'}执行一次`}
                    </strong>
                  </Space>
                </Text>
              </div>
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default FrequencyPicker;
