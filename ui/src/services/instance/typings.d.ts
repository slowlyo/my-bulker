export interface PageInfo_InstanceInfo_ {
  current?: number;
  pageSize?: number;
  total?: number;
  list?: Array<InstanceInfo>;
}

export interface Result_PageInfo_InstanceInfo__ {
  success?: boolean;
  errorMessage?: string;
  data?: PageInfo_InstanceInfo_;
}

export interface Result_InstanceInfo_ {
  success?: boolean;
  errorMessage?: string;
  data?: InstanceInfo;
}

export interface Result_string_ {
  success?: boolean;
  errorMessage?: string;
  data?: string;
}

export interface InstanceInfo {
  id?: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  extraParams?: Record<string, any>;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

export interface InstanceInfoVO {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  extraParams?: Record<string, any>;
  remark?: string;
} 