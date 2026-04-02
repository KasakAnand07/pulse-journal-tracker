# Pulse Journal Tracker

Pulse Journal Tracker is a visually rich personal productivity app for managing study tasks, expenses, and private diary entries in one place.

## Highlights

- Animated dashboard with light and dark mode
- Custom tracker categories that users can edit
- To-do and tracker views with filters, priorities, deadlines, and completion states
- Progress bars, streak cards, and weekly pulse overview
- Expense logging with persistent local storage
- Password-gated diary with searchable entries and internal reading panel scroll
- Responsive layout built for desktop and mobile

## Tech Stack

- React
- Vite
- Plain CSS with a custom visual system
- Browser localStorage for persistence

## Getting Started

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Project Structure

- `src/App.jsx`: main application logic and UI flow
- `src/styles.css`: full visual system, responsive layout, and animations
- `public/logo.svg`: browser tab logo / favicon
- `index.html`: app metadata and entry HTML

## Notes

- Diary protection is local password-gating for personal privacy, not full encryption.
- All saved data stays in the browser on the current device unless cleared manually.

## Deployment

This project is ready for static deployment on platforms like Vercel, Netlify, or GitHub Pages.

Typical flow:

1. Push the project to GitHub
2. Import the repository into your hosting platform
3. Use the default Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
