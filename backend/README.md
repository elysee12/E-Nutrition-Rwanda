# E-Nutrition Rwanda - Backend API

> Digital Health Informatics System for Malnutrition Surveillance in Rwanda  
> Ministry of Health · Rwanda Biomedical Center

## 🌟 Overview

NestJS + Prisma + MySQL backend implementing WHO Child Growth Standards for real-time malnutrition classification and surveillance of children under 5 years (0-59 months) in Rwanda.

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install additional packages
npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt class-validator class-transformer @types/bcrypt @types/passport-jwt @types/passport-local --save

# 3. Generate Prisma Client
npx prisma generate

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed database with sample data
npx prisma db seed

# 6. Start development server
npm run start:dev
```

✅ Server will start at **http://localhost:3000/api/v1**

---

## 📁 Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma                    ✅ Complete database schema
│   ├── seed.ts                          ✅ Database seeding script
│   ├── SCHEMA_DOCUMENTATION.md          ✅ Full schema documentation
│   └── migrations/
├── src/
│   ├── common/
│   │   └── services/
│   │       └── who-classification.service.ts  ✅ WHO standards implementation
│   ├── prisma/
│   │   ├── prisma.module.ts            ✅ Global database module
│   │   └── prisma.service.ts           ✅ Prisma service
│   ├── user/                            ⚠️ Skeleton (needs completion)
│   ├── auth/                            📝 To create
│   ├── facility/                        📝 To create
│   ├── child/                           📝 To create
│   ├── assessment/                      📝 To create (CRITICAL)
│   ├── follow-up/                       📝 To create
│   ├── referral/                        📝 To create
│   ├── activity/                        📝 To create
│   ├── statistics/                      📝 To create
│   ├── app.module.ts                    ✅ Updated with config
│   └── main.ts                          ✅ Updated with CORS & validation
├── .env                                  ✅ Environment variables
├── BACKEND_ARCHITECTURE.md              ✅ System architecture
├── IMPLEMENTATION_COMPLETE.md           ✅ Full implementation guide
├── DEPLOYMENT_GUIDE.md                  ✅ Deployment instructions
└── package.json
```

---

## 📚 Documentation

### 🎯 Start Here

1. **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Setup & deployment instructions
2. **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Complete code patterns & examples
3. **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** - System design & architecture
4. **[prisma/SCHEMA_DOCUMENTATION.md](./prisma/SCHEMA_DOCUMENTATION.md)** - Database schema docs

### 📖 Documentation Overview

| Document | Purpose | Use When |
|----------|---------|----------|
| **DEPLOYMENT_GUIDE.md** | Step-by-step setup & deployment | First time setup, deploying to production |
| **IMPLEMENTATION_COMPLETE.md** | Code patterns, examples, DTOs | Creating new modules, implementing features |
| **BACKEND_ARCHITECTURE.md** | System design, API structure | Understanding system, planning features |
| **SCHEMA_DOCUMENTATION.md** | Database models, relationships | Database queries, understanding data model |

---

## ✅ What's Already Implemented

### 1. Database Layer (100% Complete)
- ✅ Complete Prisma schema with 10+ models
- ✅ All relationships configured
- ✅ Indexes optimized for performance
- ✅ Seed script with sample data
- ✅ Migration system ready

### 2. WHO Classification Engine (100% Complete)
- ✅ Z-score calculations (WHZ, HAZ, WAZ)
- ✅ MUAC classification (SAM/MAM)
- ✅ Malnutrition status determination
- ✅ Clinical recommendations generator
- ✅ Age validation for registration

### 3. Core Infrastructure (100% Complete)
- ✅ Prisma service (global)
- ✅ Config module setup
- ✅ CORS configuration
- ✅ Global validation pipes
- ✅ API versioning (/api/v1)
- ✅ Environment variables

### 4. Documentation (100% Complete)
- ✅ Complete implementation guide
- ✅ Deployment instructions
- ✅ Architecture documentation
- ✅ Database documentation
- ✅ Code patterns & examples

---

## 🚧 What Needs to Be Created

Following the patterns in **IMPLEMENTATION_COMPLETE.md**, create these modules:

### Priority 1: Authentication & Authorization
- [ ] Auth Module (JWT + Passport)
- [ ] Guards (JWT, Roles)
- [ ] Decorators (@CurrentUser, @Roles)
- [ ] Login/Register endpoints

