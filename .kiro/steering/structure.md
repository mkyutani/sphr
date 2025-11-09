# Project Structure

## Root Directory Organization

```
.
├── .devcontainer/          # Dev Container configuration
│   ├── devcontainer.json   # VS Code Dev Container settings
│   ├── docker-compose.yml  # Docker Compose configuration
│   └── init-db.sql         # Database initialization script
├── .kiro/                  # Kiro spec-driven development
│   ├── specs/              # Feature specifications
│   └── steering/           # Project steering documents (this file)
├── .claude/                # Claude Code configuration
│   └── commands/           # Custom slash commands
├── docs/                   # Documentation
│   ├── customer/           # Customer requirements (initial)
│   └── requirements/       # Detailed requirements (RDDD format)
├── src/                    # Source code (to be created)
│   ├── backend/            # Backend application (TBD)
│   ├── frontend/           # Frontend application (TBD)
│   └── shared/             # Shared code (types, utilities)
├── tests/                  # Tests (to be created)
├── CLAUDE.md               # Claude Code project instructions
├── README.md               # Project README
└── LICENSE                 # MIT License
```

## Subdirectory Structures

### `.devcontainer/` - Development Environment
Contains all Dev Container configuration for VS Code:
- **devcontainer.json**: VS Code settings, extensions, container configuration
- **docker-compose.yml**: Multi-container setup (app + database)
- **init-db.sql**: Initial database schema and seed data

**Purpose**: Provide zero-setup development environment for all developers

