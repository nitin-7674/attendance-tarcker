# Student Attendance Tracker

Version 1 of a multi-user, semester-based attendance application. Each class
period is tracked independently, including overlapping and back-to-back periods.

## Stack

- Frontend: React, TypeScript, Vite, React Router and plain CSS
- Backend: Node.js, Express, CommonJS, MongoDB and Mongoose
- Validation and security: Zod, secure server sessions, Helmet and rate limiting
- Files: CSV and XLSX template import, preview/commit and downloads

## Prerequisites

- Node.js 24 or a compatible current LTS release
- npm 11+
- MongoDB available locally or through a private connection string

MongoDB is not bundled with this repository. The default development connection
is `mongodb://127.0.0.1:27017/student_attendance_tracker`.

## Local setup

1. Install and start MongoDB.
2. Copy `backend/.env.example` to `backend/.env`.
3. Replace `SESSION_SECRET` with a random value of at least 32 characters.
4. Run `npm install` from the repository root.
5. Run `npm run dev`.

The frontend is available at `http://localhost:5173`. Vite proxies `/api` to the
backend at `http://localhost:4000`.

## Docker setup

With Docker Desktop running, build and start the complete stack with:

```powershell
docker compose up --build -d
```

This starts MongoDB with a persistent named volume, the Express API on port
`4000`, and the production-built frontend on `http://localhost:5173`. The Nginx
frontend container proxies `/api` requests to the backend container.

Inspect the stack with `docker compose ps` and stop it with
`docker compose down`. The MongoDB volume is retained when the containers stop.

## Quality commands

- `npm run lint` checks both applications.
- `npm test` runs backend and frontend tests.
- `npm run build` creates the production frontend bundle and checks backend entry points.
- `npm audit --omit=dev` checks production dependencies for known advisories.

## Version 1 features

- Self-registration and Mongo-backed secure sessions
- Owner-scoped semesters, subjects and recurring timetable periods
- In-place corrections for semesters, subjects and future timetable entries
- Effective-dated timetable changes that preserve all earlier class records
- Reversible subject and timetable archiving, plus semester reopening
- Exact-template CSV/XLSX batch import for subjects and timetable periods
- Effective-dated schedules with independent overlapping periods
- Lazy daily schedules and inferred `PENDING` attendance
- Explicit `PRESENT` and `ABSENT` records with overlap confirmation
- Holidays, extra classes and date navigation
- Period-weighted dashboard calculations and target guidance
- Duty Leave applications, approval and separate absence credits
- Exact-template CSV/XLSX import with preview and idempotent commit
- Active-semester CSV export
- Restricted, read-only, owner-scoped query console
- Download-only semester workbook preparation
- No-op cache interface for future Redis support

## Import template

Subject and timetable templates are available directly on their respective pages in both CSV and Excel formats. A batch is fully validated before records are created; if any row is invalid, the response identifies the row and nothing is imported.

Subject headers must be exactly:

`Name, Code, Target Percentage`

- Name is required.
- Code is optional but must be unique among active subjects.
- Target Percentage accepts 1-100 and defaults to 75 when blank.

Timetable headers must be exactly:

`Subject, Day, Start Time, End Time, Type, Teacher, Room, Effective From, Effective To`

- Subject accepts an active subject code or exact subject name.
- Day accepts Monday-Sunday or 1-7, with Monday as 1.
- Times use 24-hour `HH:MM`.
- Type accepts `L`, `Lecture`, `P`, or `Practical`.
- Effective dates use `YYYY-MM-DD`; Effective To is optional.

### Attendance import

The six headers must be exactly:

`Date, Time, Type, Attendance, Name, Block Reason`

- Date: `YYYY-MM-DD`
- Time: `HH:MM-HH:MM`
- Attendance: `PRESENT`, `ABSENT`, `P` or `A`
- Type and Name are optional and may be enriched from the timetable
- Matching uses the selected subject plus Date and Time

The preview performs no writes. Conflicting existing attendance is never
overwritten by an import.

## Version 1 archive policy

Completing a semester prepares an owner-authorized multi-sheet Excel download.
All detailed records remain in MongoDB. Version 1 contains no GCP IDs, bucket
names, cloud credentials, cloud SDK configuration or live-data cleanup.

Cloud upload, verification and post-upload MongoDB cleanup remain Version 2 work.

## Query console

The Query console is a guided, read-only interface. It loads its collection names, approved fields, value types, operators, examples and maximum result limit from the backend so the on-screen reference always matches the server rules.

- Filters are JSON objects; multiple top-level fields are combined with AND.
- Supported operators are `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte` and `$in`.
- Ownership and semester filters are injected automatically and cannot be overridden.
- Pending attendance is not stored, so `attendanceRecords` contains only explicit `PRESENT` and `ABSENT` records.
- Results can be projected, sorted, limited, viewed as a table and expanded as raw JSON.

