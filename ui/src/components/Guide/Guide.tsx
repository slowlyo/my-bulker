import { Layout, Row, Typography } from 'antd';
import React from 'react';

interface Props {
  name: string;
}

// 脚手架示例组件
const Guide: React.FC<Props> = (props) => {
  const { name } = props;
  return (
    <Layout>
      <Row>
        <Typography.Title level={3} className="text-red-500">
          欢迎使用 <strong>{name}</strong> ！
        </Typography.Title>
      </Row>
    </Layout>
  );
};

export default Guide;
