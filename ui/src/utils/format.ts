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
