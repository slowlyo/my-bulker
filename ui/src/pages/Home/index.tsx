import Guide from '@/components/Guide';
import { trim } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';

const HomePage: React.FC = () => {
  const { name } = useModel('global');
  return (
    <PageContainer ghost>
      <div className="text-blue-500">
        <Guide name={trim(name)} />
      </div>
      <div className="w-3 h-3 rounded-full bg-red-500"></div>
    </PageContainer>
  );
};

export default HomePage;