### Priority 2: Core Resources
- [ ] Facility Module (health facilities CRUD)
- [ ] Child Module (child registration, search)
- [ ] User Module (complete CRUD)

### Priority 3: Critical Feature
- [ ] Assessment Module ⭐ (with WHO classification integration)
  - Create assessments
  - Auto-calculate malnutrition status
  - Generate recommendations
  - Update child status
  - Create growth records

### Priority 4: Supporting Features
- [ ] Follow-up Module (scheduling, tracking)
- [ ] Referral Module (facility-to-facility referrals)
- [ ] Activity Module (audit logging)
- [ ] Statistics Module (analytics, reporting)

---

## 🎯 Implementation Steps

### Option 1: Follow the Guide (Recommended)

1. Open **IMPLEMENTATION_COMPLETE.md**
2. Find the module you want to create (e.g., "Facility Module")
3. Copy the **Module**, **Service**, **Controller**, and **DTO** patterns
4. Adapt them to your specific module
5. Import the module in `app.module.ts`
6. Test the endpoints

**Example: Creating Facility Module**

```typescript
// 1. Create facility.module.ts (copy pattern from guide)
// 2. Create facility.service.ts (copy pattern, adapt for Facility)
// 3. Create facility.controller.ts (copy pattern, adapt routes)
// 4. Create DTOs: create-facility.dto.ts, update-facility.dto.ts
// 5. Import in app.module.ts
// 6. Test with: curl http://localhost:3000/api/v1/facilities
```

### Option 2: Use Generator Script

```bash
# Run the module generator (creates all at once)
bash generate-modules.sh

# Then implement business logic using patterns from IMPLEMENTATION_COMPLETE.md
```

---

## 🔑 Key Features

### WHO Classification Engine

Automatically classifies child nutritional status based on:
- **MUAC** (Mid-Upper Arm Circumference)
- **Weight-for-Height Z-score** (Wasting indicator)
- **Height-for-Age Z-score** (Stunting indicator)
- **Weight-for-Age Z-score** (Underweight indicator)

**Usage:**

```typescript
import { WHOClassificationService } from './common/services/who-classification.service';

const result = whoService.classifyMalnutrition({
  weight: 7.2,
  height: 71.0,
  muac: 118,
  sex: 'F',
  ageMonths: 14,
});

// Result includes:
// - nutritionStatus: 'MAM' | 'SAM' | 'Normal' | etc.
// - isSAM, isMAM, isStunted, isUnderweight, isWasted (boolean flags)
// - zScores: { wfh, hfa, wfa }
// - recommendations: string[]
```

### Database Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Facility** | Health facilities | name, type, province, district |
| **User** | System users | email, role, facility |
| **Child** | Children <5 years | name, dob, location, currentStatus |
| **Assessment** | Nutritional assessments | weight, height, muac, zScores, status |
| **FollowUp** | Scheduled visits | scheduledDate, status, outcome |
| **Referral** | Facility transfers | from, to, reason, urgency |
| **GrowthRecord** | Longitudinal tracking | ageMonths, measurements, zScores |
| **Activity** | Audit logs | type, user, entity, timestamp |

---

## 🔐 Authentication & Authorization

**Role-Based Access Control (RBAC):**

| Role | Access Level | Can Do |
|------|--------------|--------|
| **ADMIN** | System-wide | Everything, facility management, user management |
| **DATA_MANAGER** | Facility-level | Manage staff, view all facility data, reports |
| **NURSE** | Clinical | Assessments, follow-ups, referrals, view children |
| **CHW** | Field screening | Register children, record measurements (no diagnosis view) |

**Implementation:**

```typescript
@Controller('facilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FacilityController {
  
  @Post()
  @Roles(UserRole.ADMIN) // Only admins can create facilities
  create(@Body() dto: CreateFacilityDto) {}
  
  @Get()
  @Roles(UserRole.ADMIN, UserRole.DATA_MANAGER) // Admins and Data Managers can list
  findAll() {}
}
```

---

## 📡 API Endpoints (Planned)

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints Structure