### `.kiro/` - Spec-Driven Development
Kiro framework for structured development workflow:
- **specs/**: Feature-specific specifications
  - Each feature has its own directory: `.kiro/specs/{feature-name}/`
  - Standard files: `requirements.md`, `design.md`, `tasks.md`
- **steering/**: Project-wide context and rules
  - `product.md`: Product overview and business objectives
  - `tech.md`: Technology stack and architecture
  - `structure.md`: This file - project organization

**Purpose**: Maintain structured, documented development process

### `.claude/` - Claude Code Configuration
Custom commands and hooks for Claude Code:
- **commands/**: Slash commands for common workflows
  - `kiro/`: Kiro spec-driven development commands
  - Custom project-specific commands

**Purpose**: Automate and standardize development workflows

### `docs/` - Documentation
Project documentation:
- **customer/**: Original customer requirements and meeting notes
- **requirements/**: Detailed requirements in RDDD format
  - Business concept, stakeholders, goals
  - Requirements, data model, business processes
  - State charts, glossary, non-functional requirements

**Purpose**: Preserve project knowledge and requirements traceability

### `src/` - Source Code (To Be Created)
Application source code (structure TBD during implementation):

**Expected structure**:
```
src/
├── backend/              # Deno + Hono backend
│   ├── routes/           # API route handlers
│   ├── controllers/      # Business logic
│   ├── models/           # Data models
│   ├── services/         # Service layer
│   ├── middlewares/      # Middleware functions
│   ├── utils/            # Utility functions
│   └── main.ts           # Application entry point
├── frontend/             # React frontend
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   ├── services/         # API client
│   ├── utils/            # Utility functions
│   └── App.tsx           # Application root
└── shared/               # Shared code
    ├── types/            # TypeScript types/interfaces
    └── constants/        # Shared constants
```

### `tests/` - Tests (To Be Created)
Test files (structure TBD during implementation):

**Expected structure**:
```
tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
└── e2e/                  # End-to-end tests
```

## Code Organization Patterns

### Backend (Deno + Hono)
- **Routes**: Define API endpoints and route to controllers
- **Controllers**: Handle HTTP requests, validate input, call services
- **Services**: Implement business logic, interact with models
- **Models**: Define data structures and database operations
- **Middlewares**: Handle cross-cutting concerns (auth, logging, error handling)

**Flow**: Request → Middleware → Route → Controller → Service → Model → Database

### Frontend (React)
- **Components**: Reusable UI components (atomic design approach recommended)
- **Pages**: Top-level page components (composed of smaller components)
- **Hooks**: Custom React hooks for state and side effects
- **Services**: API client for backend communication
- **Context/State**: Global state management (TBD - Context API, Zustand, or Redux)

**Flow**: User Action → Component → Hook/Service → API Call → State Update → Re-render

### Shared Code
- **Types**: Shared TypeScript types/interfaces for API contracts
- **Constants**: Shared constants (data types, validation rules, etc.)
- **Utilities**: Pure functions used by both frontend and backend

## File Naming Conventions

### Backend (Deno/TypeScript)
- **Files**: camelCase with `.ts` extension
  - Route files: `{resource}Routes.ts` (e.g., `healthRecordRoutes.ts`)
  - Controller files: `{resource}Controller.ts`
  - Service files: `{resource}Service.ts`
  - Model files: `{resource}Model.ts`
- **Directories**: camelCase (e.g., `controllers/`, `middlewares/`)

### Frontend (React/TypeScript)
- **Components**: PascalCase with `.tsx` extension
  - Component files: `{ComponentName}.tsx` (e.g., `HealthDataForm.tsx`)
  - Page files: `{PageName}Page.tsx` (e.g., `DashboardPage.tsx`)
- **Hooks**: camelCase starting with `use`
  - Hook files: `use{HookName}.ts` (e.g., `useHealthData.ts`)
- **Directories**: camelCase (e.g., `components/`, `hooks/`)

### Tests
- **Test files**: `{filename}.test.ts` or `{filename}.spec.ts`
- **Test directories**: Mirror source structure

### Documentation
- **Markdown files**: UPPERCASE for root-level (e.g., `README.md`, `CLAUDE.md`)
- **Spec files**: lowercase with dashes (e.g., `requirements.md`, `design.md`)

## Import Organization

### Import Order (TypeScript/Deno)
1. Standard library imports (Deno)
2. External dependencies (npm, third-party)
3. Internal absolute imports (from src/)
4. Relative imports
5. Type imports (if separated)

**Example**:
```typescript
// 1. Standard library
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// 2. External dependencies
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";

// 3. Internal absolute imports
import { HealthRecordService } from "@/services/healthRecordService.ts";

// 4. Relative imports
import { validateHealthData } from "./validators.ts";

// 5. Type imports
import type { HealthRecord } from "@/types/healthRecord.ts";
```

### Import Aliases (TBD)
Recommended aliases for cleaner imports:
- `@/` → `src/`
- `@backend/` → `src/backend/`
- `@frontend/` → `src/frontend/`
- `@shared/` → `src/shared/`

## Key Architectural Principles

### Separation of Concerns
- Backend and frontend are clearly separated
- Business logic in services, not controllers
- UI logic in components, not API calls (use services)
- Data access in models, not scattered in business logic

### DRY (Don't Repeat Yourself)
- Shared types in `src/shared/types/`
- Reusable components in atomic design structure
- Utility functions in dedicated utility modules

### Type Safety
- TypeScript everywhere (backend and frontend)
- Shared types for API contracts
- Strict type checking enabled

### Security
- Input validation at API boundaries
- Output sanitization for user-generated content
- Parameterized queries for database operations
- Environment variables for sensitive configuration

### Testability
- Pure functions where possible
- Dependency injection for services
- Mockable database layer
- Component isolation for UI testing

### Simplicity
- Minimal dependencies (align with product goal)
- Clear, readable code over clever code
- Standard patterns over custom abstractions
- Progressive enhancement (start simple, add complexity as needed)

### Performance
- Lazy loading for frontend routes
- Database indexing for common queries
- Caching where appropriate
- Optimize for target metrics (< 1s response time)

## Development Workflow

### Spec-Driven Development (Kiro)
1. **Requirements**: Define feature requirements (`/kiro:spec-requirements`)
2. **Design**: Create technical design (`/kiro:spec-design`)
3. **Tasks**: Break down into implementation tasks (`/kiro:spec-tasks`)
4. **Implementation**: TDD approach for each task (`/kiro:spec-impl`)
5. **Review**: Validate implementation against design (`/kiro:validate-design`)

### Git Workflow
- **Main branch**: `main` (production-ready code)
- **Feature branches**: `feature/{feature-name}` or `{username}/{feature-name}`
- **Commit messages**: Follow conventional commits (feat:, fix:, docs:, etc.)
- **Pull requests**: Required for merging to main

### Code Quality
- **Formatting**: Deno fmt (automatic)
- **Linting**: Deno lint (enforce best practices)
- **Type checking**: TypeScript strict mode
- **Testing**: Unit tests for business logic, integration tests for APIs

## Future Considerations

As the project grows, consider:
- **Monorepo structure**: If frontend/backend diverge significantly
- **Microservices**: If scaling requires service separation
- **State management**: Formalize frontend state approach
- **API versioning**: Plan for backward compatibility
- **Migration strategy**: Database schema evolution
- **CI/CD pipeline**: Automate testing and deployment
- **Monitoring**: Logging, metrics, error tracking
