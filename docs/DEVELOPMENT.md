# Development Guide

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Yarn package manager
- Yext API credentials
- TypeScript knowledge
- Web Components understanding
- React knowledge

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install Dependencies**
   ```bash
   yarn install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   YEXT_API_KEY=your_api_key
   YEXT_BUSINESS_ID=your_business_id
   YEXT_ENV=production
   ```

## Project Structure

```
src/
├── components/              # Web components and React components
│   ├── outline-yext-universal/
│   ├── outline-yext-vertical/
│   ├── outline-yext-pager/
│   ├── outline-yext-entities/
│   └── SearchContainer.tsx
├── libraries/              # Shared libraries
│   ├── data-access-yext/   # Yext API integration
│   └── ui-yext/            # UI components
├── controllers/            # Application controllers
├── stories/               # Storybook stories
└── tests/                 # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

## Development Workflow

### Running the Development Server
```bash
yarn dev
```

### Building for Production
```bash
yarn build
```

### Running Tests
```bash
yarn test
```

## Component Development

### Creating a New Component

1. **Create Component Directory**
   ```bash
   mkdir src/components/my-new-component
   ```

2. **Component Structure**
   ```typescript
   // my-new-component.ts
   export class MyNewComponent extends HTMLElement {
     constructor() {
       super();
       this.attachShadow({ mode: 'open' });
     }
     
     connectedCallback() {
       this.render();
     }
     
     render() {
       // Implementation
     }
   }
   
   customElements.define('my-new-component', MyNewComponent);
   ```

### Component Testing

1. **Unit Tests**
   ```typescript
   // my-new-component.test.ts
   describe('MyNewComponent', () => {
     it('should render correctly', () => {
       // Test implementation
     });
   });
   ```

2. **Integration Tests**
   ```typescript
   describe('MyNewComponent Integration', () => {
     it('should interact with other components', () => {
       // Test implementation
     });
   });
   ```

## Working with the Yext API

### Authentication
```typescript
// Example API client setup
const client = new YextClient({
  apiKey: process.env.YEXT_API_KEY,
  businessId: process.env.YEXT_BUSINESS_ID
});
```

### Making API Calls
```typescript
// Example search request
async function performSearch(query: string) {
  try {
    const response = await client.search({
      input: query,
      // other parameters
    });
    return response;
  } catch (error) {
    handleError(error);
  }
}
```

## State Management

### URL State
```typescript
// Example state update
function updateSearchState(newState: SearchSettings) {
  const params = new URLSearchParams();
  Object.entries(newState).forEach(([key, value]) => {
    params.set(`yext_${key}`, JSON.stringify(value));
  });
  updateUrlParameters(params);
}
```

## Error Handling

### Component Errors
```typescript
class ErrorBoundary extends HTMLElement {
  handleError(error: Error) {
    console.error('Component error:', error);
    this.render(); // Render fallback UI
  }
}
```

## Performance Optimization

### Lazy Loading
```typescript
// Example lazy loading implementation
async function loadComponent() {
  const module = await import('./my-component');
  return module.MyComponent;
}
```

### Caching
```typescript
// Example cache implementation
const cache = new Map();

function getCachedData(key: string) {
  if (!cache.has(key)) {
    cache.set(key, fetchData(key));
  }
  return cache.get(key);
}
```

## Debugging

### Browser DevTools
1. Open browser developer tools
2. Navigate to Elements tab
3. Inspect shadow DOM components
4. Use console for debugging

### URL Parameters
- Check URL parameters for state
- Use browser console to view state changes
- Monitor network requests

## Build Process

### Development Build
```bash
yarn dev
# Starts development server with hot reloading
```

### Production Build
```bash
yarn build
# Creates optimized production build
```

### Testing Build
```bash
yarn test
# Runs test suite
```

## Contributing

### Code Style
- Follow TypeScript best practices
- Use consistent naming conventions
- Document public APIs
- Write meaningful comments

### Pull Request Process
1. Create feature branch
2. Make changes
3. Write tests
4. Update documentation
5. Submit PR

## Troubleshooting

### Common Issues

1. **API Authentication**
   - Check API key configuration
   - Verify environment variables
   - Check network requests

2. **Component Rendering**
   - Inspect shadow DOM
   - Check for JavaScript errors
   - Verify component registration

3. **State Management**
   - Check URL parameters
   - Verify state updates
   - Monitor state flow

### Debug Logging
```typescript
// Enable debug logging
const DEBUG = true;

function log(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data);
  }
}
```

## Resources

### Documentation
- [Yext API Documentation](https://developer.yext.com/docs)
- [Web Components MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Tools
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
- [VS Code Extensions](https://code.visualstudio.com/docs/editor/extension-gallery)
- [TypeScript Playground](https://www.typescriptlang.org/play)

## Testing

### Setting Up Tests

1. **Install Playwright**
   ```bash
   yarn add -D @playwright/test
   npx playwright install
   ```

2. **Configure Playwright**
   ```typescript
   // playwright.config.ts
   import { PlaywrightTestConfig } from '@playwright/test';
   
   const config: PlaywrightTestConfig = {
     testDir: './tests/e2e',
     use: {
       baseURL: 'http://localhost:3000',
       screenshot: 'only-on-failure',
     },
     webServer: {
       command: 'yarn dev',
       port: 3000,
       reuseExistingServer: !process.env.CI,
     },
   };
   
   export default config;
   ```

3. **Run Tests**
   ```bash
   # Run all tests
   yarn test
   
   # Run e2e tests
   yarn test:e2e
   
   # Run unit tests
   yarn test:unit
   ```

### Writing Tests

1. **E2E Tests**
   ```typescript
   // tests/e2e/search.spec.ts
   import { test, expect } from '@playwright/test';
   
   test('search functionality', async ({ page }) => {
     await page.goto('/');
     await page.fill('[data-testid="search-input"]', 'test');
     await expect(page.locator('.search-results')).toBeVisible();
   });
   ```

2. **Unit Tests**
   ```typescript
   // tests/unit/components/SearchContainer.test.tsx
   import { render, screen } from '@testing-library/react';
   import { SearchContainer } from '../../../components/SearchContainer';
   
   test('renders search container', () => {
     render(<SearchContainer />);
     expect(screen.getByTestId('search-container')).toBeInTheDocument();
   });
   ```

## Development Tools

### Storybook
```bash
# Run Storybook
yarn storybook

# Build Storybook
yarn build-storybook
```

### Code Quality
```bash
# Run ESLint
yarn lint

# Run TypeScript type checking
yarn type-check

# Run Prettier
yarn format
``` 