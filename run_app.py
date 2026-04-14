import subprocess
import os
import sys
import signal
import time
import platform

def run_services():
    # 1. Path to your folders
    root_dir = os.getcwd()
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print(f"🚀 Starting Safeway AI Chatbot Services on {platform.system()}...")

    # 2. Handle OS-specific paths
    if platform.system() == "Windows":
        venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        npm_cmd = "npm.cmd"
    else:
        # Mac / Linux path
        venv_python = os.path.join(backend_dir, "venv", "bin", "python")
        npm_cmd = "npm"

    # Check if venv exists
    if not os.path.exists(venv_python):
        print(f"❌ Error: Virtual environment not found at {venv_python}")
        print("Please run 'python -m venv venv' inside the backend folder first.")
        return

    # 3. Start Backend (FastAPI)
    backend_process = subprocess.Popen(
        [venv_python, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
        cwd=backend_dir
    )
    print("✅ Backend started on http://localhost:8000")

    # 4. Start Frontend (Vite/React)
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

    try:
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