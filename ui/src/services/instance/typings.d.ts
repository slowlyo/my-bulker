export interface PageInfo_InstanceInfo_ {
  total: number;
  items: Array<InstanceInfo>;
}

export interface Result_PageInfo_InstanceInfo__ {
  code: number;
  message: string;
  data: PageInfo_InstanceInfo_;
}

export interface Result_InstanceInfo_ {
  code: number;
  message: string;
  data: InstanceInfo;
}

export interface Result_string_ {
  code: number;
  message: string;
  data: string;
}

export interface InstanceInfo {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  version: string;
  params: Array<Record<string, string>>;
  remark: string;
  created_at: string;
  updated_at: string;
}

export interface InstanceInfoVO {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  params: Array<Record<string, string>>;
  remark: string;
} 