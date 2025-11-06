import tailwindConfig from "./tailwind.config.ts"; // <-- AÑADIR: Importar la config

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      config: tailwindConfig, // <-- AÑADIR: Pasar la config
    },
  },
};

export default config;