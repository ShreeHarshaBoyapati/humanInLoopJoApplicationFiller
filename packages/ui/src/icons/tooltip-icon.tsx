import { SVGProps } from 'react';
import styleConstants from '../constants/style-constants';

const TooltipIcon = ({
  fill = styleConstants.white900,
  width = '12px',
  height = '12px',
  ...props
}: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.06998 4.5384C6.4948 4.5384 6.83918 4.19402 6.83918 3.7692C6.83918 3.34438 6.4948 3 6.06998 3C5.64516 3 5.30078 3.34438 5.30078 3.7692C5.30078 4.19402 5.64516 4.5384 6.06998 4.5384Z"
        fill={fill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.75 5H6.25C6.3881 5 6.5 5.1119 6.5 5.25V8.5234C6.5 8.6615 6.3881 8.7734 6.25 8.7734H5.75C5.6119 8.7734 5.5 8.6615 5.5 8.5234V5.25C5.5 5.1119 5.6119 5 5.75 5Z"
        fill={fill}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6 12C2.69215 12 0 9.30785 0 6C0 2.69215 2.69215 0 6 0C9.30785 0 12 2.69215 12 6C12 9.30785 9.30785 12 6 12ZM5.99991 1.09091C3.29293 1.09091 1.09082 3.29302 1.09082 6C1.09082 8.70698 3.29293 10.9091 5.99991 10.9091C8.70689 10.9091 10.909 8.70698 10.909 6C10.909 3.29302 8.70689 1.09091 5.99991 1.09091Z"
        fill={fill}
      />
    </svg>
  );
};

export default TooltipIcon;
