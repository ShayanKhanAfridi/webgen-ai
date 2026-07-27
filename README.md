# ⚡ WebGen AI

<div align="center">

![WebGen AI Banner](https://img.shields.io/badge/WebGen-AI%20Powered-6366f1?style=for-the-badge&logo=sparkles&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

**An AI-powered web application generator that turns your ideas into fully functional, production-ready websites in seconds.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Project Structure](#-project-structure) • [Environment Variables](#-environment-variables)

</div>

---

## ✨ Features

- 🤖 **AI-Powered Generation** — Describe your idea, and Gemini AI generates complete, functional web projects
- 📝 **Live Code Editor** — Built-in Monaco Editor (VS Code engine) for real-time code editing
- 💻 **Integrated Terminal** — In-browser terminal powered by xterm.js for running commands
- 🗂️ **Project Management** — Save, organize, and manage all your generated projects in one dashboard
- 🔐 **Authentication** — Secure user auth with Supabase (email/password + OAuth)
- 📦 **Download Projects** — Export your project as a ZIP file instantly
- 🌊 **Streaming Responses** — Real-time AI code generation with streaming output
- 🎨 **Modern UI** — Sleek, dark-themed IDE-inspired interface with smooth animations

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI Framework |
| **Vite** | Build Tool & Dev Server |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Monaco Editor** | Code Editing (VS Code engine) |
| **xterm.js** | In-browser Terminal |
| **React Router v6** | Client-side Routing |
| **Supabase JS** | Auth & Database Client |
| **Axios** | HTTP Client |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API Server |
| **Google Gemini AI** | AI Code Generation |
| **Supabase** | PostgreSQL Database & Auth |
| **JWT** | Session Management |
| **WebSockets (ws)** | Real-time Terminal |
| **Archiver** | ZIP Project Export |
| **bcryptjs** | Password Hashing |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) account and project
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/webgen-ai.git
cd webgen-ai
```

### 2. Setup Environment Variables

Copy the example env files and fill in your credentials:

```bash
# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env
```

See the [Environment Variables](#-environment-variables) section for details on each variable.

### 3. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Setup Supabase

1. Create a new project on [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** and run the migrations from `supabase/` folder
3. Copy your **Project URL** and **API Keys** to your `.env` files

### 5. Run the Application

Open two terminals:

```bash
# Terminal 1 - Start the backend server (port 5000)
cd server
npm run dev

# Terminal 2 - Start the frontend client (port 5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. 🎉

---

## 📁 Project Structure

```
webgen-ai/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level components
│   │   │   ├── Landing.jsx    # Landing page
│   │   │   ├── Dashboard.jsx  # Project dashboard
│   │   │   ├── NewProject.jsx # AI generation interface
│   │   │   ├── ProjectEditor.jsx # Code editor + terminal
│   │   │   ├── Login.jsx      # Authentication pages
│   │   │   └── Settings.jsx   # User settings
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Supabase client & utilities
│   │   └── App.jsx            # Root component & routing
│   ├── .env.example           # Environment variable template
│   └── package.json
│
├── server/                    # Node.js + Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ai.js          # AI generation endpoints
│   │   │   ├── auth.js        # Authentication routes
│   │   │   └── projects.js    # Project CRUD routes
│   │   ├── middleware/        # Auth middleware
│   │   ├── lib/               # Supabase admin client
│   │   ├── terminal.js        # WebSocket terminal handler
│   │   └── index.js           # Express app entry point
│   ├── .env.example           # Environment variable template
│   └── package.json
│
└── supabase/                  # Database migrations & schema
```

---

## 🔐 Environment Variables

### Server (`server/.env`)

| Variable | Description | Required |
|---|---|---|
| `SUPABASE_URL` | Your Supabase project URL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (admin access) | ✅ |
| `GEMINI_API_KEY` | Google Gemini API key for AI generation | ✅ |
| `JWT_SECRET` | Secret key for signing JWT tokens | ✅ |
| `PORT` | Server port (default: `5000`) | ❌ |

### Client (`client/.env`)

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | ✅ |
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:5000/api`) | ✅ |

---

## 🖼️ Screenshots

> Coming soon — AI generation in action, live editor, and dashboard views.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

Made with ❤️ by **Shayan Khan Afridi**

⭐ Star this repo if you found it useful!

</div>
