# Vocabulary Builder

[![Test Suite](https://github.com/YOUR_USERNAME/vocab-app/actions/workflows/test.yml/badge.svg)](https://github.com/YOUR_USERNAME/vocab-app/actions/workflows/test.yml)

A modern vocabulary building application built with Cloudflare Workers, React, and TypeScript.

## Features

- 📚 Add and manage vocabulary words
- 🔍 Search through your vocabulary
- 🎯 AI-powered word definitions and examples
- 👤 User authentication and profiles
- 🔊 Text-to-speech functionality
- 📊 Query history tracking to monitor learning progress
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
3. Set up your environment variables:
    ```bash
    export OPENROUTER_API_KEY=...
    ```
4. Initialize the database (for new features):
    ```bash
    # Run schema migrations for query history feature
    ./setup-query-history.sh
    ```
5. Run development server: `npm run dev`

## Styling

The React client uses **Tailwind CSS** for utility-first styles configured via
`postcss.config.js` and `tailwind.config.js`. Global Tailwind directives are in
`src/index.css`.

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
