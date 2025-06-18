export interface PageInfo_DatabaseInfo_ {
    total: number;
    items: Array<DatabaseInfo>;
}

export interface Result_PageInfo_DatabaseInfo__ {
    code: number;
    message: string;
    data: PageInfo_DatabaseInfo_;
}

export interface Result_DatabaseInfo_ {
    code: number;
    message: string;
    data: DatabaseInfo;
}

export interface TableInfo {
    id: number;
    name: string;
    comment: string;
    engine: string;
    character_set: string;
    collation: string;
    row_count: number;
    size: number;
    index_size: number;
    created_at: string;
    updated_at: string;
    indexes?: Array<any>;
}

export interface DatabaseInfo {
    id: number;
    name: string;
    instance_id: number;
    character_set: string;
    collation: string;
    size: number;
    table_count: number;
    created_at: string;
    updated_at: string;
    instance: {
        id: number;
        name: string;
    };
    tables?: TableInfo[];
} 