import { CreateQueryTaskRequest } from '@/services/queryTask/typings';

export interface QueryTaskTemplate {
    name: string;
    createdAt: string;
    values: Partial<CreateQueryTaskRequest>;
}

const STORAGE_KEY = 'queryTaskTemplates';

/**
 * 从 localStorage 获取所有查询任务模板
 */
export const getQueryTaskTemplates = (): QueryTaskTemplate[] => {
    try {
        const templatesJson = localStorage.getItem(STORAGE_KEY);
        if (templatesJson) {
            const templates = JSON.parse(templatesJson) as QueryTaskTemplate[];
            // 按创建时间降序排序
            return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('从localStorage加载查询任务模板失败', error);
    }
    return [];
};

/**
 * 保存一个查询任务模板。如果名称已存在，则会覆盖。
 * @param template 要保存的模板
 * @returns 返回最新的模板列表
 */
export const saveQueryTaskTemplate = (template: QueryTaskTemplate): QueryTaskTemplate[] => {
    const templates = getQueryTaskTemplates();
    const existingIndex = templates.findIndex(t => t.name === template.name);

    if (existingIndex > -1) {
        // 更新现有模板
        templates[existingIndex] = template;
    } else {
        // 添加新模板
        templates.push(template);
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('保存查询任务模板到localStorage失败', error);
    }
     // 返回排序后的列表
    return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * 根据名称删除一个查询任务模板
 * @param templateName 模板名称
 * @returns 返回最新的模板列表
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