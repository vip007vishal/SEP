# Smart Exam Planner - Backend API

This folder contains the complete Node.js, Express, and PostgreSQL backend for the Smart Exam Planner application.

## ⚠️ Important
This is a real, database-driven backend. Before you can run it, you **MUST** set up a PostgreSQL database and configure your environment variables.

---

### Step 1: Set Up the PostgreSQL Database

1.  **Connect to Your Database:** Use a tool like `psql`, DBeaver, or Postico to connect to your PostgreSQL instance using the credentials you provided:
    *   **Host:** `postgres.kws.services`
    *   **Port:** `5432`
    *   **User:** `sep`
    *   **Password:** (Your database password)
    *   **Database Name:** (e.g., `sep`)

2.  **Create the Schema:** Execute the following SQL script in your database. This will create all the necessary tables for the application to function.

```sql
-- Create a custom type for user roles
CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- Users Table: This will be linked to Firebase Authentication UIDs
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE, -- Email is not unique for students, can be null
    "password" TEXT, -- Can be null for students
    "role" user_role NOT NULL,
    "institutionName" TEXT,
    "permissionGranted" BOOLEAN DEFAULT FALSE,
    "adminId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "registerNumber" TEXT
);

-- Exams Table
CREATE TABLE "exams" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "halls" JSONB NOT NULL,
    "studentSets" JSONB NOT NULL,
    "seatingPlan" JSONB,
    "aiSeatingRules" TEXT,
    "seatingType" TEXT DEFAULT 'normal',
    "editorMode" TEXT DEFAULT 'ai',
    "createdBy" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "adminId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
);

-- NOTE: Template tables are not fully implemented in the backend server code yet.
-- You can add them later if needed.
/*
CREATE TABLE "hall_templates" ( ... );
CREATE TABLE "student_set_templates" ( ... );
*/

-- Add an index for faster lookups on student register numbers
CREATE INDEX idx_users_register_number ON users("registerNumber");
```

---

### Step 2: Configure Environment Variables

For security, the application configuration is managed through environment variables, not hardcoded.

1.  **Create a `.env` file:** In this `backend/` directory, create a new file named `.env`.
2.  **Add Configuration:** Copy and paste the following into your `.env` file, replacing the placeholder values with your actual credentials.

```env
# ---------------------------------
# POSTGRESQL DATABASE CONFIGURATION
# ---------------------------------
DB_HOST=postgres.kws.services
DB_PORT=5432
DB_USER=sep

# ⚠️ IMPORTANT: Replace with your actual database password
DB_PASSWORD=YOUR_DATABASE_PASSWORD_HERE

# ⚠️ IMPORTANT: Replace with your actual database name
DB_NAME=sep

# Set to true if your database requires SSL (many cloud providers do)
DB_SSL=false

# ---------------------------------
# SECURITY AND API KEYS
# ---------------------------------
# A long, random string used to sign authentication tokens
# You can generate one from https://randomkeygen.com/
JWT_SECRET=YOUR_SUPER_SECRET_RANDOM_STRING_HERE

# ⚠️ IMPORTANT: Your Google Gemini API Key for AI Seating Plan generation
# Get this from Google AI Studio
API_KEY=YOUR_GEMINI_API_KEY_HERE

# ---------------------------------
# SERVER CONFIGURATION
# ---------------------------------
# The port the backend server will run on
PORT=4000
```

---

### Step 3: Install Dependencies and Run the Server

You need to have Node.js installed on your system.

1.  **Open a terminal** and navigate into this `backend/` directory.
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the server in development mode:** This will use `ts-node` to run the TypeScript code directly and `nodemon` to automatically restart the server when you make changes.
    ```bash
    npm run dev
    ```
4.  **Access the API:** The server will now be running, typically at `http://localhost:4000`. Your frontend application (running separately) can now make requests to it.

---

### Step 4: Building for Production

When you are ready to deploy this backend to a hosting service:

1.  **Compile the TypeScript:**
    ```bash
    npm run build
    ```
    This will create a `dist` folder containing the compiled JavaScript code.
2.  **Run the compiled code:**
    ```bash
    npm start
    ```
    You will upload the entire project folder to your hosting provider, but their startup command should run `npm start`. Remember to set up the same environment variables on your production server.
```
