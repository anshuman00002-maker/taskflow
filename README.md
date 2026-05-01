# ⚡ TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, Kanban boards, and JWT authentication.

🔗 **Live Demo**: [taskflow-production-2f03.up.railway.app](https://taskflow-production-2f03.up.railway.app)

---

## 📸 Features

- 🔐 **Authentication** — Secure signup & login with bcrypt password hashing and JWT tokens
- 📊 **Dashboard** — Task stats, progress ring, assigned tasks, and project overviews
- 📁 **Projects** — Create and manage multiple projects with team members
- 🗂️ **Kanban Board** — Drag-and-drop tasks across To Do / In Progress / Done columns
- 👥 **Role-Based Access** — Admins can create/edit/delete tasks & invite members; Members can update status only
- 🔔 **Toast Notifications** — Real-time success/error feedback
- 🌙 **Dark UI** — Modern glassmorphism design with smooth animations

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML, CSS, JavaScript (SPA with client-side routing) |
| **Backend** | Node.js + Express.js |
| **Database** | SQLite via `sql.js` (file-based, zero config) |
| **Auth** | `bcryptjs` + `jsonwebtoken` |
| **Deployment** | Railway |

---

## 📁 Project Structure

```
taskflow/
├── public/                  # Frontend (served as static files)
│   ├── index.html           # SPA shell
│   ├── css/
│   │   └── style.css        # Full design system + animations
│   └── js/
│       ├── api.js           # Fetch wrapper (attaches JWT header)
│       ├── components.js    # Modal, Toast, Avatar, Badges, Ripple
│       ├── app.js           # Client-side router + sidebar
│       ├── auth.js          # Login / Signup view
│       ├── dashboard.js     # Dashboard view
│       ├── projects.js      # Projects list view
│       └── board.js         # Kanban board view
│
├── server/                  # Backend
│   ├── index.js             # Express app entry point
│   ├── db.js                # SQLite schema + query helpers
│   ├── middleware/
│   │   ├── auth.js          # JWT verification middleware
│   │   └── roles.js         # Admin/Member role checks
│   └── routes/
│       ├── auth.js          # POST /api/auth/signup|login
│       ├── dashboard.js     # GET  /api/dashboard
│       ├── projects.js      # CRUD /api/projects
│       ├── tasks.js         # PUT/DELETE /api/tasks/:id
│       └── members.js       # CRUD /api/projects/:id/members
│
├── package.json
├── railway.json             # Railway deployment config
└── .gitignore
```

---

## 🗄️ Database Schema

```sql
users            -- id, name, email, password_hash, created_at
projects         -- id, name, description, owner_id, created_at
project_members  -- project_id, user_id, role (admin|member), joined_at
tasks            -- id, project_id, title, description, assigned_to,
                 --     status, priority, due_date, created_by, created_at
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | `{ name, email, password }` | Register new user |
| POST | `/api/auth/login` | `{ email, password }` | Login, returns JWT |
| GET  | `/api/auth/me` | — | Get current user (auth required) |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Stats, my tasks, project overview |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project + members |
| PUT | `/api/projects/:id` | Update project (admin) |
| DELETE | `/api/projects/:id` | Delete project (admin) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List project tasks |
| POST | `/api/projects/:id/tasks` | Create task (admin) |
| PUT | `/api/tasks/:id` | Update task (admin: all fields, member: status only) |
| DELETE | `/api/tasks/:id` | Delete task (admin) |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/members` | List members |
| POST | `/api/projects/:id/members` | Invite by email (admin) |
| PATCH | `/api/projects/:id/members/:userId` | Change role (admin) |
| DELETE | `/api/projects/:id/members/:userId` | Remove member (admin) |

> All endpoints except `/api/auth/*` require `Authorization: Bearer <JWT>` header.

---

## 🚀 Running Locally

### Prerequisites
- Node.js >= 18

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/anshuman00002-maker/taskflow.git
cd taskflow

# 2. Install dependencies
npm install

# 3. Create environment file
echo "PORT=3000" > .env
echo "JWT_SECRET=your_secret_key_here" >> .env

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

For development with auto-reload:
```bash
npm run dev
```

---

## ☁️ Deployment (Railway)

This project is pre-configured for Railway with `railway.json`.

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select this repository
4. Add environment variables:
   - `JWT_SECRET` — any long random string
   - `NODE_ENV` — `production`
5. Railway auto-generates a public URL

---

## 🔒 Security

- Passwords hashed with **bcryptjs** (10 salt rounds)
- JWT tokens expire after **7 days**
- All protected routes verify token on every request
- Role checks prevent members from performing admin-only actions
- Last admin in a project cannot be demoted or removed

---

## 👤 Role Permissions

| Action | Admin | Member |
|--------|-------|--------|
| View board & tasks | ✅ | ✅ |
| Update task status (drag & drop) | ✅ | ✅ |
| Create / Edit / Delete tasks | ✅ | ❌ |
| Invite members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Edit / Delete project | ✅ | ❌ |

---

## 📝 License

MIT — free to use for personal and commercial projects.
