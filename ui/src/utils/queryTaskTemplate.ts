import { CreateQueryTaskRequest } from '@/services/queryTask/typings';

export interface QueryTaskTemplate {
    name: string;
    createdAt: string;
    color?: string;
    values: Partial<CreateQueryTaskRequest>;
}

const STORAGE_KEY = 'queryTaskTemplates';

/**
 * 推荐的模板预设背景色，偏向轻快柔和色系，便于区分且不易造成视觉疲劳。
 */
export const DEFAULT_TEMPLATE_COLORS = [
    '#f3f4f6', // 浅灰
    '#dcfce7', // 浅绿
    '#e0f2fe', // 浅蓝
    '#ffedd5', // 浅橙
    '#f3e8ff', // 浅紫
    '#fee2e2', // 浅红
    '#fef9c3', // 浅黄
    '#ccfbf1', // 浅青
    '#fae8ff', // 浅粉
    '#f1f5f9', // 板岩灰
];

/**
 * 根据背景色计算高对比度文本颜色（深色背景返回白色，浅色背景返回深灰）。
 * 保证自定义背景色下选项文字清晰可见。
 * @param hexColor 十六进制色值字符串
 * @returns 对应文本颜色字符串
 */
export const getContrastTextColor = (hexColor?: string): string => {
    // 未指定有效十六进制颜色时保持默认继承
    if (!hexColor || !hexColor.startsWith('#')) {
        return 'inherit';
    }

    let hex = hexColor.replace('#', '');
    // 兼容三位简写十六进制色值
    if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('');
    }

    // 非标准六位色值时兜底为默认颜色
    if (hex.length !== 6) {
        return 'inherit';
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // 基于 YIQ 感知亮度模型计算明暗度
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    // 亮度阈值低于 140 说明是深色背景，使用白色文字增强对比
    if (yiq < 140) {
        return '#ffffff';
    }
    // 浅色背景使用深灰色文字，避免纯黑过于突兀
    return '#1f2937';
};

/**
 * 从 localStorage 获取所有查询任务模板并按创建时间倒序返回。
 * @returns 模板列表
 */
export const getQueryTaskTemplates = (): QueryTaskTemplate[] => {
    try {
        const templatesJson = localStorage.getItem(STORAGE_KEY);
        // 存在缓存数据时解析为对象数组
        if (templatesJson) {
            const templates = JSON.parse(templatesJson) as QueryTaskTemplate[];
            // 按创建时间降序排序，保证最新的模板排在最前面
            return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('从localStorage加载查询任务模板失败', error);
    }
    return [];
};

/**
 * 保存一个查询任务模板。如果名称已存在，则覆盖更新。
 * @param template 要保存的模板对象
 * @returns 最新的模板列表
 */
export const saveQueryTaskTemplate = (template: QueryTaskTemplate): QueryTaskTemplate[] => {
    const templates = getQueryTaskTemplates();
    const existingIndex = templates.findIndex(t => t.name === template.name);

    // 已存在同名模板时进行就地更新
    if (existingIndex > -1) {
        templates[existingIndex] = template;
    } else {
        // 不存在同名模板时新增插入
        templates.push(template);
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('保存查询任务模板到localStorage失败', error);
    }
    return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * 更新现有查询任务模板，支持修改模板名称、颜色以及查询参数。
 * @param originalName 待修改的原模板名称
 * @param updatedTemplate 更新后的新模板对象
 * @returns 最新的模板列表
 */
export const updateQueryTaskTemplate = (
    originalName: string,
    updatedTemplate: QueryTaskTemplate,
): QueryTaskTemplate[] => {
    const templates = getQueryTaskTemplates();
    const targetIndex = templates.findIndex(t => t.name === originalName);

    // 未检索到目标原模板时直接返回当前列表
    if (targetIndex === -1) {
        return templates;
    }

    // 检查改名后是否与其它非自身的模板发生名称冲突
    if (originalName !== updatedTemplate.name) {
        const hasConflict = templates.some((t, index) => index !== targetIndex && t.name === updatedTemplate.name);
        // 存在命名冲突时拒绝更新以避免数据互相覆盖
        if (hasConflict) {
            throw new Error(`已存在名为 "${updatedTemplate.name}" 的模板`);
        }
    }

    // 替换为最新的模板内容
    templates[targetIndex] = updatedTemplate;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('更新查询任务模板到localStorage失败', error);
    }

    return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * 根据名称删除一个查询任务模板。
 * @param templateName 模板名称
 * @returns 最新的模板列表
 */
export const deleteQueryTaskTemplate = (templateName: string): QueryTaskTemplate[] => {
    let templates = getQueryTaskTemplates();
    templates = templates.filter(t => t.name !== templateName);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('从localStorage删除查询任务模板失败', error);
    }
    return templates;
}; 