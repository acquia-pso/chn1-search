/**
 * Types for Yext suggestions
 */
export interface YextSuggestion {
  value: string;
  verticalKeys: string[];
  matchedSubstrings: {
    offset: number;
    length: number;
  }[];
}

export interface YextSuggestionsResponse {
  meta: {
    uuid: string;
    errors: Error[];
  };
  response: {
    input: {
      value: string;
    };
    results: YextSuggestion[];
  };
}

/**
 * Mock function to get suggestions from Yext
 * TODO: Replace with actual Yext API call
 */
export async function fetchYextSuggestions(
  input: string
): Promise<YextSuggestion[]> {
  // This is a mock implementation
  // Replace with actual Yext API call
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        {
          value: `${input} suggestion 1`,
          verticalKeys: ['all'],
          matchedSubstrings: [{ offset: 0, length: input.length }],
        },
        {
          value: `${input} suggestion 2`,
          verticalKeys: ['products'],
          matchedSubstrings: [{ offset: 0, length: input.length }],
        },
      ]);
    }, 100);
  });
}
