import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite Development Server (enables React and reserves the frontend port)
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,
    }
})
