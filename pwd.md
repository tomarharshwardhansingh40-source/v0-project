SkillPath AI: Product Requirements Document
A complete MERN MVP for a student skill gap analyzer, scoped for a solo beginner using an AI coding assistant.
1. Project overview and problem statement
Students applying for internships often do not know which skills they are missing. SkillPath AI lets a student pick a target role, list their current skills and daily study time, and receive an AI-generated skill gap report with a seven-day learning roadmap and project ideas. Every report is saved to the student's account.
Honest scope check. Auth, database, AI, validation and six pages in 60 minutes is very tight for a beginner, even with an AI assistant. The plan below keeps every required component but builds the simplest version of each.
•	Likely within 60 minutes: Phases 1 to 4 (running locally, end to end), most of Phase 5.
•	Not guaranteed: Phase 6 (deployment). Cross-site cookies, Atlas network access and free-tier cold starts commonly take 20 to 40 minutes on their own.
•	Fallback that keeps the core: a fully working local app (acceptance criteria 1 to 12 are all testable locally). Deployment is then done in a second session. Deployment is never claimed successful until the live URL passes the smoke test in Phase 6.
2. User stories and user journey
User stories
•	As a student, I can register and log in so my reports are private to me.
•	As a student, I can choose a target role and enter my skills so the app knows where I stand.
•	As a student, I get missing skills ranked by priority, each with a reason, so I know what to learn first.
•	As a student, I get a seven-day plan sized to my daily study time so I can start today.
•	As a student, I get project ideas that practice my missing skills so I can build proof for my resume.
•	As a student, I can reopen or delete past reports so I can track my progress.
Journey: Landing page, Register, Dashboard (welcome, form, history), Generate (loading state), Results page, History, open or delete a report, Logout.
3. MVP functional requirements
ID	Area	Requirement
A1	Auth	Register with name, email, password. Duplicate email returns a clear error.
A2	Auth	Login and logout. Passwords hashed with bcrypt. Session is a JWT in an HTTP-only cookie.
A3	Auth	Auth middleware protects the dashboard and all analysis routes. Expired or invalid sessions return 401 and the UI redirects to login.
B1	Dashboard	Personalized welcome, role dropdown, skills input, daily study time, Generate button, list of the user's previous analyses.
C1	AI	Backend sends the role's curated requirements plus the student's skills to Gemini and gets structured JSON back.
C2	AI	Output is validated on the server before saving. Malformed output, API errors and rate limits show clear messages.
D1	Roadmap	Seven days, each with topic, task and estimated minutes. Two to three project recommendations.
D2	Persistence	Analyses are saved in MongoDB and can be opened or deleted later.
E1	Ownership	Every analysis query is filtered by the authenticated user's id.
F1	UI	Landing, Register, Login, Dashboard, Results, History. Loading, empty and error states on every data screen.
Curated role requirements. The server holds a fixed list of roles in server/data/roles.js, each with about 10 required skills. Suggested roles: Frontend Developer, Backend Developer, Full-Stack Developer, Data Analyst, Machine Learning Intern. The role field must match one of these keys. Free-text roles are not accepted in the MVP.
4. Non-functional requirements
•	Security first: no secrets in the repo, no plaintext passwords, identity only from the session.
•	Performance: analysis returns in under 20 seconds (Gemini call is the bottleneck). Other endpoints under 500 ms.
•	Reliability: one retry on a Gemini failure, then a clear error. No fake or mock AI results at any point.
•	Limits: JSON body limit 10 KB. Skills capped at 30 items of 40 characters each.
•	Usability: responsive layout down to 360 px wide. Keyboard-usable forms with visible labels.
•	Maintainability: one file per route group, no service layers, no TypeScript, no Redux, no Docker.
5. Architecture and data flow
Browser (React + Vite)
   |  fetch with credentials: include
   v
