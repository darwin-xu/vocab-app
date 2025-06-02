# Testing Guide

This document provides comprehensive information about the test suite for the Vocabulary App.

## Overview

The application has a complete test suite covering both the backend (Cloudflare Worker) and frontend (React) components:

- **Backend Tests**: Vitest with Cloudflare Workers support
- **Frontend Tests**: Vitest + React Testing Library + jsdom
- **Test Coverage**: Integrated coverage reporting with thresholds
- **Integration Tests**: End-to-end workflow testing

## Test Structure

```
/
├── test/                    # Backend tests
│   ├── auth.spec.ts         # Authentication endpoint tests
│   ├── vocab.spec.ts        # Vocabulary CRUD tests
│   ├── admin.spec.ts        # Admin functionality tests
│   ├── integration.spec.ts  # End-to-end integration tests
│   ├── index.spec.ts        # Basic worker tests
│   └── helpers/
│       └── test-utils.ts    # Test utilities and helpers
└── client/
    └── src/
        └── test/
            ├── setup.ts     # Test environment setup
            ├── api.test.ts  # API module tests
            └── app.test.tsx # React component tests
```

## Running Tests

### All Tests
```bash
# Run both backend and frontend tests
npm run test:all

# Run only backend tests
npm test

# Run only frontend tests
npm run test:frontend
```

### Development Mode
```bash
# Watch mode for backend tests
npm run test:watch

# Watch mode for frontend tests  
cd client && npm run test
```

### Coverage Reports
```bash
# Backend coverage
npm run test:coverage

# Frontend coverage
cd client && npm run test:coverage

# Generate coverage for both
npm run test:coverage && cd client && npm run test:coverage
```

### Test UI
```bash
# Backend test UI
npm run test:ui

# Frontend test UI
cd client && npm run test:ui
```

## Test Categories

### Backend Tests

#### 1. Authentication Tests (`auth.spec.ts`)
- User registration with validation
- Login/logout functionality
- Session management
- Error handling for invalid credentials
- Admin vs regular user permissions

#### 2. Vocabulary Tests (`vocab.spec.ts`)
- CRUD operations for vocabulary words
- Search and filtering
- Pagination
- Data isolation between users
- Authorization checks

#### 3. Admin Tests (`admin.spec.ts`)
- User management endpoints
- Admin-only access controls
- User instruction management
- Profile operations

#### 4. Integration Tests (`integration.spec.ts`)
- Complete user journeys
- Cross-feature workflows
- Data consistency
- Error handling scenarios
- Performance with large datasets

### Frontend Tests

#### 1. API Module Tests (`api.test.ts`)
- HTTP request handling
- Authentication token management
- Error response handling
- Local storage operations
- API endpoint coverage

#### 2. Component Tests (`app.test.tsx`)
- User interface interactions
- Form submissions and validation
- State management
- Navigation flows
- Admin interface rendering
- Responsive behavior

## Test Utilities

### Backend Helpers (`test-utils.ts`)

The test utilities provide common functions for:

- **User Management**: `createTestUser()`, `createTestUsers()`
- **Data Setup**: `addTestVocab()`, `setupVocabTestData()`
- **Database Operations**: `cleanupDatabase()`, `DatabaseValidator`
- **Request Helpers**: `createAuthenticatedRequest()`, `makeAuthenticatedRequest()`
- **Assertions**: `assertResponse()`, `assertJsonResponse()`

Example usage:
```typescript
import { createTestUser, addTestVocab, DatabaseValidator } from './helpers/test-utils';

// Create a test user with authentication
const user = await createTestUser('testuser', 'password');

// Add vocabulary for testing
await addTestVocab(user.id, [
  { word: 'hello', add_date: '2025-01-01' },
  { word: 'world', add_date: '2025-01-02' }
]);

// Validate database state
await DatabaseValidator.assertVocabCount(user.id, 2);
```

### Frontend Setup (`setup.ts`)

Provides:
- jsdom environment configuration
- localStorage mocking
- fetch API mocking
- Testing Library extensions
- Global test cleanup

## Coverage Targets

### Backend Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Frontend Coverage Thresholds
- **Branches**: 75%
- **Functions**: 75%
- **Lines**: 75%
- **Statements**: 75%

## Test Data Management

### Database Cleanup
All tests use `beforeEach` hooks to ensure clean state:

```typescript
beforeEach(async () => {
  await cleanupDatabase();
});
```

### Mock Data
Tests use consistent mock data patterns:

```typescript
const mockVocabData = {
  items: [
    { word: 'hello', add_date: '2025-01-01' },
    { word: 'world', add_date: '2025-01-02' }
  ],
  totalPages: 1,
  currentPage: 1
};
```

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow the AAA pattern
3. **Isolation**: Each test should be independent
4. **Clean Up**: Always clean up after tests
5. **Mock External Dependencies**: Mock API calls and external services

### Test Organization

1. **Group Related Tests**: Use `describe` blocks for logical grouping
2. **Shared Setup**: Use `beforeEach` for common setup
3. **Helper Functions**: Extract common operations to utilities
4. **Consistent Naming**: Follow naming conventions

### Error Testing

Always test error scenarios:
- Invalid input validation
- Authentication failures
- Network errors
- Database constraint violations
- Permission denied scenarios

## CI/CD Integration

The test suite is designed for CI/CD integration:

```bash
# In CI pipeline
npm run test:all
npm run test:coverage

# Check coverage thresholds (will fail CI if below threshold)
```

## Debugging Tests

### Running Individual Tests
```bash
# Run specific test file
npx vitest test/auth.spec.ts

# Run specific test case
npx vitest test/auth.spec.ts -t "should register a new user"
```

### Debug Mode
```bash
# Run with debug output
DEBUG=1 npm test

# Run with verbose output
npm test -- --reporter=verbose
```

### Browser Testing
For frontend component debugging:
```bash
cd client && npm run test:ui
```

## Performance Testing

The integration tests include performance scenarios:
- Large dataset handling (25+ vocabulary items)
- Pagination performance
- Search functionality with large datasets
- Concurrent user operations

## Security Testing

Security aspects covered in tests:
- Authentication bypass attempts
- Data isolation between users
- Admin privilege escalation
- SQL injection prevention
- XSS prevention in frontend

## Maintenance

### Adding New Tests

1. **Backend**: Add new test files in `/test/` directory
2. **Frontend**: Add new test files in `/client/src/test/` directory
3. **Update Coverage**: Ensure new code maintains coverage thresholds
4. **Update Documentation**: Add new test categories to this guide

### Updating Test Data

When adding new features:
1. Update test utilities for new data types
2. Add new helper functions as needed
3. Update mock data structures
4. Ensure backward compatibility

## Troubleshooting

### Common Issues

1. **Database Lock Errors**: Ensure proper cleanup in `beforeEach`
2. **Coverage Failures**: Check that new code has adequate test coverage
3. **Frontend Mock Issues**: Verify API mocks are properly configured
4. **Authentication Errors**: Ensure test users are created properly

### Getting Help

- Check test output for specific error messages
- Review test utilities for proper usage patterns
- Ensure environment setup matches requirements
- Verify database schema is up to date

---

This test suite provides comprehensive coverage of the Vocabulary App functionality and serves as both a quality assurance tool and documentation of expected behavior.