```
POST   /auth/login              - Login with email/password
POST   /auth/register           - Register new user
GET    /auth/profile            - Get current user profile

GET    /facilities              - List all facilities (paginated)
POST   /facilities              - Create new facility (Admin only)
GET    /facilities/:id          - Get facility details
PATCH  /facilities/:id          - Update facility
DELETE /facilities/:id          - Delete facility

GET    /children                - List children (filterable)
POST   /children                - Register new child
GET    /children/:id            - Get child details
PATCH  /children/:id            - Update child
GET    /children/search?q=name  - Search children by name

POST   /assessments             - Create assessment (⭐ includes WHO classification)
GET    /assessments             - List assessments
GET    /assessments/:id         - Get assessment details
GET    /assessments/critical    - Get SAM cases only

POST   /follow-ups              - Schedule follow-up
GET    /follow-ups/today        - Get today's follow-ups
PATCH  /follow-ups/:id          - Update follow-up status

POST   /referrals               - Create referral
GET    /referrals/pending       - Get pending referrals
PATCH  /referrals/:id/status    - Update referral status

GET    /statistics/dashboard    - Get dashboard stats (role-based)
GET    /statistics/facility/:id - Get facility statistics

GET    /activities              - Get activity logs (audit trail)
```

---

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Coverage
```bash
npm run test:cov
```

### Manual Testing with curl

```bash
# Test WHO Classification
curl -X POST http://localhost:3000/api/v1/assessments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "childId": "...",
    "facilityId": "...",
    "weightKg": 7.2,
    "heightCm": 71.0,
    "muacMm": 118
  }'
```

---

## 🚀 Deployment

### Development
```bash
npm run start:dev
```

### Production
```bash
# Build
npm run build

# Run production server
npm run start:prod

# Or with PM2
pm2 start dist/main.js --name enutrition-api
```

### Docker
```bash
docker build -t enutrition-backend .
docker run -p 3000:3000 --env-file .env.production enutrition-backend
```

---

## 📊 Database

### View Database (Prisma Studio)
```bash
npx prisma studio
```

### Create Migration
```bash
npx prisma migrate dev --name <migration-name>
```

### Reset Database
```bash
npx prisma migrate reset
```

### Seed Database
```bash
npx prisma db seed
```

---

## 🛠️ Tech Stack

- **Framework:** NestJS 10.x
- **ORM:** Prisma 5.x
- **Database:** MySQL 8.0
- **Authentication:** JWT + Passport
- **Validation:** class-validator, class-transformer
- **Language:** TypeScript 5.x
- **Runtime:** Node.js 18+

---

## 📦 Package.json Scripts

```json
{
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "build": "nest build",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

---

## 🆘 Troubleshooting

### Common Issues

1. **"Cannot find module '@prisma/client'"**
   ```bash
   npx prisma generate
   ```

2. **"Port 3000 already in use"**
   ```bash
   # Change PORT in .env
   PORT=3001 npm run start:dev
   ```

3. **"Database connection failed"**
   - Check DATABASE_URL in `.env`
   - Ensure MySQL is running
   - Test connection: `mysql -u root -p -e "SELECT 1"`

4. **"Module not found" after creating module**
   - Import module in `app.module.ts`
   - Restart development server

---

## 📞 Support

- **Documentation:** See IMPLEMENTATION_COMPLETE.md
- **Architecture:** See BACKEND_ARCHITECTURE.md
- **Database:** See prisma/SCHEMA_DOCUMENTATION.md
- **Deployment:** See DEPLOYMENT_GUIDE.md

---

## 🎯 Next Steps

1. ✅ **You are here** - Backend foundation complete
2. 📝 **Implement modules** - Follow IMPLEMENTATION_COMPLETE.md
3. 🧪 **Test endpoints** - Use Postman/Thunder Client
4. 🔗 **Connect frontend** - Update API URLs in frontend
5. 🚀 **Deploy** - Follow DEPLOYMENT_GUIDE.md

---

## ✅ Production Readiness Checklist

- [ ] All modules implemented
- [ ] Authentication working
- [ ] Role-based access control
- [ ] Input validation on all endpoints
- [ ] Error handling implemented
- [ ] Activity logging configured
- [ ] Tests written (>80% coverage)
- [ ] API documentation (Swagger)
- [ ] Environment variables secured
- [ ] Database migrations applied
- [ ] CORS configured correctly
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Logging & monitoring setup

---

## 📜 License

Ministry of Health - Rwanda Biomedical Center  
E-Nutrition Rwanda © 2026

---

**🚀 Ready to build? Start with [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)!**
