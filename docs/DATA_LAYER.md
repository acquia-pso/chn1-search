# Data Layer Documentation

## Overview
The data layer manages all interactions with Yext APIs and handles state management for the search functionality. It provides a clean interface between the UI components and the underlying data services.

## Core Components

### Yext Store (`yext-store.ts`)

#### Purpose
Manages the application's search state using URL parameters for persistence and shareability.

#### Key Features
- URL-based state management
- Search settings serialization
- State synchronization
- Default value handling

#### Implementation
```typescript
// Default search settings
const defaultSearchSettings = {
  input: '',
  offset: 0,
  limit: 16,
  filters: {},
  facetFilters: {},
  sortBys: [{ type: 'RELEVANCE' }]
};

// State management functions
export const getStoredSearchSettings = () => {
  // Retrieves search settings from URL
};

export const setStoredSearchSettings = (searchSettings: SearchSettings) => {
  // Updates URL with new search settings
};
```

### Type System (`yext-types.ts`)

#### Core Types
```typescript
// Search Settings
interface SearchSettings {
  input: string;
  limit: number;
  offset: number;
  filters: QueryParam;
  facetFilters: QueryParam;
  sortBys: SortBy[];
  verticalKey?: string;
}

// API Response Types
interface ResponseContent {
  input: { value: string };
  results: Result[];
  facets?: Facet[];
  totalResults: number;
}

// Entity Types
interface ResultItemData {
  id: string;
  type: string;
  name: string;
  description?: string;
  c_photo?: string;
  address?: Address;
  // Additional fields based on entity type
}

// Facet Types
interface Facet {
  fieldId: string;
  displayName: string;
  options: FacetOption[];
}

interface FacetOption {
  value: string;
  displayName: string;
  count: number;
  selected: boolean;
}
```

## Data Flow

### Search Flow
1. User Input
   ```typescript
   // Component triggers search
   searchStore.setStoredSearchSettings({
     input: searchQuery,
     offset: 0
   });
   ```

2. State Update
   ```typescript
   // URL parameters are updated
   updateUrlParameters(newParams, 'yext_');
   ```

3. API Request
   ```typescript
   // API call is made with current settings
   const response = await fetchSearchResults(getStoredSearchSettings());
   ```

### Filter Flow
1. Filter Selection
   ```typescript
   // Update filters in store
   searchStore.setStoredSearchSettings({
     ...currentSettings,
     filters: newFilters
   });
   ```

2. Results Update
   ```typescript
   // Trigger new search with updated filters
   await refreshSearchResults();
   ```

## API Integration

### Universal Search
```typescript
interface UniversalSearchResponse {
  businessId: number;
  queryId: string;
  modules: Module[];
}

async function performUniversalSearch(settings: SearchSettings) {
  // Implementation
}
```

### Vertical Search
```typescript
interface VerticalSearchResponse {
  businessId: number;
  queryId: string;
  resultsCount: number;
  results: VerticalSearchResult[];
}

async function performVerticalSearch(vertical: string, settings: SearchSettings) {
  // Implementation
}
```

## State Management

### URL Parameters
- All Yext-related parameters are prefixed with `yext_`
- Complex objects are serialized to JSON strings
- State changes trigger URL updates
- Browser history is maintained
- Support for React state integration

### Example URL Structure
```
https://example.com/search
  ?yext_input=query
  &yext_offset=0
  &yext_limit=20
  &yext_verticalKey=locations
  &yext_filters={"location":{"$eq":"New York"}}
```

### React Integration
```typescript
// Example React state integration
function useYextSearch() {
  const [searchState, setSearchState] = useState<SearchSettings>(defaultSearchSettings);
  
  useEffect(() => {
    // Sync URL parameters with React state
    const params = new URLSearchParams(window.location.search);
    const newState = parseSearchParams(params);
    setSearchState(newState);
  }, []);

  return { searchState, setSearchState };
}
```

## Error Handling

### API Errors
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

function handleApiError(error: ApiError) {
  // Error handling implementation
}
```

### State Errors
```typescript
function handleStateError(error: Error) {
  // State error handling
  console.error('State management error:', error);
}
```

## Performance Optimization

### Caching
```typescript
const searchResultsCache = new Map<string, SearchResponse>();

function getCachedResults(key: string) {
  return searchResultsCache.get(key);
}
```

### Batch Processing
```typescript
async function batchProcessResults(results: Result[]) {
  // Batch processing implementation
}
```

## Testing

### Unit Tests
```typescript
describe('YextStore', () => {
  it('should properly serialize search settings', () => {
    // Test implementation
  });

  it('should handle state updates correctly', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('API Integration', () => {
  it('should handle API responses correctly', () => {
    // Test implementation
  });
});
```

## Best Practices

### State Management
1. Always use type-safe operations
2. Maintain atomic updates
3. Handle edge cases gracefully
4. Implement proper error boundaries

### API Integration
1. Implement proper retry logic
2. Handle rate limiting
3. Cache responses when appropriate
4. Validate API responses

### Performance
1. Minimize state updates
2. Implement efficient caching
3. Use batch processing
4. Optimize API calls

## Security Considerations

### API Security
- Secure API key management
- Request validation
- Response sanitization
- Error handling security

### Data Security
- Input validation
- Output encoding
- State validation
- URL parameter validation 