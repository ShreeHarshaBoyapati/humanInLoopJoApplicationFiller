/** @type {import('stylelint').Config} */
module.exports = {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-order'],
  rules: {
    // Ordering rules
    'order/properties-alphabetical-order': true,

    // Allow CSS Modules :global and :local pseudo-selectors
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'local'],
      },
    ],

    // Naming pattern for CSS Modules (camelCase class names)
    'selector-class-pattern': [
      '^[a-z][a-zA-Z0-9]*$',
      {
        message: 'Expected class selector to be camelCase',
      },
    ],

    // Enforce consistent formatting
    'declaration-block-single-line-max-declarations': 1,
    'color-hex-length': 'short',
    'color-named': 'never',

    // Prevent common mistakes
    'no-duplicate-selectors': true,
    'declaration-block-no-duplicate-properties': true,
    'font-family-no-duplicate-names': true,
  },
};
