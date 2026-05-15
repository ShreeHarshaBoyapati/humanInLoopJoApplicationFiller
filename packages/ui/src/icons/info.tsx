import type { SVGProps } from 'react';
import styleConstants from '../constants/style-constants';

const InfoIconSnackbar = ({
  fill = styleConstants.black800,
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
      <path fillRule="evenodd" clipRule="evenodd" d="M18 3L6 3L6 20H18L18 3Z" fill="white" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 0C18.6162 0 24 5.38385 24 12C24 18.6162 18.6162 24 12 24C5.38384 24 0 18.6162 0 12C0 5.38385 5.38384 0 12 0ZM10.7986 18.5183C10.7986 18.882 11.0953 19.1763 11.4578 19.1763H12.5346C12.8971 19.1763 13.1914 18.882 13.1914 18.5183V10.8553C13.1914 10.4928 12.8971 10.1973 12.5346 10.1973H11.4578C11.0953 10.1973 10.7986 10.4928 10.7986 10.8553V18.5183ZM11.9964 8.22412C12.9858 8.22412 13.791 7.41894 13.791 6.42951C13.791 5.44008 12.9858 4.6349 11.9964 4.6349C11.007 4.6349 10.2018 5.44008 10.2018 6.42951C10.2018 7.41894 11.007 8.22412 11.9964 8.22412Z"
        fill={fill}
      />
    </svg>
  );
};

export default InfoIconSnackbar;
