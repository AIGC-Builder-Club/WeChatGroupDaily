import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [".context/**", "node_modules/**", ".next/**", "out/**", "public/archive/**"],
  },
];

export default eslintConfig;
