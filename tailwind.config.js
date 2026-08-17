/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#003441",
        "on-primary": "#ffffff",
        "primary-container": "#0f4c5c",
        "on-primary-container": "#87bbce",
        "primary-fixed": "#b6ebfe",
        "primary-fixed-dim": "#9acee1",
        "secondary": "#505f76",
        "on-secondary": "#ffffff",
        "secondary-container": "#d0e1fb",
        "on-secondary-container": "#54647a",
        "tertiary": "#482700",
        "tertiary-container": "#623d13",
        "on-tertiary-container": "#dda975",
        "background": "#f9f9fa",
        "on-background": "#191c1d",
        "surface": "#ffffff",
        "surface-bright": "#f9f9fa",
        "surface-dim": "#d9dadb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e2e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#40484b",
        "outline": "#70787c",
        "outline-variant": "#c0c8cb",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      spacing: {
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "2xl": "48px",
        "3xl": "64px",
        "gutter": "16px",
        "container-margin": "24px"
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