Express API  ->  middleware: helmet, cors, json(10kb), cookie-parser, rate limits
   |-> /api/auth/*       -> bcrypt + JWT cookie -> MongoDB (User)
   |-> /api/analyses/*   -> requireAuth -> validate -> Gemini (server only) -> validate output -> MongoDB (Analysis)
   '-> /api/health
Analyze flow
1.	The student submits role, skills and daily minutes.
2.	The server checks the cookie (identity comes from the JWT, never from the request body).
3.	The server validates and sanitizes the input and looks up the curated skills for the role.
4.	The server sends the Gemini prompt, with the student's text placed inside a clearly delimited data block.
5.	The server parses the JSON and validates the shape and limits.
6.	The server saves the Analysis with user = req.user.id and returns it.
Dev versus production cookies. In development, the Vite proxy forwards /api to Express, so the app is same-origin and a SameSite=Lax cookie works. In production with frontend and backend on different domains, the cookie needs SameSite=None; Secure, and some browsers block third-party cookies. The reliable fix is to make /api same-origin using a rewrite on the frontend host (see section 14).
6. Database schemas (Mongoose)
User
Field	Type	Rules
name	String	required, trimmed, 2 to 50 characters
email	String	required, unique, lowercase, valid format
password	String	bcrypt hash, select: false
createdAt, updatedAt	Date	timestamps
Analysis
Field	Type	Rules
user	ObjectId (ref User)	required, indexed
targetRole	String	one of the curated role keys
currentSkills	[String]	max 30
dailyMinutes	Number	15 to 720
skillGaps	[{ skill, priority, reason }]	priority is high, medium or low
sevenDayRoadmap	[{ day, topic, task, estimatedMinutes }]	exactly 7 entries, day 1 to 7
projectRecommendations	[{ title, description, skillsPracticed }]	2 to 3 entries
overallAssessment	String	max 1000 characters
createdAt, updatedAt	Date	timestamps
The unique index on email is the final guard against duplicate registration, even if two requests race.
7. API specification
All errors use the shape { "error": "human readable message" }. All other bodies are JSON.
Endpoint	Auth	Request	Success	Errors
POST /api/auth/register	no	{name, email, password} (password 8 to 72 characters)	201 {user:{id,name,email}} and sets cookie	400 invalid input, 409 email already registered
POST /api/auth/login	no	{email, password}	200 {user} and sets cookie	400 missing fields, 401 invalid credentials (same message for unknown email and wrong password)
POST /api/auth/logout	no	none	200 {message} and clears cookie	none
GET /api/auth/me	yes	none	200 {user}	401 not logged in or session expired
POST /api/analyses	yes	{targetRole, currentSkills[], dailyMinutes}	201 {analysis}	400 invalid input, 401, 429 too many requests, 502 AI returned invalid output, 503 AI unavailable
GET /api/analyses	yes	none	200 {analyses:[summary]} newest first, own only	401
GET /api/analyses/:id	yes	none	200 {analysis}	400 bad id, 401, 404 not found or not yours
DELETE /api/analyses/:id	yes	none	200 {message}	400, 401, 404 not found or not yours
GET /api/health	no	none	200 {ok:true, db:"connected"}	503 if the database is down
Unowned ids return 404, not 403, so the API does not reveal which ids exist.
8. Authentication and security design
•	Passwords: bcrypt (bcryptjs, cost 10) before saving. Minimum 8 characters, maximum 72 (the bcrypt limit).
•	Session: JWT signed with JWT_SECRET, payload is only the user id, expiry 1 day. Stored in a cookie with httpOnly: true, secure in production, sameSite: lax in development and none in production (or lax if same-origin via rewrite), and a maxAge that matches the token.
•	Middleware requireAuth: reads the cookie, verifies the token, loads the user id into req.user. A missing, invalid or expired token returns 401. The frontend sends the user to login on any 401.
•	Identity: never read a user id from the request body, query or URL. Every analysis query filters by { _id, user: req.user.id }.
•	Input: trim and length-check every string, validate email format, check ObjectId format for :id, accept only role keys from the curated list, cap array sizes. Responses are JSON only and React escapes output by default.
•	Abuse limits: express-rate-limit, about 20 attempts per 15 minutes on login and register, and about 10 analyses per hour per user on POST /api/analyses.
•	Headers and CORS: helmet. CORS allows only CLIENT_ORIGIN with credentials: true.
•	Secrets: .env and node_modules in .gitignore before the first commit. Only .env.example is committed. If a secret is ever committed, rotate it, since deleting the file does not remove it from git history.
•	Prompt injection: the student's skills go into the prompt as data and the model is told to ignore any instructions inside it. The output is validated and is never used for a database query or an authorization decision.
9. Gemini integration design
•	Called only from the Express backend using GEMINI_API_KEY. The key never reaches the browser.
•	The model name comes from GEMINI_MODEL. Check Google AI Studio for the current free-tier model at build time, since model names and limits change.
•	Prompt contents: the role and its curated required skills, the student's skills, the daily minutes, a seven-day limit per day based on daily minutes, and an exact JSON schema. The prompt asks for JSON only, no markdown.
•	Structured output: request JSON (response MIME type application/json) and still parse defensively, stripping code fences if present.
•	Validation before saving: targetRole and currentSkills come from the validated request, not from the model. The server checks that skillGaps is an array with valid priorities and strings under length limits, that sevenDayRoadmap has exactly 7 days numbered 1 to 7 with estimatedMinutes between 10 and dailyMinutes, that there are 2 to 3 projects, and that overallAssessment is a string under 1000 characters. Anything else is rejected.
•	Failure handling: one retry on a network or 5xx error, 429 from Gemini becomes a 503 with "The AI service is busy, try again in a minute", invalid JSON or shape becomes a 502 with "The AI returned an unusable answer, please try again". Nothing is saved on failure.
Target response shape
{
  "skillGaps": [{ "skill": "React", "priority": "high", "reason": "..." }],
  "sevenDayRoadmap": [{ "day": 1, "topic": "...", "task": "...", "estimatedMinutes": 90 }],
  "projectRecommendations": [{ "title": "...", "description": "...", "skillsPracticed": ["React"] }],
  "overallAssessment": "..."
}
10. UI pages and components
Route	Access	Contents
/	public	Landing: value pitch, Register and Login buttons
/register	public	Name, email, password form with inline errors
/login	public	Email, password form
/dashboard	protected	Welcome, analysis form, recent analyses, logout
/analyses/:id	protected	Results: gaps by priority, 7-day roadmap, projects, assessment, delete button
/history	protected	All analyses, newest first, open and delete
Components: Navbar, ProtectedRoute, AnalysisForm, AnalysisCard, GapList, RoadmapList, ProjectList, Loading, ErrorMessage, EmptyState. A small api.js wraps fetch with credentials: "include", JSON headers and one error format. Use React Router and a simple auth context that calls /api/auth/me on load.
11. Implementation phases and dependencies
Phase	Minutes	Deliverables	Depends on
1. Setup	0 to 10	Repo, .gitignore, server/ and client/ running, Atlas connected, /api/health shows db: connected, client shows backend status	Atlas account and cluster, Node 18+
2. Auth	10 to 25	User model, register, login, logout, me, requireAuth, login and register pages, protected route	Phase 1
3. Dashboard	25 to 35	Role data file, Analysis model, POST/GET/GET:id/DELETE routes with ownership (before AI), dashboard form and history UI	Phase 2
4. Gemini	35 to 48	Gemini helper, prompt, output validator, error mapping, rate limits, results page	Phase 3, Gemini API key
5. Test and fix	48 to 55	Full run of every acceptance test below, fix critical bugs	Phase 4
6. Deploy (stretch)	55 to 60 and beyond	Backend host, frontend host, production cookie settings, live smoke test	Phase 5
Dependencies by phase
•	Phase 1: server express mongoose cors dotenv cookie-parser helmet, dev nodemon. Client react react-dom with Vite.
•	Phase 2: server bcryptjs jsonwebtoken. Client react-router-dom.
•	Phase 4: server express-rate-limit, and @google/genai (or plain fetch to the Gemini REST endpoint if you want zero extra packages).
12. Acceptance tests
#	Test	Pass condition
1	Register a new user	201, user appears in Atlas
2	Inspect the password field in Atlas	Starts with $2, not the real password
3	Login, then logout	Cookie set on login, cleared on logout
4	Call GET /api/analyses without a cookie	401
5	Submit a role and skills	Analysis returned and shown
6	Real Gemini call (key set)	Gap reasons mention the submitted skills; not canned text
7	Check Atlas	New Analysis document with your user id
8	Refresh the page	Dashboard still lists your analyses
9	Open History	Only your analyses appear
10	Log in as user B, request or delete user A's analysis id	404 both times
11	Break things on purpose: empty skills, wrong password, stop the network, bad Gemini key	Each shows a clear message, no crash
12	git log -p and git status	No .env, no keys, only .env.example
13	Register the same email twice	409 with a clear message
14	Wait for or force token expiry	401 and redirect to login
13. Environment variables
server/.env
Variable	Purpose
PORT	API port, default 5000
NODE_ENV	development or production
MONGO_URI	MongoDB Atlas connection string
JWT_SECRET	Long random string, at least 32 characters
JWT_EXPIRES_IN	For example 1d
GEMINI_API_KEY	Google AI Studio key
GEMINI_MODEL	Current Gemini model name
CLIENT_ORIGIN	Frontend URL for CORS, for example http://localhost:5173
client/.env (production only): VITE_API_URL if the API is on a different domain. Leave it empty when using the Vite proxy or a same-origin rewrite.
Generate a secret with node -e "console.log(require('crypto').randomBytes(48).toString('hex'))".
14. Deployment plan and free-tier limitations
Plan: MongoDB Atlas (shared free cluster), backend on a Node host with a free tier (for example Render), frontend on a static host with a free tier (for example Vercel or Netlify).
Steps
1.	Atlas: create a database user and allow the backend host's network access. Free hosts use changing IPs, so this usually means allowing 0.0.0.0/0. That is acceptable for a student project only with a strong database password.
2.	Backend: root directory server, build npm install, start npm start. Set every server variable in the host dashboard with NODE_ENV=production.
3.	Frontend: root directory client, build npm run build, output dist. Add a rewrite from /api/* to the backend URL so the browser sees one origin. That avoids third-party cookie blocking.
4.	Set CLIENT_ORIGIN to the live frontend URL and redeploy.
5.	Smoke test on the live URL (register, login, analyze, refresh, logout) before saying it works.
Free-tier limits to expect (verify current terms before relying on them)
•	Free backend hosts typically sleep after inactivity, so the first request can take 30 to 60 seconds.
•	The free Atlas cluster has small storage and connection limits. Fine for a demo.
•	The free Gemini tier has per-minute and per-day request limits that can change, which is why analyses are rate limited and errors are explained.
•	Free tiers can change or disappear, so check each host's pricing page on the day you deploy.
15. Risks and fallback plans
Risk	Likelihood	Fallback
60 minutes is not enough for all phases	High	Local, end-to-end app after Phase 5 is the real finish line. Deploy in a second session.
Atlas connection fails (wrong string, network access, special characters in password)	Medium	URL-encode the password, check network access, test with mongosh or the health route first.
Gemini rate limit or outage	Medium	Show a clear retry message. Do not substitute fake results. Analyses already saved remain viewable.
Gemini returns malformed JSON	Medium	Defensive parsing, shape validation, one retry, then a 502 message.
Cookies not sent (CORS or SameSite)	High for beginners	Use the Vite proxy in development and a same-origin rewrite in production. Always use credentials: "include".
Secrets committed by mistake	Low	.gitignore first. If it happens, rotate the key.
AI assistant writes code that skips ownership checks	Medium	Acceptance test 10 is a mandatory gate before any deploy.
Scope creep into design polish	High	No styling work until acceptance tests 1 to 12 pass.

