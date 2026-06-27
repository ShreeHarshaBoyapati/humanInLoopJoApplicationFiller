const colorPaletteConfig = {
  black200: '#2e2e32', //border
  black700: '#16171D',
  black800: '#14121a', // component background
  white900: '#FFF',
  white700: 'color-mix(in oklab, #fff 70%, transparent)',
  grey300: '#65758529',
  grey500: '#98989f', //text and icons
  grey700: '#3B3440',
  blue400: '#5cabe9',
  blue500: '#06B6D4',
  blue700: '#22262d',
  red600: '#f66f81',
  red700: '#b00d22',
  red800: '#2d1722',
  green300: '#22ff73',
  green400: '#4ade80',
  green430: '#1a5433',
  green450: '#183829',
  green500: '#004218',
  green600: '#66ba1c',
  yellow400: '#facc15',
  yellow500: '#554516',
  yellow600: '#383019',
} as const;

const layoutConfig = {
  borderRadius: '0.5em',
  gap: '0.5em',
  spacing: '0.25em',
  headingFont: `'Space Grotesk',sans-serif`,
  secondaryFont: `Inter, sans-serif`,
} as const;

const styleConstants = {
  ...colorPaletteConfig,
  ...layoutConfig,
};

export default styleConstants;
