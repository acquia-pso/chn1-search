import { yextConfig } from './yext-config';

/**
 * Types for Yext API responses
 */
export interface YextResult {
  id: string;
  name: string;
  type: string;
  description?: string;
  data: {
    c_url?: string;
    websiteUrl?: {
      url: string;
    };
    address?: {
      line1: string;
      city: string;
      region: string;
      postalCode: string;
    };
    headshot?: {
      url: string;
    };
    c_testimonial_Photo?: string;
    c_person_Photos?: string;
    c_specialties?: string[];
    c_phoneSearch?: string;
    c_locationHoursAndFax?: string;
    c_googleMapLocations?: string;
    c_author?: string;
    c_authorCreatedDate?: string;
    c_classes_events_start_date?: string;
    c_title?: string;
    s_snippet?: string;
    [key: string]: unknown;
  };
  raw: Record<string, unknown>;
  highlightedFields?: {
    [key: string]: {
      value: string;
      matchedSubstrings: { offset: number; length: number }[];
    };
  };
}

export interface YextMatchedSubstring {
  offset: number;
  length: number;
}

export interface YextSuggestion {
  value: string;
  verticalKeys: string[];
  matchedSubstrings: YextMatchedSubstring[];
}

export interface YextAutocompleteResponse {
  meta: {
    uuid: string;
    errors: Error[];
  };
  response: {
    input: {
      value: string;
      queryIntents: Array<{
        type: string;
        confidence: number;
      }>;
    };
    results: YextSuggestion[];
  };
}

export interface YextVerticalResults {
  verticalConfigId: string;
  resultsCount: number;
  results: YextResult[];
  facets?: Array<{
    fieldId: string;
    displayName: string;
    options: Array<{
      displayName: string;
      count: number;
      selected: boolean;
    }>;
  }>;
}

export interface YextUniversalSearchResponse {
  meta: {
    uuid: string;
    errors: Error[];
  };
  response: {
    businessId: string;
    queryId: string;
    modules: YextVerticalResults[];
    failedVerticals?: Array<{
      verticalConfigId: string;
      errorType: string;
      details: {
        responseCode: number;
        description: string;
      };
      queryDurationMillis: number;
    }>;
    spellCheck?: {
      originalQuery: string;
      correctedQuery: {
        value: string;
        matchedSubstrings: YextMatchedSubstring[];
      };
      type: string;
    };
  };
}

export interface YextVerticalResponse {
  meta: {
    uuid: string;
    errors: Error[];
  };
  response: {
    businessId: string;
    queryId: string;
    resultsCount: number;
    results: YextResult[];
    facets?: Array<{
      fieldId: string;
      displayName: string;
      options: Array<{
        displayName: string;
        count: number;
        selected: boolean;
      }>;
    }>;
  };
}

export interface YextGenerateAnswerResponse {
  meta: {
    uuid: string;
  };
  response: {
    directAnswer: string;
    resultStatus: string;
    citations: string[];
  };
}

/**
 * Yext API Service
 */
export class YextAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getBaseUrl();
  }

  /**
   * Get base URL for API calls
   */
  private getBaseUrl(): string {
    return `${yextConfig.environment === 'sandbox' ? 'https://api.sandbox' : 'https://cdn'}.yextapis.com/v2/accounts/${yextConfig.businessId}`;
  }

  /**
   * Create API URL with parameters
   */
  private createUrl(endpoint: string, params: Record<string, string>): string {
    const searchParams = new URLSearchParams({
      api_key: yextConfig.apiKey,
      v: yextConfig.apiVersion,
      experienceKey: 'universal-search',
      locale: 'en',
      version: 'PRODUCTION',
      ...params,
    });
    return `${this.baseUrl}${endpoint}?${searchParams.toString()}`;
  }

  /**
   * Get search suggestions based on partial input
   * This endpoint should be called after each keystroke
   */
  async getAutocomplete(input: string): Promise<YextAutocompleteResponse> {
    const url = this.createUrl('/search/autocomplete', {
      input: input,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yext API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Perform universal search across all verticals
   */
  async universalSearch(
    query: string,
    options?: {
      limit?: Record<string, number>;
      location?: string;
      restrictVerticals?: string[];
      skipSpellCheck?: boolean;
      queryTrigger?: 'suggest' | 'initialize';
      source?: string;
    }
  ): Promise<YextUniversalSearchResponse> {
    const params: Record<string, string> = {
      input: query,
    };

    // Add optional parameters
    if (options?.limit) {
      params.limit = JSON.stringify(options.limit);
    }
    if (options?.location) {
      params.location = options.location;
    }
    if (options?.restrictVerticals) {
      params.restrictVerticals = options.restrictVerticals.join(',');
    }
    if (options?.skipSpellCheck) {
      params.skipSpellCheck = 'true';
    }
    if (options?.queryTrigger) {
      params.queryTrigger = options.queryTrigger;
    }
    if (options?.source) {
      params.source = options.source;
    }

    const url = this.createUrl('/search/query', params);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yext API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Perform vertical search within a specific vertical
   */
  async verticalSearch(
    query: string,
    verticalKey: string,
    page: number = 1,
    limit: number = 20,
    filters?: Record<string, unknown>
  ): Promise<YextVerticalResponse> {
    const params: Record<string, string> = {
      input: query,
      verticalKey,
      offset: String((page - 1) * limit),
      limit: String(limit),
    };

    // Add filters if specified
    if (filters) {
      params.filters = JSON.stringify(filters);
    }

    const url = this.createUrl('/search/vertical/query', params);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yext API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available verticals
   */
  async getVerticals(): Promise<string[]> {
    const url = this.createUrl('/verticals', {});

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yext API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.verticals || [];
  }

  /**
   * Generate an AI answer for the given query
   */
  async generateAnswer(
    query: string,
    searchId: string,
    results: YextUniversalSearchResponse['response']
  ): Promise<YextGenerateAnswerResponse | null> {
    const params = new URLSearchParams({
      api_key: yextConfig.apiKey,
      v: yextConfig.apiVersion,
      experienceKey: 'universal-search',
      locale: 'en',
      version: 'PRODUCTION',
    });

    const requestBody = {
      searchId,
      searchTerm: query,
      results,
    };

    const url = `${this.baseUrl}/search/generateAnswer?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Handle specific HTTP status codes
      if (response.status === 404) {
        console.warn('Generate Answer endpoint not available');
        return null;
      }

      if (response.status === 429) {
        console.warn('Rate limit exceeded for Generate Answer API');
        return null;
      }

      if (!response.ok) {
        // Try to get more detailed error information from the response
        try {
          const errorData = await response.json();
          console.warn('Generate Answer API error:', errorData);
        } catch (e) {
          // If we can't parse the error response, just log the status
          console.warn(`Generate Answer API error: ${response.status} ${response.statusText}`);
        }
        return null;
      }

      const data = await response.json();

      // Check if the response has the expected structure
      if (!data.response?.directAnswer || !data.response?.resultStatus) {
        console.warn('Invalid response format from Generate Answer API');
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to generate AI answer:', error);
      return null;
    }
  }
}

// Export singleton instance
export const yextAPI = new YextAPI();
