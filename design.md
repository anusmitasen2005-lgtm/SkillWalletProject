# Skill Wallet Project - Design Document

## 1. System Architecture

### 1.1 High-Level Architecture
```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ HTTPS
       │
┌──────▼──────────────────────────────┐
│     API Gateway / Load Balancer     │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│      Application Server Layer       │
│  ┌────────────┐  ┌────────────┐    │
│  │   Auth     │  │   API      │    │
│  │  Service   │  │  Service   │    │
│  └────────────┘  └────────────┘    │
└──────┬──────────────────────────────┘
       │
┌──────▼──────────────────────────────┐
│         Data Layer                  │
│  ┌────────────┐  ┌────────────┐    │
│  │  Database  │  │   Cache    │    │
│  │ (SQLite/   │  │  (Redis)   │    │
│  │PostgreSQL) │  │            │    │
│  └────────────┘  └────────────┘    │
└─────────────────────────────────────┘
```

### 1.2 Technology Stack

**Frontend**
- Framework: React 18+ with TypeScript
- State Management: Redux Toolkit / Zustand
- UI Library: Material-UI / Tailwind CSS
- Routing: React Router v6
- Forms: React Hook Form + Zod validation
- HTTP Client: Axios
- Charts: Chart.js / Recharts

**Backend**
- Runtime: Node.js (Express) or Python (FastAPI)
- Language: TypeScript / Python
- API: RESTful with OpenAPI 3.0 spec
- Authentication: JWT + Refresh Tokens
- Validation: Joi / Pydantic

**Database**
- Development: SQLite
- Production: PostgreSQL 14+
- ORM: Prisma / SQLAlchemy
- Migrations: Automated via ORM

**DevOps**
- Containerization: Docker
- Orchestration: Docker Compose / Kubernetes
- CI/CD: GitHub Actions
- Hosting: AWS / Azure / Vercel
- Monitoring: Prometheus + Grafana

## 2. Database Design

### 2.1 Entity Relationship Diagram
```
┌─────────────┐         ┌──────────────┐
│    Users    │────────<│  UserSkills  │
└─────────────┘         └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │    Skills    │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │  Categories  │
                        └──────────────┘

┌─────────────┐         ┌──────────────┐
│    Users    │────────<│ Endorsements │
└─────────────┘         └──────────────┘

┌─────────────┐         ┌──────────────┐
│    Users    │────────<│Certificates  │
└─────────────┘         └──────────────┘
```

### 2.2 Database Schema

**users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**skills**
```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id),
    icon_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**categories**
```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**user_skills**
```sql
CREATE TABLE user_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level VARCHAR(20) NOT NULL,
    years_of_experience DECIMAL(3,1),
    is_verified BOOLEAN DEFAULT false,
    acquired_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_id)
);
```

**endorsements**
```sql
CREATE TABLE endorsements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_skill_id UUID REFERENCES user_skills(id) ON DELETE CASCADE,
    endorser_id UUID REFERENCES users(id) ON DELETE CASCADE,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_skill_id, endorser_id)
);
```

**certificates**
```sql
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id),
    title VARCHAR(255) NOT NULL,
    issuer VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    credential_id VARCHAR(255),
    credential_url TEXT,
    file_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 3. API Design

### 3.1 API Endpoints

**Authentication**
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

**Users**
```
GET    /api/v1/users/me
PUT    /api/v1/users/me
DELETE /api/v1/users/me
GET    /api/v1/users/:id
GET    /api/v1/users?search=&skills=
```

**Skills**
```
GET    /api/v1/skills
GET    /api/v1/skills/:id
POST   /api/v1/skills (admin)
PUT    /api/v1/skills/:id (admin)
DELETE /api/v1/skills/:id (admin)
GET    /api/v1/skills/categories
```

**User Skills**
```
GET    /api/v1/users/:userId/skills
POST   /api/v1/users/me/skills
PUT    /api/v1/users/me/skills/:id
DELETE /api/v1/users/me/skills/:id
GET    /api/v1/users/me/skills/export
```

**Endorsements**
```
GET    /api/v1/skills/:userSkillId/endorsements
POST   /api/v1/skills/:userSkillId/endorsements
DELETE /api/v1/endorsements/:id
```

**Certificates**
```
GET    /api/v1/users/:userId/certificates
POST   /api/v1/users/me/certificates
PUT    /api/v1/users/me/certificates/:id
DELETE /api/v1/users/me/certificates/:id
```

### 3.2 API Response Format

**Success Response**
```json
{
  "success": true,
  "data": { },
  "message": "Operation successful",
  "timestamp": "2026-02-07T10:30:00Z"
}
```

**Error Response**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2026-02-07T10:30:00Z"
}
```

