module.exports = {
  extends: ["airbnb-base", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["jest", "import"],
  rules: {
    "no-console": [0],
    "@typescript-eslint/indent": [2, 2, {
      "FunctionDeclaration": { "parameters": "first" },
      "FunctionExpression": { "parameters": "first" },
      "ObjectExpression": "first",
      "ArrayExpression": "first",
      "ImportDeclaration": "first",
      "CallExpression": { "arguments": "first" }
    }],
    "@typescript-eslint/explicit-member-accessibility": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/class-name-casing": "off",
    "@typescript-eslint/camelcase": "off",
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/member-delimiter-style": "off",
    "@typescript-eslint/no-angle-bracket-type-assertion": "off",
    "@typescript-eslint/prefer-interface": "off",
    "@typescript-eslint/no-use-before-define": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "import/prefer-default-export": "off",
    "max-len": [1, { code: 120 }],
    "@typescript-eslint/no-var-requires": [1]
  },
  settings: {
    "import/resolver": {
      // use <root>/tsconfig.json
      "typescript": {},
    },
  },
  env: {
    "jest/globals": true
  }
};