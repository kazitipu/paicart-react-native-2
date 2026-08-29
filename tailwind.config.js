/* Paicart design tokens.
   The web app never had a tailwind config — it declared four CSS variables in
   globals.css and then bypassed them, hard-coding ~20 literal hex values across
   inline styles and arbitrary Tailwind classes. Those literals are collected
   here so the native app has one palette instead of twenty scattered copies.
   Hex values are taken verbatim from the web source; do not "tidy" them. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        /* Core brand */
        primary: '#FF6A00',        // header search, CTAs, active nav, loader
        'primary-tint': '#fff1e6', // active nav pill, AI badge
        brand: '#e62222',          // --primary on web: hovers, modal headers
        secondary: '#f97316',      // --secondary: info toast, cart fly anim
        ink: '#1C1C1C',            // footer, splash, dashboard sidebar, toast
        offer: '#FF6600',          // 1688 secondary orange, pay-now tiers

        background: '#f8fafc',
        foreground: '#1e293b',

        whatsapp: {
          DEFAULT: '#25d366',
          dark: '#075e54',
          bg: '#ece5dd',
          input: '#f0f0f0',
        },
        bkash: {
          DEFAULT: '#e2136e',
          deep: '#d62267',
        },
        teal: {
          DEFAULT: '#00B8A9',      // payment tabs
          deep: '#0d9488',         // selected bank
        },
        amber: {
          DEFAULT: '#FABC16',      // Total Due cards
          soft: '#fef6e0',
          line: '#fde68a',
        },
        toast: {
          success: '#22c55e',
          error: '#e62222',
          info: '#f97316',
          warning: '#f59e0b',
        },
        invoice: {
          ok: '#00B42A',
          bad: '#F5222D',
        },
      },
      /* The web app has no webfont at all (Arial/Helvetica/sans-serif) but
         expresses its type scale purely as arbitrary values — text-[9px]
         through text-2xl, with text-[10px]/[11px]/[12.5px]/[13px]/[15px]
         doing most of the work. Named here so screens stop inventing sizes. */
      fontSize: {
        '2xs': ['9px', '12px'],
        xxs: ['10px', '13px'],
        '3xs': ['11px', '14px'],
        tiny: ['12.5px', '16px'],
        smd: ['13px', '17px'],
        md: ['15px', '21px'],
      },
    },
  },
  plugins: [],
};
