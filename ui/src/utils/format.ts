// 示例方法，没有实际意义
export function trim(str: string) {
  return str.trim();
}

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

// 格式化时间
export function formatDateTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return '-';
    
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return dateTimeString;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return dateTimeString;
    }
}

// 格式化相对时间
export function formatRelativeTime(dateTimeString: string | null | undefined): string {
    if (!dateTimeString) return '-';
    
    try {
        const date = new Date(dateTimeString);
        if (isNaN(date.getTime())) return dateTimeString;
        
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) {
            return '刚刚';
        } else if (diffInSeconds < 3600) {
            return `${Math.floor(diffInSeconds / 60)}分钟前`;
        } else if (diffInSeconds < 86400) {
            return `${Math.floor(diffInSeconds / 3600)}小时前`;
        } else if (diffInSeconds < 2592000) {
            return `${Math.floor(diffInSeconds / 86400)}天前`;
        } else {
            return formatDateTime(dateTimeString);
        }
    } catch (error) {
        return dateTimeString;
    }
}
