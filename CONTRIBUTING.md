# Contributing to SuriLens

Thank you for your interest in contributing to **SuriLens**!

Please review our [Documentation Index](./docs/README.md) and [Contributing Guide](./docs/Contributing.md) for full details on setup and guidelines.

---

## Quick Development Workflow

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/sonisuryansh/surilens.git
   cd surilens
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the local demo server:
   ```bash
   npm run demo
   ```
   - Application: `http://localhost:3000`
   - SuriLens Dashboard: `http://localhost:4444`

4. Run verification tests:
   ```bash
   npm test
   ```

---

## Core Rules

- **Zero Heavy Mandatory Dependencies**: Do not introduce heavy mandatory runtime dependencies to `package.json`.
- **Zero Feature Loss Policy**: Ensure all public export APIs in `index.js` remain 100% backward compatible.
- **Run Syntax Check**: Always execute `npm test` before creating a pull request.
