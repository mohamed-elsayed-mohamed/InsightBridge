# InsightBridge Architecture

## Overview

InsightBridge is built using Clean Architecture principles, with a clear separation of concerns across multiple layers. The application is designed to be scalable, maintainable, and follows modern development practices.

## Architecture Layers

### 1. Domain Layer (InsightBridge.Domain)
- Contains enterprise business rules
- Core business entities and interfaces
- No dependencies on other layers
- Models:
  - DatabaseConnection
  - Report

### 2. Application Layer (InsightBridge.Application)
- Contains business use cases
- Orchestrates the flow of data
- Implements business rules
- Interfaces:
  - IDatabaseConnectionService
  - IReportService

### 3. Infrastructure Layer (InsightBridge.Infrastructure)
- Implements interfaces defined in the Application layer
- Contains external concerns:
  - Database access (Entity Framework Core)
  - External services
  - File system operations
- Data:
  - ApplicationDbContext
  - Migrations
  - Repositories

### 4. API Layer (InsightBridge.API)
- Entry point for the application
- Handles HTTP requests
- Implements controllers
- Configures services and middleware
- Controllers:
  - HealthController
  - VersionController
  - ConnectionsController
  - ReportsController

### 5. Frontend (React + TypeScript)
- Modern single-page application
- Material-UI for consistent design
- Organized structure:
  - Pages
  - Components
  - Services
  - Hooks
- Features:
  - Database connection management
  - Report creation and execution
  - Data visualization
  - Real-time updates

## Database Design

### DatabaseConnection
- Stores database connection information
- Supports multiple database types
- Secure connection string storage
- Tracks usage and status

### Report
- Stores report definitions
- Links to database connections
- Supports various visualization types
- Includes scheduling capabilities

## Security

- JWT-based authentication
- Secure connection string storage
- Role-based access control
- CORS configuration
- HTTPS enforcement

## Deployment

- Docker containerization
- GitHub Actions CI/CD
- Environment-based configuration
- Health monitoring
- Logging with Seq

## Development Workflow

1. Feature Development
   - Create feature branch
   - Implement changes
   - Write tests
   - Submit PR

2. Code Review
   - Automated checks
   - Manual review
   - Test coverage

3. Deployment
   - Automated build
   - Test execution
   - Docker image creation
   - Deployment to environment

## Monitoring and Logging

- Seq for centralized logging
- Health check endpoints
- Performance monitoring
- Error tracking
- Usage analytics

## Future Considerations

- Microservices architecture
- Real-time data processing
- Advanced caching
- Machine learning integration
- Multi-tenant support 