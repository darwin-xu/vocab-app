# Vocabulary Builder

[![Test Suite](https://github.com/YOUR_USERNAME/vocab-app/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/vocab-app/actions/workflows/test.yml)

A modern vocabulary building application built with Cloudflare Workers, React, and TypeScript.

## Features

- 📚 Add and manage vocabulary words
- 🔍 Search through your vocabulary
- 🎯 AI-powered word definitions and examples
- 👤 User authentication and profiles
- 🔊 Text-to-speech functionality
- ⚙️ Custom instruction settings
- 👨‍💼 Admin user management

## Test Coverage

Our application includes comprehensive testing:

- **Backend Tests**: API endpoints, authentication, database operations
- **Frontend Tests**: React components, user interactions, API integration
- **Integration Tests**: End-to-end functionality testing
- **Linting**: Code quality and style enforcement

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up your environment variables
4. Run development server: `npm run dev`

## Testing

Run all tests:
```bash
npm run test:all
```

Run specific test suites:
```bash
npm run test:backend     # Backend API tests
npm run test:frontend    # Frontend React tests
npm run lint            # Code linting
```

## Deployment

The application is deployed using Cloudflare Workers. See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

---

> **Note**: Replace `YOUR_USERNAME` in the badge URL with your actual GitHub username to see the test status badge.