## 4. Frontend Design

### 4.1 Component Architecture
```
src/
├── components/
│   ├── common/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Card/
│   ├── layout/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── Footer/
│   ├── skills/
│   │   ├── SkillCard/
│   │   ├── SkillList/
│   │   ├── SkillForm/
│   │   └── SkillChart/
│   └── user/
│       ├── Profile/
│       ├── SkillWallet/
│       └── Settings/
├── pages/
│   ├── Home/
│   ├── Dashboard/
│   ├── Skills/
│   ├── Profile/
│   └── Auth/
├── hooks/
├── services/
├── store/
├── utils/
└── types/
```

### 4.2 Key Pages

**Dashboard**
- Overview of user's skills
- Recent activity
- Skill progress charts
- Quick actions

**Skill Wallet**
- Visual skill portfolio
- Proficiency indicators
- Endorsements display
- Export functionality

**Skill Management**
- Add/edit skills
- Set proficiency levels
- Upload certificates
- Track progress

**Profile**
- Personal information
- Avatar management
- Bio and social links
- Privacy settings

## 5. Security Design

### 5.1 Authentication Flow
```
1. User submits credentials
2. Server validates credentials
3. Server generates JWT access token (15min) + refresh token (7days)
4. Tokens stored in httpOnly cookies
5. Access token used for API requests
6. Refresh token used to get new access token
```

### 5.2 Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- JWT claims for user context

### 5.3 Security Measures
- Password hashing: bcrypt (cost factor 12)
- HTTPS only
- CORS configuration
- Rate limiting: 100 requests/15min per IP
- Input validation and sanitization
- SQL injection prevention via ORM
- XSS protection
- CSRF tokens for state-changing operations

## 6. Performance Optimization

### 6.1 Frontend
- Code splitting and lazy loading
- Image optimization and lazy loading
- Memoization of expensive computations
- Virtual scrolling for large lists
- Service worker for offline capability

### 6.2 Backend
- Database indexing on frequently queried fields
- Query optimization and N+1 prevention
- Response caching (Redis)
- Pagination for list endpoints
- Connection pooling

### 6.3 Caching Strategy
```
- User profiles: 5 minutes
- Skills catalog: 1 hour
- Categories: 24 hours
- User skills: 1 minute
```

## 7. Error Handling

### 7.1 Error Codes
```
400 - Bad Request (validation errors)
401 - Unauthorized (authentication required)
403 - Forbidden (insufficient permissions)
404 - Not Found
409 - Conflict (duplicate resource)
422 - Unprocessable Entity
429 - Too Many Requests
500 - Internal Server Error
503 - Service Unavailable
```

### 7.2 Logging
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Request/response logging
- Error tracking (Sentry)

## 8. Testing Strategy

### 8.1 Test Pyramid
```
        ┌─────────┐
        │   E2E   │  (10%)
        └─────────┘
      ┌─────────────┐
      │ Integration │  (30%)
      └─────────────┘
    ┌─────────────────┐
    │   Unit Tests    │  (60%)
    └─────────────────┘
```

### 8.2 Testing Tools
- Unit: Jest / Vitest
- Integration: Supertest / pytest
- E2E: Playwright / Cypress
- Coverage target: 80%+

## 9. Deployment Architecture

### 9.1 Environments
- Development: Local Docker Compose
- Staging: Cloud staging environment
- Production: Cloud production with auto-scaling

### 9.2 CI/CD Pipeline
```
1. Code push to GitHub
2. Run linting and tests
3. Build Docker images
4. Push to container registry
5. Deploy to staging (auto)
6. Run E2E tests
7. Deploy to production (manual approval)
8. Health checks
9. Rollback on failure
```

## 10. Monitoring & Observability

### 10.1 Metrics
- Request rate and latency
- Error rate
- Database query performance
- Cache hit rate
- User engagement metrics

### 10.2 Alerts
- API error rate > 5%
- Response time > 2s
- Database connection failures
- Disk space < 20%
- Memory usage > 85%

## 11. Future Considerations

- GraphQL API option
- Real-time features (WebSocket)
- Mobile app (React Native)
- AI-powered skill recommendations
- Blockchain verification
- Multi-tenancy for organizations
