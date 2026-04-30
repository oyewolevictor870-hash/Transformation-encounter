# 🔥 Transformation Encounter Group — Ministry Website

**Lead Steward:** Joseph Omikunle  
**Version:** 1.0.0  
**Stack:** Node.js + Express + PostgreSQL + Socket.io + Vanilla HTML/CSS/JS

---

## 📦 What's Included

This is a **fully-featured ministry management website** with 4 access levels:

| Role     | Access                                                    |
|----------|-----------------------------------------------------------|
| Visitor  | Landing page, public testimonies, events, sermons         |
| Member   | Dashboard, prayer, chat, giving, Bible plan, directory    |
| Worker   | All member access + post content, approve testimonies     |
| Admin    | Full access: financials, approvals, settings, voice rooms |

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running

### 2. Clone / Extract
```bash
# If downloaded as ZIP:
unzip te-website.zip
cd te-website
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Open .env and fill in your values:
nano .env   # or use any text editor
```

**Required fields in .env:**
| Variable | What to put |
|---|---|
| `DATABASE_URL` | Your PostgreSQL URL e.g. `postgresql://postgres:password@localhost:5432/te_website` |
| `JWT_SECRET` | A random string (run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`) |
| `PAYSTACK_SECRET_KEY` | From https://dashboard.paystack.com — Settings → Developer |
| `PAYSTACK_PUBLIC_KEY` | Same page as above |
| `EMAIL_HOST` / `EMAIL_USER` / `EMAIL_PASS` | For Gmail, use App Password (Google → Security → 2FA → App Passwords) |

### 5. Set Up the Database
```bash
# This creates all tables and seeds the default admin account
npm run setup-db
```

**Default Admin Login (change after first login!):**
- **Email:** Admin@transformationencounter.org
- **Password:** Admin@123456

### 6. Start the Server
```bash
# Production
npm start

# Development (auto-restarts on file changes)
npm run dev
```

Open your browser at: **http://localhost:3000**

---

## 📁 File Structure & Where to Edit

```
te-website/
├── server/
│   ├── index.js           ← Main server + Socket.io + WebRTC signaling
│   ├── app.js             ← Express setup + all route imports
│   ├── routes/            ← ONE FILE PER FEATURE:
│   │   ├── auth.js        ← Login, register, JWT
│   │   ├── feed.js        ← Home feed, posts, chat messages
│   │   ├── prayers.js     ← Prayer requests + prayer wall
│   │   ├── testimonies.js ← Testimonies + approval
│   │   ├── events.js      ← Events + RSVP
│   │   ├── giving.js      ← Paystack payments + dues
│   │   ├── sermons.js     ← Sermon uploads + bookmarks
│   │   ├── members.js     ← Profile, directory, milestones
│   │   ├── notifications.js ← In-app notifications
│   │   ├── polls.js       ← Community polls + voting
│   │   ├── questions.js   ← Q&A
│   │   ├── resources.js   ← Docs, flyers, gallery, lyrics
│   │   ├── celebrations.js← Birthday + celebrations
│   │   ├── misc.js        ← Scripture, prayer points, fasting, tasks
│   │   └── admin.js       ← All admin-only routes
│   ├── middleware/
│   │   ├── auth.js        ← JWT verification middleware
│   │   └── roles.js       ← Role checking (requireRole)
│   ├── jobs/
│   │   ├── mailer.js      ← Nodemailer email sender
│   │   ├── notifications.js ← Notification helpers
│   │   └── cron.js        ← Daily cron jobs (birthdays, devotionals)
│   └── config/
│       └── db.js          ← PostgreSQL pool connection
│
├── database/
│   ├── schema.sql         ← ALL table definitions (run manually or via setup.js)
│   └── setup.js           ← Creates tables + seeds default admin
│
├── public/
│   ├── index.html         ← Visitor landing page
│   ├── login.html         ← Login page
│   ├── register.html      ← Registration page
│   ├── css/
│   │   ├── main.css       ← Global styles, variables, components
│   │   ├── visitor.css    ← Landing page styles
│   │   ├── member.css     ← Member/Worker dashboard styles
│   │   └── admin.css      ← Admin panel styles
│   ├── js/
│   │   └── api.js         ← Frontend API client + Toast + Utils + Modal
│   ├── member/            ← ALL MEMBER PAGES (see full list below)
│   ├── admin/             ← ALL ADMIN PAGES (see full list below)
│   └── worker/            ← Worker-specific pages (redirected from member/)
│
├── uploads/               ← Auto-created; stores uploaded files
├── package.json           ← Dependencies
├── .env.example           ← Environment variable template
└── README.md              ← This file
```

### Member Pages (`public/member/`)
| File | Purpose |
|------|---------|
| `dashboard.html` | Home feed: posts, announcements, scripture |
| `prayer-requests.html` | Submit & view prayer requests |
| `prayer-wall.html` | Sticky-note style public prayer board |
| `prayer-points.html` | Daily prayer points from workers |
| `prayer-room.html` | WebRTC voice room for prayer |
| `testimonies.html` | Browse & submit testimonies |
| `events.html` | Events calendar + RSVP |
| `sermons.html` | Sermon archive + audio player |
| `giving.html` | Monthly dues + Paystack payment |
| `chat.html` | Real-time Socket.io group chat |
| `profile.html` | Edit profile, upload photo, milestones |
| `directory.html` | Browse all approved members |
| `celebrations.html` | Birthdays, anniversaries, special events |
| `notifications.html` | All in-app notifications |
| `questions.html` | Ask spiritual questions + answers |
| `polls.html` | Community polls |
| `bible-plan.html` | Enroll in Bible reading plans |
| `fasting.html` | Fasting periods + join |
| `resources.html` | Documents, flyers, gallery, worship lyrics |
| `post-content.html` | (Workers) Post announcements, set scripture |
| `approve-testimonies.html` | (Workers) Review & approve testimonies |
| `manage-prayers.html` | (Workers) Respond to prayer requests |
| `workers-room.html` | (Workers) Private workers chat + tasks |

### Admin Pages (`public/admin/`)
| File | Purpose |
|------|---------|
| `index.html` | Admin dashboard overview |
| `members.html` | View/filter all members, change roles, suspend |
| `approvals.html` | Approve or reject new member applications |
| `financials.html` | All transactions, set monthly dues, dues status |
| `testimonies.html` | Approve/reject/delete testimonies |
| `notifications.html` | Send broadcast notifications to members |
| `voice-rooms.html` | Open/close prayer voice rooms |
| `settings.html` | Ministry info, Paystack key, registration settings |

---

## 💳 Paystack Setup

1. Go to [https://dashboard.paystack.com](https://dashboard.paystack.com)
2. Create a free account → go to Settings → Developer
3. Copy your **Public Key** and **Secret Key**
4. Put them in your `.env` file
5. The system handles payment verification automatically

**Test cards for development:**
- Card: `4084 0840 8408 4081`
- CVV: `408` | Expiry: any future date | OTP: `123456`

---

## 📧 Email Setup (Gmail)

1. Go to your Google Account → Security → 2-Step Verification (enable it)
2. Go to App Passwords → Select app: Mail → Generate
3. Copy the 16-character password
4. Put it as `EMAIL_PASS` in your `.env`
5. Put your Gmail as `EMAIL_USER`

---

## 🔧 Common Commands

```bash
# Start in production
npm start

# Start in development (auto-reload)
npm run dev

# Reset and re-seed database (WARNING: deletes all data)
npm run setup-db

# Install all dependencies
npm install
```

---

## 🔐 Security Notes

- **Change the default admin password** immediately after first login
- Use a strong `JWT_SECRET` (at least 64 random characters)
- In production, set `NODE_ENV=production` in your `.env`
- Use HTTPS in production (consider Nginx reverse proxy)
- All routes are protected by JWT authentication
- Financial data is restricted to Admin role only

---

## 🌐 Deployment (Production)

To host this website publicly:

1. Get a server (e.g. DigitalOcean, Render, Railway)
2. Install Node.js + PostgreSQL on the server
3. Upload your files
4. Set environment variables (don't upload `.env` to public repos)
5. Run `npm run setup-db` once
6. Run `npm start` (or use PM2: `pm2 start server/index.js`)
7. Set up Nginx to proxy port 3000 → port 80/443
8. Add SSL certificate (Let's Encrypt is free)

---

## 📞 Support

Built for **Transformation Encounter Group**  
Lead Steward: **Joseph Omikunle**

For technical issues, check the server logs:
```bash
npm run dev   # See all errors in the terminal
```

---

*"For where two or three gather in my name, there am I with them." — Matthew 18:20* 🙏
