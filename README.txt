# AI Notes Pro — Setup Guide
# ════════════════════════════

## FOLDER STRUCTURE
ai-notes-pro/
├── server.js
├── package.json
├── .env
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   └── aiController.js
├── models/
│   ├── User.js
│   ├── History.js
│   └── QuizResult.js
├── routes/
│   ├── authRoutes.js
│   └── aiRoutes.js
├── services/
│   └── nlpService.js
├── views/
│   ├── layout.ejs
│   ├── index.ejs
│   ├── login.ejs
│   ├── register.ejs
│   ├── dashboard.ejs
│   ├── result.ejs
│   ├── quiz.ejs
│   ├── history.ejs
│   ├── progress.ejs
│   └── error.ejs
├── public/
│   ├── css/style.css
│   └── js/main.js
└── uploads/   (auto-created)


## STEP 1 — Install dependencies
npm install


## STEP 2 — Set up .env
Create a .env file in root with:
  PORT=3000
  MONGO_URI=mongodb://127.0.0.1:27017/ai-notes-pro
  SESSION_SECRET=any_random_long_string_here
  GEMINI_API_KEY=your_gemini_key_here

Get Gemini API key free at: https://aistudio.google.com


## STEP 3 — Start MongoDB
Make sure MongoDB is running:
  mongod    (or start via MongoDB Compass)


## STEP 4 — Run the app
  npm run dev       (development with auto-reload)
  npm start         (production)


## STEP 5 — Open in browser
  http://localhost:3000


## NEW FEATURES IN V2
✅ Interactive quiz with scoring + timer
✅ Progress analytics dashboard (Chart.js)
✅ PDF export (Summary + MCQs + Flashcards)
✅ TF-IDF keyword extraction (no API)
✅ TextRank extractive summarization (no API)
✅ Cosine similarity — Related notes
✅ Flesch-Kincaid readability score
✅ PDF file upload support
✅ Difficulty levels (easy/medium/hard)
✅ Dark mode
✅ Study streak tracking
✅ Search in history


## DEPLOYMENT (free)
1. Push to GitHub
2. Go to https://railway.app
3. Connect GitHub repo
4. Add environment variables
5. Deploy — live URL in 2 mins!
