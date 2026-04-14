import subprocess
import os
import sys
import signal
import time

def run_services():
    # 1. Path to your folders
    root_dir = os.getcwd()
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("🚀 Starting Safeway AI Chatbot Services...")

    # 2. Start Backend (FastAPI)
    # Note: Using the venv python executable directly
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=backend_dir
    )
    print("✅ Backend started on http://localhost:8000")

    # 3. Start Frontend (Vite/React)
    frontend_process = subprocess.Popen(
        ["npm.cmd", "run", "dev"],
        cwd=frontend_dir,
        shell=True
    )
    print("✅ Frontend started on http://localhost:5173")

    print("\n💡 Press Ctrl+C to stop both services.\n")

    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("👋 Services stopped safely.")
        sys.exit(0)

if __name__ == "__main__":
    run_services()