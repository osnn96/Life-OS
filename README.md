# LifeOS Dashboard 🚀

A personal productivity dashboard to manage daily tasks, job applications, master's degree applications, and Erasmus internships. Built with React, TypeScript, Tailwind CSS, and Firebase Firestore for real-time sync across devices.

## Features ✨

- 📋 **Task Manager** - Daily view & backlog with priority levels
- 💼 **Job Tracker** - Pipeline-style job application tracking
- 🎓 **Master's Applications** - Detailed university application tracker
- ✈️ **Erasmus Tracker** - Internship opportunity management
- 🔄 **Real-time Sync** - Firebase Firestore enables cross-device synchronization
- 📱 **Responsive Design** - Works seamlessly on mobile and desktop

## Tech Stack 🛠️

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Build Tool**: Vite
- **Icons**: Lucide React

## Setup Instructions 🔧

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/lifeos-dashboard.git
cd lifeos-dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Copy `services/firebase.example.ts` to `services/firebase.ts`
4. Replace the placeholder values with your Firebase config:

```typescript
// services/firebase.ts
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` (or the port shown in terminal)

## Firebase Firestore Collections 📊

The app uses the following collections:

- `tasks` - Daily tasks and backlog items
- `jobs` - Job application tracking
- `masters` - Master's degree applications
- `erasmus` - Erasmus internship applications

## Deployment 🚀

### Deploy to Vercel/Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist/` folder

3. Set environment variables in your deployment platform (if using `.env` instead of `firebase.ts`)

## Security Note 🔒

**Never commit `services/firebase.ts` to GitHub!** This file contains your Firebase credentials. The `.gitignore` file is configured to exclude it.

## Contributing 🤝

This is a personal project, but feel free to fork and customize for your own use!

## License 📄

MIT License - Feel free to use this project as inspiration for your own productivity dashboard!

---

Built with ❤️ for personal productivity