import Guide from "@/components/Guide";
import { trim } from "@/utils/format";
import { PageContainer } from "@ant-design/pro-components";
import { useModel } from "@umijs/max";
import { Card } from "antd";

const HomePage: React.FC = () => {
    const { name } = useModel("global");
    return (
        <PageContainer ghost>
            <Card>
                <div className="text-blue-500">
                    <Guide name={trim(name)} />
                </div>
            </Card>
        </PageContainer>
    );
};

export default HomePage;
