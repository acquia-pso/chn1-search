# Component Documentation

## Overview
This document details the core components of the Yext Search Integration, their purposes, and how they interact with each other.

## Universal Search Components (`outline-yext-universal/`)

### Purpose
Provides cross-vertical search functionality that allows users to search across all available verticals simultaneously.

### Key Features
- Universal search input handling
- Cross-vertical result aggregation
- Intent detection and routing
- Dynamic vertical switching

### Usage
```typescript
// Example implementation
<outline-yext-universal
  apiKey="your-api-key"
  businessId="your-business-id"
  verticals={['locations', 'products', 'faqs']}
/>
```

## Vertical Search Components (`outline-yext-vertical/`)

### Purpose
Implements vertical-specific search functionality with specialized features for each vertical type.

### Key Features
- Vertical-specific search parameters
- Custom result formatting
- Specialized filtering options
- Vertical-specific facets

### Usage
```typescript
// Example implementation
<outline-yext-vertical
  vertical="locations"
  filters={locationFilters}
  facets={locationFacets}
/>
```

## Pager Component (`outline-yext-pager/`)

### Purpose
Manages result pagination and navigation through search results.

### Key Features
- Page state management
- Navigation controls
- Results per page configuration
- Page information display

### Usage
```typescript
// Example implementation
<outline-yext-pager
  totalResults={100}
  resultsPerPage={20}
  currentPage={1}
/>
```

## Entity Components (`outline-yext-entities/`)

### Purpose
Provides standardized display components for different entity types returned by Yext.

### Supported Entity Types
- Locations
- Products
- FAQs
- Articles
- Events
- Custom entities

### Usage
```typescript
// Example implementation
<outline-yext-entity
  entityType="location"
  data={locationData}
  template="card"
/>
```

## UI Components (`ui-yext/`)

### Total Count Component
Displays the total number of results found.

```typescript
<total-count
  count={totalResults}
  vertical="products"
/>
```

### Search Input Component
Handles user input for search queries.

```typescript
<search-input
  placeholder="Search..."
  onSearch={handleSearch}
/>
```

## Component Interaction

### State Management
- Components communicate through the URL-based state store
- State changes trigger appropriate component updates
- Components maintain internal state when necessary

### Event Flow
1. User interaction triggers component event
2. Component updates URL state
3. State change notifications propagate
4. Affected components re-render

## Best Practices

### Component Implementation
1. Keep components focused and single-purpose
2. Implement proper error boundaries
3. Use TypeScript for type safety
4. Follow consistent naming conventions

### State Management
1. Use URL parameters for shareable state
2. Minimize internal component state
3. Implement proper state synchronization
4. Handle state updates efficiently

### Performance
1. Implement lazy loading where appropriate
2. Optimize re-renders
3. Use proper memoization
4. Handle loading and error states

## Testing

### Component Tests
- Unit tests for individual components
- Integration tests for component interactions
- Snapshot tests for UI consistency
- Performance tests for critical components
- End-to-end tests using Playwright

### Example Test
```typescript
import { test, expect } from '@playwright/test';

test('search functionality', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="search-input"]', 'test query');
  await page.click('[data-testid="search-button"]');
  
  // Assert results are displayed
  await expect(page.locator('.search-results')).toBeVisible();
});
```

## Customization

### Theming
Components support customization through:
- CSS variables
- Theme configuration
- Custom templates
- Slot-based content injection

### Extension
Components can be extended through:
- Custom event handlers
- Template overrides
- Slot content
- Custom styling

## Error Handling

### Component-Level Errors
- Implement error boundaries
- Provide fallback UI
- Log errors appropriately
- Maintain user experience

### Example Error Handling
```typescript
try {
  // Component logic
} catch (error) {
  // Error handling
  this.handleError(error);
}
```

## Accessibility

### Requirements
- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management

### Implementation
```typescript
// Example accessible component
<button
  aria-label="Next page"
  role="button"
  tabindex="0"
>
  Next
</button>
```

## React Components

### Search Container Component

#### Purpose
Provides a React-based container for search functionality and state management.

#### Key Features
- Integration with Web Components
- Search state management
- Event handling
- Component composition

#### Usage
```typescript
// Example implementation
import { SearchContainer } from './components/SearchContainer';

function App() {
  return (
    <SearchContainer
      apiKey={process.env.YEXT_API_KEY}
      businessId={process.env.YEXT_BUSINESS_ID}
      verticals={['locations', 'products', 'faqs']}
    />
  );
}
```

## Web Components

### Usage with React
```typescript
// Example of using Web Components in React
import { useEffect, useRef } from 'react';

function SearchWrapper() {
  const searchRef = useRef(null);

  useEffect(() => {
    // Setup and configuration
  }, []);

  return (
    <outline-yext-universal
      ref={searchRef}
      apiKey={process.env.YEXT_API_KEY}
      businessId={process.env.YEXT_BUSINESS_ID}
    />
  );
}
``` 