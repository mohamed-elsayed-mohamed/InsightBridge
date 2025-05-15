# InsightBridge – AI-Powered Business Intelligence Assistant

## Project Description
InsightBridge is a smart, AI-driven dashboard builder designed for non-technical users. It allows users to connect to any database, ask natural language questions (e.g., "What were our top 5 products last quarter?"), and receive auto-generated visualizations, reports, and insights in real-time.

## Components Overview

### 🧱 Project Bootstrapping & Clean Architecture Setup (Full Stack)
- **Backend (/backend)**
  - Project structure across Domain, Application, Infrastructure, API
  - Libraries: MediatR, FluentValidation, AutoMapper, Serilog
  - SQL Server + EF Core + Migrations
  - Docker Compose for API, DB, Seq
  - GitHub Actions in /devops/.github/workflows
- **Frontend (/frontend)**
  - React + MUI + TypeScript
  - Organized by pages, components, services, hooks
  - Axios with JWT interceptors
  - React Router v6 with route guards
- **API Connection**
  - GET /api/health, GET /api/version (connect /frontend/services/api.ts to these endpoints)
- **Run Step:**
  - Start backend: docker-compose up -d
  - Start frontend: npm install && npm run dev
  - Visit /api/health and frontend homepage
  - ✅ Fix any build/runtime error until both run successfully

### 🔐 Authentication & Authorization
- **Backend (/backend/API, Application)**
  - JWT + refresh tokens, OAuth via Microsoft/Google
  - Role-based authorization (Admin, Analyst, Viewer)
- **Frontend (/frontend/pages/auth, services/authService.ts)**
  - Login/Register/ForgotPassword flows
  - Token storage + refresh handling
  - Admin page to manage users/roles
- **API Connection**
  - POST /api/auth/login, /register, /forgot-password, /reset-password
  - GET /api/users, PUT /api/users/{id}/roles
- **Run Step:**
  - Test login/register on frontend and check tokens in localStorage
  - Call /api/users and verify access control per role
  - ✅ Fix any error and retry until success

### 🔜 Database Connectivity & Schema Handling
- **Backend (/backend/Infrastructure, Application)**
  - Save/test DB credentials securely
  - Multi-tenant connection support
  - Auto-introspect schemas
- **Frontend (/frontend/pages/database, services/dbService.ts)**
  - Form to input and test DB connection
  - Schema explorer UI
- **API Connection**
  - POST /api/db/test-connection, /connect, /save-connection
  - GET /api/db/schemas, /connections
- **Run Step:**
  - Input a working DB connection, test and fetch schema
  - Validate response structure on frontend
  - ✅ Fix backend/DB errors until schema shows successfully

### 🧠 AI Query Engine
- **Backend (/backend/Application/AI)**
  - OpenAI SQL generation with prompt tuning
  - Chain of Responsibility pattern for query processing
- **Frontend (/frontend/pages/chat, components/ChatBox.tsx)**
  - Chat interface to submit questions and view responses
  - Display SQL + explanations
- **API Connection**
  - POST /api/ai/query, GET /api/ai/history, POST /api/ai/clarify
- **Run Step:**
  - Ask a question, check response + SQL + results
  - ✅ Ensure error handling and clarify retries are working

### 📊 Data Visualization & Dashboarding
- **Backend (/backend/Application/Visualization)**
  - Analyze result sets and suggest chart types
  - Cache and serve result sets
- **Frontend (/frontend/pages/dashboard, components/ChartBuilder.tsx)**
  - Auto-render charts using Recharts/Chart.js
  - Drag/drop layout and chart editing
- **API Connection**
  - POST /api/visualize, POST /api/dashboard/save, GET /api/dashboard
- **Run Step:**
  - Create chart, drag layout, save/load dashboard
  - ✅ Fix backend result parsing or UI rendering bugs

### 📰 Reporting & Exporting
- **Backend (/backend/Application/Export)**
  - PDF (PuppeteerSharp) and Excel generation
  - Schedule recurring reports
- **Frontend (/frontend/pages/reports, components/ExportButtons.tsx)**
  - Export and schedule UI with format selectors
- **API Connection**
  - POST /api/export/pdf, /excel, /schedule
  - GET /api/export/history
- **Run Step:**
  - Export report, open output file, check layout
  - ✅ Debug PDF/excel file formatting or missing data

