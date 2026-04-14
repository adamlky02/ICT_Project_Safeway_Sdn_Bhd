
# Safeway AI Chatbot: Internal Knowledge Assistant
The **Safeway AI Chatbot** is a full-stack web application designed to help Safeway Sdn Bhd staff quickly access information from employee handbooks, internal manuals, and company policies. By using natural language queries, staff can retrieve relevant answers instantly, reducing the time spent searching through physical or digital file repositories.

## ✨ Key Features
- **Dual-Portal Access:** Specialized interfaces for **Staff** (Information Retrieval) and **Admins** (Document Management).
- **Secure Authentication:** User data is protected using **BCrypt** password hashing and **JWT (JSON Web Tokens)**.
- **AI-Powered (Prototype):** Built-in natural language processing logic to simulate intelligent document retrieval.
- **Modern UI:** A clean, corporate, and responsive interface built with **React** and **Tailwind CSS v4**.
- **Serverless Cloud Database:** High-performance data storage using **Neon DB (PostgreSQL)**.


## 🛠 Tech Stack

**Frontend:**
- **React 18** (Vite)
- **Tailwind CSS v4** (Styling)
- **React Router Dom** (Navigation)
- **Lucide React** (Icons)

**Backend:**
- **FastAPI** (Python Web Framework)
- **SQLAlchemy** (ORM)
- **Bcrypt** (Secure Hashing)
- **Neon DB** (Serverless PostgreSQL)


## 🚀 Getting Started

Follow these steps to set up the project on your local machine.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ICT_Project_Safeway_Sdn_Bhd.git
cd ICT_Project_Safeway_Sdn_Bhd
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Activate venv (Mac/Linux):
source venv/bin/activate
# Activate venv (Windows):
.\venv\Scripts\activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

## 🧪 Database Seeding
To populate the database with mock staff and admin credentials, run the following command inside the `backend` folder:
```bash
python seed_db.py
```

## 💻 Running the App
The project includes a master runner script to launch both services simultaneously. From the **root folder**, run:

```bash
python run_app.py
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📁 Project Structure
```text
ICT_Project_Safeway_Sdn_Bhd/
├── backend/            # FastAPI source code & database models
├── frontend/           # React source code & Tailwind styles
├── run_app.py          # Cross-platform master runner
└── README.md           # Documentation
```

---

## 🛡 Security & Best Practices
- **Password Safety:** No plain-text passwords are stored. All passwords undergo salt-based hashing via Bcrypt.
- **CORS Policy:** Restricts API access only to the authorized frontend domain.
- **Modular Design:** Clear separation of concerns between API logic and User Interface.
