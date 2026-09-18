/**
 * @see https://stylelint.io/user-guide/get-started
 * @see https://stylelint.io/user-guide/configure
 * @type {import('stylelint').Config}
 *
 * @see https://github.com/stylelint-scss/stylelint-scss
 */
export default {
  plugins: ['stylelint-scss'],
  extends: ['stylelint-config-standard-scss', 'stylelint-config-css-modules'],
  rules: {
    /*
     ************************************************************
     * General stylelint overrides
     ************************************************************
     */

    // Prefer modern import syntax, but Tailwind uses its own form
    'import-notation': null,

    // Disable empty line requirement before @import/@layer
    // (avoids noise in Tailwind’s layered imports)
    'at-rule-empty-line-before': null,

    /*
     ************************************************************
     * SCSS-aware at-rule handling
     ************************************************************
     */

    // Disable the core at-rule check (it doesn’t know SCSS/Tailwind at-rules)
    'at-rule-no-unknown': null,

    // Use the SCSS plugin’s smarter rule instead
    // Tailwind v4 introduces custom at-rules we need to allow
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'custom-variant', // Tailwind v4: e.g., @custom-variant dark (...)
          'theme', // Tailwind v4: theme customization block
        ],
      },
    ],
  },
};
