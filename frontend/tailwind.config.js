/** @type {import('tailwindcss').Config} */
// Tailwind Theme Scan (registers source files and enables class-based dark mode)
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
    darkMode: 'class',
}
