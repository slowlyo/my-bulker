import React from 'react';
import { Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

/**
 * 格式化文件大小
 * @param size 文件大小（字节）
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的大小字符串
 */
export const formatFileSize = (size: number, decimals: number = 2): string => {
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(decimals)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(decimals)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(decimals)} GB`;
  }
};

/**
 * 格式化时间
 */
export function formatDateTime(dateTimeString: string | null | undefined): string {
  if (!dateTimeString) return '-';
  return dayjs(dateTimeString).format('YYYY-MM-DD HH:mm:ss');
}

/**
 * 格式化显示相对时间
 */
export const formatRelativeTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '-';
  const now = dayjs();
  const target = dayjs(timeStr);
  const diffMinutes = now.diff(target, 'minute');

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} 小时前`;
  return `${Math.floor(diffMinutes / 1440)} 天前`;
};

/**
 * 格式化显示同步频率文案
 * @param val 分钟数。0: 关闭, >0: 间隔分钟数, <0: 固定时间点(偏移量)
 */
export const formatFrequency = (val: number): React.ReactNode => {
  if (val === 0) {
    return <Text type="secondary">关闭</Text>;
  }

  // 固定时间点模式：存储为 -(h * 60 + m + 1)
  if (val < 0) {
    const totalMinutes = Math.abs(val) - 1;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return `每天 ${timeStr}`;
  }

  // 间隔执行模式
  if (val % 1440 === 0) {
    const days = val / 1440;
    return days === 1 ? '每天' : `每 ${days} 天`;
  }
  if (val % 60 === 0) {
    const hours = val / 60;
    return hours === 1 ? '每小时' : `每 ${hours} 小时`;
  }
  return `每 ${val} 分钟`;
};
