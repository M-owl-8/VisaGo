# Contributing to VisaBuddy

Thank you for your interest in contributing to VisaBuddy! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/VisaBuddy.git
   cd VisaBuddy
   ```
3. **Install dependencies**
   ```bash
   npm install
   npm run install-all
   ```
4. **Set up environment**
   - Copy `.env.example` files to `.env` in each service
   - Fill in required environment variables
5. **Run tests**
   ```bash
   npm test
   ```

## Development Workflow

### 1. Create a Branch

Create a feature or fix branch:

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test updates
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Write or update tests
- Update documentation if needed

### 3. Commit Changes

Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): message

Examples:
- feat(auth): add Google OAuth support
- fix(payments): resolve webhook signature verification
- docs(readme): update setup instructions
- refactor(api): improve error handling
```

Types:

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style/formatting
- `refactor` - Code refactoring
- `perf` - Performance improvement
- `test` - Test updates
- `chore` - Maintenance
- `build` - Build system changes
- `ci` - CI/CD changes

### 4. Run Pre-commit Checks

Before committing, ensure:

```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Tests
npm test

# Build verification
npm run build
```

Husky pre-commit hooks will automatically run these checks.

### 5. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub:

- Use the PR template
- Provide a clear description
- Link related issues
- Add screenshots if applicable
- Request reviews

## Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Use functional components and hooks in React
- Prefer `const` over `let`, avoid `var`
- Use async/await over promises
- Add JSDoc comments for public functions
- Keep functions small and focused

Example:

```typescript
/**
 * Generates a document checklist for a visa application
 * @param applicationId - The visa application ID
 * @param userId - The user ID (for verification)
 * @returns Document checklist with status
 */
async function generateChecklist(
  applicationId: string,
  userId: string
): Promise<DocumentChecklist> {
  // Implementation
}
```

### Python

- Follow PEP 8 style guide
- Use type hints
- Use docstrings for functions/classes
- Use `black` for formatting
- Use `flake8` for linting

Example:

```python
def search_documents(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search documents using RAG

    Args:
        query: Search query
        limit: Maximum number of results

    Returns:
        List of matching documents
    """
    # Implementation
```

## Testing Guidelines

### Backend Tests

Location: `apps/backend/src/__tests__/`

```bash
cd apps/backend
npm test
```

Write tests for:

- All new API endpoints
- Service layer functions
- Utility functions
- Error handling

### Frontend Tests

Location: `frontend_new/src/__tests__/`

```bash
cd frontend_new
npm test
```

Write tests for:

- Critical user flows
- Components with complex logic
- API integration
- State management

### Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something specific', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await functionToTest(input);

    // Assert
    expect(result).toBe('expected');
  });

  afterEach(() => {
    // Cleanup
  });
});
```

## Pull Request Process

1. **Ensure CI passes** - All checks must pass
2. **Get reviews** - At least one approval required
3. **Update documentation** - If changes affect usage
4. **Squash commits** - Keep history clean (optional)
5. **Merge** - Maintainer will merge when approved

## Reporting Issues

Use GitHub Issues with appropriate templates:

- **Bug Report** - For bugs and errors
- **Feature Request** - For new features
- **Question** - For questions and discussions

## Code Review Guidelines

When reviewing PRs:

- Be respectful and constructive
- Focus on code quality and correctness
- Suggest improvements, don't demand
- Approve if changes look good
- Request changes if issues found

## Need Help?

- Check the [README](README.md)
- Read the [documentation](docs/)
- Ask in GitHub Discussions
- Contact maintainers

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to VisaBuddy! 🎉
