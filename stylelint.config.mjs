/** @type {import('stylelint').Config} */
export default {
  extends: 'stylelint-config-standard',
  rules: {
    // Keep accepted template formatting; validation must not restyle saved cards.
    'at-rule-empty-line-before': null,
    'comment-empty-line-before': null,
    'function-url-quotes': null,
    'alpha-value-notation': null,
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'color-hex-length': null,
    'custom-property-empty-line-before': null,
    'declaration-block-single-line-max-declarations': null,
    'font-family-name-quotes': null,
    'length-zero-no-unit': null,
    'at-rule-prelude-no-invalid': [true, { ignoreAtRules: ['apply'] }],
    'property-no-vendor-prefix': [true, { ignoreProperties: ['backdrop-filter'] }],
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'layer', 'theme', 'custom-variant'],
      },
    ],
    'hue-degree-notation': null,
    'import-notation': null,
    'lightness-notation': null,
    'rule-empty-line-before': null,
    'value-keyword-case': null,
  },
  overrides: [
    {
      // Families intentionally override earlier shared selectors in this legacy sheet.
      files: ['src/app/rednote-templates.css'],
      rules: { 'no-descending-specificity': null },
    },
  ],
};
