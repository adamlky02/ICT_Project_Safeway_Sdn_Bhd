import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MotionProvider } from './components/motion/MotionProvider'
import './index.css'

// Root Element (locates and validates the page container used by React)
const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Application root element was not found.');
}

// Application Bootstrap (mounts the app with motion defaults and development checks)
ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <MotionProvider>
            <App />
        </MotionProvider>
    </React.StrictMode>,
)
