import styleConstants from '../constants/style-constants';

const ArrowDownIcon = ({ width = 12, height = 7, fill = styleConstants.white700, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 12 7`}
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.00047 6.7234L0.074475 0.7939C-0.024825 0.6946 -0.024825 0.5336 0.074475 0.4342L0.434175 0.0745C0.533575 -0.0249 0.694675 -0.0248 0.793975 0.0746L6.00037 5.2844L11.2058 0.0746C11.3051 -0.0248 11.4663 -0.0248 11.5656 0.0745L11.9253 0.4342C12.0246 0.5335 12.0246 0.6945 11.9254 0.7939L6.00047 6.7234Z"
        fill={fill}
      />
    </svg>
  );
};

export default ArrowDownIcon;
