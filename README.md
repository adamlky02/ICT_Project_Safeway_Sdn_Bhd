


# Safeway AI Chatbot: Internal Knowledge Assistant
The **Safeway AI Chatbot** is a full-stack web application designed to help Safeway Sdn Bhd staff quickly access information from employee handbooks, internal manuals, and company policies. By using natural language queries, staff can retrieve relevant answers instantly, reducing the time spent searching through physical or digital file repositories.

## ✨ Key Features
- **Role-Based Access:** Staff use the assistant, administrators manage content and accounts, and developers unlock protected AI configuration tools.
- **Secure Authentication:** User data is protected using **BCrypt** password hashing and signed access tokens.
- **AI-Powered (Prototype):** Built-in natural language processing logic to simulate intelligent document retrieval.
- **Modern UI:** A clean, corporate, and responsive interface built with **React** and **Tailwind CSS v4**.
- **Serverless Cloud Database:** High-performance data storage using **Neon DB (PostgreSQL)**.

## Runtime AI Provider Settings on Render

An unlocked developer can switch the response-generation model without editing code or redeploying. Gemini and OpenAI-compatible providers such as DeepSeek are supported. Document embeddings remain on `gemini-embedding-2` so existing vectors continue to work.

Configure these values once in the Render backend service:

```env
SECRET_KEY=<long-random-value>
AI_CONFIG_ENCRYPTION_KEY=<separate-long-random-value>
GOOGLE_API_KEY=<gemini-embedding-and-fallback-key>
ALLOWED_ORIGINS=https://your-frontend.onrender.com
```

Create the first developer without committing a password. The easiest production bootstrap is to promote an existing administrator once:

```env
BOOTSTRAP_DEVELOPER_EMAIL=existing-admin@safeway.com
```

If the address does not exist yet, also set `BOOTSTRAP_DEVELOPER_PASSWORD` to a new password containing at least 12 characters. After the first developer appears, remove the bootstrap variables from Render; the database account remains.

After deployment, sign in through the administrator icon, unlock **Developer Mode** with the same account password, and open **AI Model**. Save a secure draft, test the connection, and activate it. Activation is stored in PostgreSQL and takes effect for new chat requests immediately. It does not edit the environment variables displayed by Render; `GOOGLE_API_KEY` remains the fallback.

Keep whichever encryption source you choose—`AI_CONFIG_ENCRYPTION_KEY`, or `SECRET_KEY` when the dedicated value is blank—stable. Changing it requires re-entering website-managed API keys.

DeepSeek preset values:

```text
Base URL: https://api.deepseek.com
Model:    deepseek-v4-flash
```
