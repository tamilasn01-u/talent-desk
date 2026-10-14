# talent-desk
An HR portal for managing candidates, resumes, and job postings.

# AI-Powered Resume Screening and Job Matching System

Local Java Spring Boot service that lets HR upload candidate resumes, extract structured profile data, and match candidates to job postings.

This first slice ships **project setup, database entities, repositories, and basic REST APIs**. PDF text extraction, AI parsing, and the matching engine are next.

## Workflow

```
HR
 │
 ▼
Upload Resume (PDF)
 │
 ▼
Spring Boot API
 │
Extract resume text
 │
 ▼
AI API
 │
 ┌─────────┼─────────┐
 ▼         ▼         ▼
Skills  Experience  Education
 │         │         │
 └─────────┼─────────┘
           ▼
    Matching Engine
           │
           ▼
  Candidate Analysis
```

| Step | This slice | Next slices |
| --- | --- | --- |
| HR creates a candidate | Implemented | — |
| HR posts a job | Implemented | — |
| HR uploads a PDF resume | File is stored; metadata saved | — |
| Extract resume text | Status field ready (`UPLOADED`) | PDFBox / parser |
| AI API → skills, experience, education | Tables ready | OpenAI (or similar) client |
| Matching engine + score + explanation | `job_matches` table ready | Scoring + AI explanation |

## Architecture

Layered Spring Boot design:

```
controller  →  REST endpoints, request validation
service     →  business rules and orchestration
repository  →  Spring Data JPA
entity      →  MySQL tables
dto         →  API request/response contracts
exception   →  global error responses
config      →  upload path and app settings
```

Package: `com.airesume.screening`

```
src/main/java/com/airesume/screening/
  controller/
  service/
  repository/
  entity/
  dto/
  exception/
  config/
```

### Domain model

- **Candidate** — person HR is screening
- **Resume** — uploaded PDF, storage path, extracted text, processing status
- **ResumeSkill / Skill** — skills linked to a resume (filled after AI parsing)
- **Experience** — work history extracted from the resume
- **Education** — education history extracted from the resume
- **JobPosting** — role to match against, with required skills
- **JobMatch** — score and explanation from the matching engine (not populated yet)

## Tech stack

- Java 21
- Spring Boot 3.4
- Maven
- MySQL
- Spring Web, Validation, Data JPA
- Lombok

## Prerequisites

- JDK 21
- Maven 3.9+
- MySQL 8 running locally

## Setup

Set the `DB_PASSWORD` environment variable for your MySQL password. Do not store database credentials in version-controlled files.

1. Create the database (optional; the JDBC URL can also create it):

```sql
CREATE DATABASE IF NOT EXISTS resume_screening;
```

2. Edit `src/main/resources/application.properties`:

```properties
spring.datasource.username=root
spring.datasource.password=your-password
```

Default connection:

```
jdbc:mysql://localhost:3306/resume_screening
```

Uploaded PDFs are stored under `uploads/resumes/` (gitignored).

## Run

```bash
mvn spring-boot:run
```

The API listens on [http://localhost:108](http://localhost:108) with the current local configuration (`server.port`).

## TalentAI frontend

The React + Vite frontend lives in `frontend/` and currently uses mock data. It runs separately from the Spring Boot API while the API integration is pending. `frontend/src/services/apiClient.js` defines the REST boundary for the existing Spring endpoints.

```bash
cd frontend
npm install
npm run dev
```

Vite prints the local URL when it starts (normally [http://localhost:5173](http://localhost:5173)). The UI includes the dashboard, candidates and profile views, resume intake, AI analysis, jobs, analytics, assistant, settings, and a mock login flow.

## Basic APIs

### Candidates

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/candidates` | Create candidate |
| GET | `/api/candidates` | List candidates |
| GET | `/api/candidates/{id}` | Get candidate |
| PUT | `/api/candidates/{id}` | Update candidate |
| DELETE | `/api/candidates/{id}` | Delete candidate |

```json
POST /api/candidates
{
  "fullName": "Ada Lovelace",
  "email": "ada@example.com",
  "phone": "+1-555-0100",
  "location": "London"
}
```

### Resume upload

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/candidates/{candidateId}/resumes` | Upload PDF (`multipart/form-data`, field `file`) |
| GET | `/api/candidates/{candidateId}/resumes` | List resumes for a candidate |
| GET | `/api/resumes/{resumeId}` | Get resume metadata |

Example:

```bash
curl -X POST http://localhost:8080/api/candidates/1/resumes \
  -F "file=@resume.pdf"
```

Text extraction is **not** run yet. The resume is saved with status `UPLOADED`.

### Jobs

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/jobs` | Create job posting |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/{id}` | Get job |
| PUT | `/api/jobs/{id}` | Update job |
| DELETE | `/api/jobs/{id}` | Delete job |

```json
POST /api/jobs
{
  "title": "Backend Engineer",
  "company": "Acme",
  "description": "Build REST APIs in Java.",
  "location": "Remote",
  "minExperienceYears": 3,
  "status": "OPEN",
  "requiredSkills": ["java", "spring boot", "mysql"]
}
```

## Next implementation order

1. PDF text extraction into `resumes.extracted_text`
2. AI parsing into skills, experience, and education
3. Matching engine: resume vs job → score + explanation
4. Candidate analysis APIs for HR

## Tests

```bash
mvn test
```

Tests use an in-memory H2 database (`src/test/resources/application-test.properties`).
