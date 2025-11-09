# Technology Stack

## Architecture

**System Type**: Web Application (Monolithic)

**Architecture Pattern**:
- Backend API + Frontend SPA
- RESTful API design
- Server-side rendering with Hono
- Client-side rendering with React

**Deployment Model**:
- Containerized application (Docker Compose)
- Azure VM hosting
- Single-server deployment (app + database)

## Technology Components

### Backend
- **Runtime**: Deno 1.40+
  - TypeScript-native runtime
  - Secure by default
  - Modern JavaScript/TypeScript features
- **Framework**: Hono 4.0+
  - Lightweight web framework
  - Fast routing and middleware
  - TypeScript support
- **Language**: TypeScript
  - Type safety
  - Modern ECMAScript features

### Frontend
- **Library**: React 18+
  - Component-based UI
  - Virtual DOM for performance
  - Rich ecosystem
- **Language**: TypeScript
  - Type-safe component development
  - Better IDE support
- **Styling**: (TBD - to be determined during implementation)
  - Responsive design for multi-device support
  - Mobile-first approach

### Database
- **RDBMS**: PostgreSQL 15+
  - ACID compliance for data integrity
  - JSON support for flexible data structures
  - Rich ecosystem and tooling
- **ORM/Query Builder**: (TBD - to be determined during implementation)

### Infrastructure
- **Containerization**: Docker Compose
  - Simplified deployment and orchestration
  - Consistent development and production environments
- **Hosting**: Azure Virtual Machine
  - Cost-effective for low-traffic applications
  - Full control over infrastructure
- **Web Server**: (TBD - possibly integrated with Hono or Nginx)

### Authentication
- **Method**: Basic Authentication
  - Simple and secure (requires HTTPS)
  - Browser-native support
  - Minimal implementation overhead

## Development Environment

### Required Tools
- **Visual Studio Code**: Primary IDE
- **Docker Desktop**: Container runtime
- **Dev Containers Extension**: VS Code extension for container-based development
- **Git**: Version control

### Dev Container Configuration
The project uses VS Code Dev Containers for a consistent development environment:

**Containers**:
- `app`: Deno runtime environment
- `db`: PostgreSQL 15 database

**VS Code Extensions** (auto-installed in container):
- Deno
- ESLint
- Prettier
- Docker
- PostgreSQL

**Advantages**:
- Zero manual setup for new developers
- Consistent environment across team
- Isolated from host system

### Database Connection (Development)
- **Host**: db (container name)
- **Port**: 5432
- **Database**: sphr_db
- **User**: sphr_user
- **Password**: sphr_password

## Common Commands

### Dev Container
```bash
# Open project in Dev Container
# Command Palette (Cmd/Ctrl+Shift+P) -> "Dev Containers: Reopen in Container"

# Rebuild container (after configuration changes)
# Command Palette -> "Dev Containers: Rebuild Container"
```

### Deno (Backend)
```bash
# Run application (TBD - to be defined during implementation)
deno run --allow-net --allow-read --allow-env src/main.ts

# Run tests (TBD)
deno test

# Format code
deno fmt

# Lint code
deno lint
```

### Database (PostgreSQL)
```bash
# Connect to database from app container
psql -h db -U sphr_user -d sphr_db

# Run migrations (TBD - migration tool to be selected)
# TBD
```

### Docker Compose
```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Rebuild containers
docker compose build
```

## Environment Variables

### Application Environment
(TBD - to be defined during implementation)

**Expected Variables**:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Application port (default: 8000)
- `BASIC_AUTH_USER`: Basic authentication username
- `BASIC_AUTH_PASSWORD`: Basic authentication password

## Port Configuration

### Development Environment
- **Application**: 8000 (default, TBD)
- **Database**: 5432 (PostgreSQL)

### Production Environment
- **Application**: 80 (HTTP) / 443 (HTTPS)
- **Database**: 5432 (internal only, not exposed)

## Security Considerations

### Development
- Basic authentication credentials stored in environment variables
- HTTPS required in production for Basic Auth security

### Production
- HTTPS/TLS certificate required
- Database not exposed to public internet
- Regular security updates for OS and dependencies
- Backup strategy for data protection

## Performance Targets

Based on non-functional requirements (RDDD1201):

- **Response Time**:
  - Data registration: < 1 second
  - Data retrieval: < 1 second
  - Report generation: < 5 seconds
- **Availability**: 99.5% uptime
- **Scalability**: Support for target user base (TBD)
- **Data Retention**: Minimum 3 years of historical data

## Technology Selection Rationale

### Why Deno?
- TypeScript-native runtime (no build step needed)
- Secure by default (explicit permissions)
- Modern standard library
- Built-in tooling (formatter, linter, test runner)

### Why Hono?
- Lightweight and fast
- Excellent TypeScript support
- Simple routing and middleware
- Deno-compatible

### Why React?
- Rich ecosystem and community
- Component reusability
- Well-established patterns
- Good TypeScript integration

### Why PostgreSQL?
- ACID compliance for health data integrity
- Mature and reliable
- Strong JSON support for flexible schemas
- Free and open-source

### Why Docker Compose?
- Simplified multi-container orchestration
- Consistent dev/prod environments
- Easy to understand and maintain
- No additional orchestration overhead needed

### Why Azure VM?
- Cost-effective for initial deployment
- Full control over environment
- Familiar infrastructure model
- Easy migration path if needed
