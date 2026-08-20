import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MotionProvider } from './components/motion/MotionProvider'
import './index.css'

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Application root element was not found.');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <MotionProvider>
            <App />
        </MotionProvider>
    </React.StrictMode>,
)