### 📧 Email Notifications & Alerts
- **Backend (/backend/Infrastructure/Notifications)**
  - SendGrid/SMTP integration
  - Email triggers for export and alerts
- **Frontend (/frontend/pages/settings/email)**
  - Manage email preferences
  - Schedule alert conditions
- **API Connection**
  - POST /api/notifications/send, /schedule
  - GET /api/notifications/preferences
- **Run Step:**
  - Test email delivery, check inbox
  - ✅ Retry or fix SMTP config if failure

### 📟 Microsoft Teams Integration
- **Backend (/backend/Infrastructure/Teams)**
  - Graph API integration with OAuth
  - Send alerts as Teams cards
- **Frontend (/frontend/pages/settings/teams)**
  - Connect/test Teams integration
  - Select what to send + toggle alerts
- **API Connection**
  - POST /api/teams/connect, /send-message
  - GET /api/teams/config
- **Run Step:**
  - Trigger Teams message and verify appearance in channel
  - ✅ Fix auth/token/scopes if Teams fails

### 🎙 Voice Command Integration
- **Backend (/backend/Application/Voice)**
  - Whisper/OpenAI for speech-to-text
  - Route audio to query engine
- **Frontend (/frontend/components/VoiceCapture.tsx)**
  - Mic capture + transcript + submit to AI
- **API Connection**
  - POST /api/voice/transcribe, /query
- **Run Step:**
  - Record voice, receive transcript and result
  - ✅ Debug mic capture or backend model pipeline

### 🛠 DevOps & Deployment
- **Backend (/backend, /devops)**
  - Dockerize services with healthchecks
  - CI/CD pipelines using GitHub Actions
- **Frontend (/frontend)**
  - Multi-env builds via Vite or CRA config
  - Auto-deploy via Azure Static Web Apps or Netlify
- **API Connection**
  - N/A (infra only)
- **Run Step:**
  - Run pipeline via push and check logs + container health
  - ✅ Fix build, deployment, or startup errors

### 🌱 Database Seeding & Demo Mode
- **Backend (/backend/Seeding)**
  - Seed users, queries, dashboards
  - Admin endpoint or CLI reset
- **Frontend (/frontend/pages/demo)**
  - Demo mode banner + feature toggle
- **API Connection**
  - POST /api/demo/reset, GET /api/demo/status, POST /api/demo/login
- **Run Step:**
  - Enter demo mode and verify seeded data visibility
  - ✅ Fix seeder logic if objects are missing or erroring

## Project Folder Structure
```
/backend
  /Domain
  /Application
  /Infrastructure
  /API
  /Seeding
  /devops
    /.github
      /workflows
/frontend
  /pages
    /auth
    /database
    /chat
    /dashboard
    /reports
    /settings
      /email
      /teams
    /demo
  /components
    /ChartBuilder.tsx
    /ChatBox.tsx
    /ExportButtons.tsx
    /VoiceCapture.tsx
  /services
    /api.ts
    /authService.ts
    /dbService.ts
  /hooks
```

## Note
This project was built using Cursor and Copilot AI tools, with approximately 90% of the code generated by these tools.

## Project Structure

```
/InsightBridge
│
├── /backend
│   ├── InsightBridge.Domain
│   ├── InsightBridge.Application
│   ├── InsightBridge.Infrastructure
│   ├── InsightBridge.API
│   ├── InsightBridge.Seeding
│   └── docker-compose.yml
│
├── /frontend
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── App.tsx
│   └── vite.config.ts
│
├── /devops
│   ├── .github/workflows/
│   ├── Dockerfiles/
│   └── deployment/
│
└── /docs
    └── architecture.md
```

## Prerequisites

- .NET 8.0 SDK
- Node.js 18+ and npm
- Docker and Docker Compose
- SQL Server (if running locally)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Start the services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

3. The API will be available at:
   - API: http://localhost:5000
   - Swagger UI: http://localhost:5000/swagger
   - Seq Logging: http://localhost:5341

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. The frontend will be available at http://localhost:5173

## Development

- Backend follows Clean Architecture principles
- Frontend uses React with TypeScript and Material-UI
- API endpoints are documented using Swagger
- Logging is handled by Seq
- CI/CD pipeline is configured in GitHub Actions

## Testing

- Backend tests: `dotnet test`
- Frontend tests: `npm test`

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

MIT 