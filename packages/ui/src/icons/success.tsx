import type { SVGProps } from 'react';
import styleConstants from '../constants/style-constants';

const SuccessIconSnackBar = ({
  fill = styleConstants.green500,
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
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.10938 4.41016H19.9839V20.6162H4.10938V4.41016Z"
        fill="white"
      />
      <g mask="url(#mask0_3659_14190)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M24 12C24 18.627 18.627 24 12 24C5.373 24 0 18.627 0 12C0 5.373 5.373 0 12 0C18.627 0 24 5.373 24 12ZM10.6106 18.3555L19.5131 9.45302C19.8161 9.15152 19.8161 8.66102 19.5131 8.35802L18.4181 7.26302C18.1166 6.96002 17.6261 6.96002 17.3231 7.26302L10.0631 14.5215L6.67311 11.1315C6.37161 10.8285 5.88111 10.8285 5.57811 11.1315L4.48311 12.2265C4.18011 12.528 4.18011 13.0185 4.48311 13.3215L9.51561 18.3555C9.81711 18.6585 10.3076 18.6585 10.6106 18.3555Z"
          fill={fill}
        />
      </g>
    </svg>
  );
};

export default SuccessIconSnackBar;
