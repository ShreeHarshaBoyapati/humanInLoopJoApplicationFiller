const colorPaletteConfig = {
  black200: '#2e2e32', //border
  black700: '#16171D',
  black800: '#14121a', // component background
  white900: '#FFF',
  white700: 'color-mix(in oklab, #fff 70%, transparent)',
  grey300: '#65758529',
  grey500: '#98989f', //text and icons
  grey700: '#3B3440',
  blue500: '#06B6D4',
  red600: '#f14158',
  red700: '#b00d22',
  green400: '#4ade80',
  green500: '#004218',
  green600: '#66ba1c',
  yellow400: '#facc15',
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
