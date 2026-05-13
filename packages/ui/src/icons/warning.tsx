import type { SVGProps } from 'react';
import styleConstants from '../constants/style-constants';

const WarningIcon = ({
  fill = styleConstants.yellow400,
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path fillRule="evenodd" clipRule="evenodd" d="M18 21H6L6 4H18L18 21Z" fill="white" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 24C18.6162 24 24 18.6162 24 12C24 5.38384 18.6162 0 12 0C5.38384 0 0 5.38384 0 12C0 18.6162 5.38384 24 12 24ZM10.7986 5.48171C10.7986 5.118 11.0953 4.82369 11.4578 4.82369H12.5346C12.8971 4.82369 13.1914 5.118 13.1914 5.48171V13.1447C13.1914 13.5072 12.8971 13.8027 12.5346 13.8027H11.4578C11.0953 13.8027 10.7986 13.5072 10.7986 13.1447V5.48171ZM11.9964 15.7759C12.9858 15.7759 13.791 16.5811 13.791 17.5705C13.791 18.5599 12.9858 19.3651 11.9964 19.3651C11.007 19.3651 10.2018 18.5599 10.2018 17.5705C10.2018 16.5811 11.007 15.7759 11.9964 15.7759Z"
        fill={fill}
      />
    </svg>
  );
};

export default WarningIcon;
