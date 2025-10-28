# 🧠 FairMind — AI Argument Resolver

### “Where understanding wins over arguing.”

FairMind is an AI-powered conflict resolution app that helps two people settle disagreements intelligently.  
It provides a **neutral AI mediator** that listens to both sides of an argument — whether text or voice — and then generates **three balanced resolution options**, recommending the fairest one based on reasoning and empathy.

---

## 🚀 Features

### 💬 Real-Time Argument Rooms
- Two users can join a shared chat room (via WebSocket).
- Each user submits their side of the argument (text or voice).

### 🧠 AI-Powered Resolution Engine
- The backend sends both arguments to an AI model (via Hugging Face API).
- The AI generates **3 possible resolutions**, ranked by fairness and empathy.
- Users can select which solution fits them best.

### 👥 Authentication & User Management
- Secure Login / Register using:
  - Name, Age, Gender, Email, Password
  - Google OAuth integration
- No feature accessible without login.

### 🔒 Data Security
- All sessions are JWT authenticated.
- User data and chat history stored securely in the database.

### 🎨 Clean Modern UI
- Built using TailwindCSS and Vite.
- Mobile responsive and theme adaptive (Light/Dark mode).

---

## 🧩 Tech Stack

| Layer | Technologies Used |
|-------|--------------------|
| **Frontend** | React + Tailwind CSS + Vite |
| **Backend** | Node.js + Express.js |
| **Real-time Communication** | WebSocket (Socket.io) |
| **AI Integration** | Hugging Face Inference API |
| **Authentication** | JWT + Google OAuth |
| **Database** | MongoDB (via Mongoose / Drizzle ORM) |
| **Deployment (Optional)** | Replit / Render / Vercel |

---

## ⚙️ Environment Variables

Create a `.env` file (or set Replit Secrets) with the following keys:

| Key | Description |
|-----|--------------|
| `HUGGINGFACE_API_K` | Your Hugging Face API key — enables AI model inference |
| `JWT_SECRET` | Secret key for signing user tokens |
| `GOOGLE_CLIENT_ID` | (Optional) Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | (Optional) Google OAuth client secret |

---

## 🧰 Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/<your-username>/fairmind.git
cd fairmind
