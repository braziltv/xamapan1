import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '400px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',   // Full HD TVs
      '4k': '2560px',    // 4K TVs
      '5k': '3840px',    // 5K/Ultra-wide
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        health: {
          blue: "hsl(var(--health-blue))",
          "blue-dark": "hsl(var(--health-blue-dark))",
          green: "hsl(var(--health-green))",
          "green-light": "hsl(var(--health-green-light))",
          amber: "hsl(var(--health-amber))",
          "amber-light": "hsl(var(--health-amber-light))",
          red: "hsl(var(--health-red))",
        },
        panel: {
          bg: "hsl(var(--panel-bg))",
          card: "hsl(var(--panel-card))",
          highlight: "hsl(var(--panel-highlight))",
          success: "hsl(var(--panel-success))",
          waiting: "hsl(var(--panel-waiting))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'health': 'var(--shadow-md)',
        'health-lg': 'var(--shadow-lg)',
        'health-xl': 'var(--shadow-xl)',
        'glow': 'var(--shadow-glow)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "flash-border": {
          "0%, 100%": { 
            borderColor: "transparent",
            boxShadow: "0 0 0 0 transparent"
          },
          "50%": { 
            borderColor: "currentColor",
            boxShadow: "0 0 30px 5px currentColor"
          },
        },
        "slide-down-bounce": {
          "0%": { 
            transform: "translateX(-50%) translateY(-100%)",
            opacity: "0"
          },
          "60%": { 
            transform: "translateX(-50%) translateY(10%)",
            opacity: "1"
          },
          "80%": { 
            transform: "translateX(-50%) translateY(-5%)"
          },
          "100%": { 
            transform: "translateX(-50%) translateY(0)"
          },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        "glow-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px 0 currentColor",
            opacity: "0.8"
          },
          "50%": { 
            boxShadow: "0 0 40px 10px currentColor",
            opacity: "1"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "flash-border": "flash-border 0.5s ease-in-out 3",
        "slide-down-bounce": "slide-down-bounce 0.5s ease-out forwards",
        "shake": "shake 0.5s ease-in-out",
        "glow-pulse": "glow-pulse 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
