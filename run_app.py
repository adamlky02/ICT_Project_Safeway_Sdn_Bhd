import subprocess
import os
import sys
import signal
import time
import platform

# Service Launcher (starts the backend and frontend and stops both together)
def run_services():
    # Project Paths (resolves the backend and frontend working directories)
    root_dir = os.getcwd()
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print(f"🚀 Starting Safeway AI Chatbot Services on {platform.system()}...")

    # Platform Commands (selects the correct Python and npm executables for the OS)
    if platform.system() == "Windows":
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        npm_cmd = "npm.cmd"
    else:
        venv_python = os.path.join(backend_dir, "venv", "bin", "python")
        npm_cmd = "npm"

    # Environment Validation (stops early when the backend virtual environment is missing)
    if not os.path.exists(venv_python):
        print(f"❌ Error: Virtual environment not found at {venv_python}")
        print("Please run 'python -m venv venv' inside the backend folder first.")
        return

    # Backend Process (runs the FastAPI development server with auto-reload)
    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=backend_dir
    )
    print("✅ Backend started on http://localhost:8000")

    # Frontend Process (runs the Vite development server and handles a missing npm command)
    try:
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=frontend_dir
        )
        print("✅ Frontend started on http://localhost:5173")
    except FileNotFoundError:
        print("❌ Error: 'npm' command not found. Is Node.js installed?")
        backend_process.terminate()
        return

    print("\n💡 Press Ctrl+C to stop both services.\n")

    # Process Lifetime (keeps the launcher alive until the user requests shutdown)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("👋 Services stopped safely.")
        sys.exit(0)

# Script Entry Point (launches both services only when this file is executed directly)
if __name__ == "__main__":
    run_services()
