import React from "react";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    size?: number | string;
}

// 系统 Logo 组件，统一渲染多库流光海豚品牌图标，保持桌面端与 Web 端的视觉标识统一
const Logo: React.FC<LogoProps> = ({ size = 28, className = "", style, ...props }) => {
    // 优先使用显式传入的宽高属性，若未传入则默认使用 size 参数
    const width = props.width || size;
    const height = props.height || size;

    return (
        <img
            src="mysql.png"
            alt="My Bulker"
            width={width}
            height={height}
            className={`select-none shrink-0 object-contain rounded-md ${className}`}
            style={{ width, height, ...style }}
            {...props}
        />
    );
};

export default Logo;
