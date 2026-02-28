import type { SVGProps } from 'react';
import styleConstants from '../constants/style-constants';

export interface CloseIconProps extends SVGProps<SVGSVGElement> {
  maskId?: string;
}
export const CloseIcon = ({
  fill = styleConstants.white900,
  width = 16,
  height = 16,
  strokeWidth = '0.625',
  ...props
}: CloseIconProps) => {
  const maskId = props.maskId || 'close-icon-mask';

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <mask
        id={maskId}
        style={{ maskType: 'luminance' }}
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="20"
        height="20"
      >
        <path fillRule="evenodd" clipRule="evenodd" d="M0 0H20V20H0V0Z" fill="white" />
      </mask>
      <g mask={`url(#${maskId})`}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M17.4358 2.88979L17.1122 2.56614C17.024 2.47795 16.8813 2.47795 16.7931 2.56614L10.002 9.35725L3.21084 2.56614C3.12266 2.47795 2.97993 2.47795 2.89174 2.56614L2.56809 2.88979C2.47991 2.97798 2.47991 3.1207 2.56809 3.20889L9.35921 10L2.56809 16.7911C2.47991 16.8793 2.47991 17.022 2.56809 17.1102L2.89174 17.4339C2.97993 17.5221 3.12266 17.5221 3.21084 17.4339L10.002 10.6428L16.7931 17.4339C16.8813 17.5221 17.024 17.5221 17.1122 17.4339L17.4358 17.1102C17.524 17.022 17.524 16.8793 17.4358 16.7911L10.6447 10L17.4358 3.20889C17.524 3.1207 17.524 2.97798 17.4358 2.88979Z"
          fill={fill}
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeLinejoin="bevel"
        />
      </g>
    </svg>
  );
};
