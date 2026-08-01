# 💻 Development & Contribution Guide

Setting up your local environment to contribute to SuriLens.

---

## Local Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/sonisuryansh/surilens.git
   cd surilens
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Demo Server**:
   ```bash
   npm run demo
   ```
   - Express server runs at `http://localhost:3000`
   - SuriLens Dashboard runs at `http://localhost:4444`

4. **Run Syntax & Verification Suite**:
   ```bash
   npm test
   ```

---

## Coding Guidelines

- **Zero Heavy Mandatory Dependencies**: Do not add heavy dependencies to `package.json`.
- **Zero Polling Overhead**: Use event-driven hooks instead of timer loops.
- **Backward Compatibility**: Never break existing public API exports in `index.js`.
