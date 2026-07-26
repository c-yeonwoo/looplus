import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

/*
  eslint-config-next 15.x 는 아직 legacy eslintrc 포맷({ extends: [...] })이라
  flat config 에서 그대로 펼칠 수 없다. FlatCompat 으로 감싼다.
  Next 16 의 eslint-config-next 는 flat 을 기본으로 내보내므로, 올릴 때
  `import coreWebVitals from "eslint-config-next/core-web-vitals"` 로 단순화할 수 있다.
*/
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      /*
        키를 빼는 관용구 `const { [k]: _, ...rest } = obj` 를 허용한다.
        `_` 접두사는 "안 쓰는 걸 알고 있다"는 표시로 쓴다.
      */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
