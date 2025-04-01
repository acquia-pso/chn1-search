import { yextConfig } from './yext-config';

/**
 * Types for Yext API responses
 */
export interface YextResult {
  id: string;
  name: string;
  type: string;
  entityType?: string;
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

export interface YextCitationResponse {
  meta: {
    uuid: string;
    errors: Error[];
  };
  response: {
    docs: Array<{
      $key: {
        locale: string;
        primary_key: string;
      };
      meta: {
        entityType: {
          id: string;
          uid: number;
        };
      };
      uid: number;
      name: string;
      description?: string;
      c_content?: string;
      url?: string;
      c_url?: string;
      landingPageUrl?: string;
      websiteUrl?: {
        url: string;
      };
    }>;
    count: number;
  };
}

interface FormattedCitation {
  id: string;
  title: string;
  description?: string;
  url?: string;
  content?: string;
  entityType?: string;
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
      // Log the raw response
      const responseText = await response.text();

      // Parse the response if it's JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.warn('Failed to parse response as JSON:', e);
        return null;
      }

      if (!response.ok) {
        console.warn('Generate Answer API error:', data);
        return null;
      }

      // Validate response structure
      if (!data.response?.directAnswer) {
        console.warn('Invalid response format - missing directAnswer:', data);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to generate AI answer:', error);
      return null;
    }
  }

  /**
   * Fetch citation content by ID from the content endpoint
   */
  async fetchCitationContent(
    citationId: string
  ): Promise<YextCitationResponse | null> {
    const params = new URLSearchParams({
      api_key: yextConfig.apiKey,
      v: yextConfig.apiVersion,
      uid: citationId,
    });

    const url = `${this.baseUrl}/content/gAEntities?${params.toString()}`;

    try {
      const response = await fetch(url);
      const responseText = await response.text();

      if (response.status === 403) {
        console.warn('Access forbidden to content endpoint');
        return null;
      }

      if (!response.ok) {
        console.warn(
          `Content API error: ${response.status} ${response.statusText}`
        );
        return null;
      }

      // Parse the response as JSON
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.warn('Failed to parse citation response as JSON');
        return null;
      }
    } catch (error) {
      console.warn('Failed to fetch citation content:', error);
      return null;
    }
  }

  /**
   * Enhanced generateAnswer method that also fetches citation content
   */
  async generateAnswerWithCitations(
    query: string,
    searchId: string,
    results: YextUniversalSearchResponse['response']
  ): Promise<{
    answer: YextGenerateAnswerResponse | null;
    citations: FormattedCitation[];
  }> {
    const answer = await this.generateAnswer(query, searchId, results);
    const formattedCitations: FormattedCitation[] = [];

    // Add entity type mapping
    const entityTypeMap: { [key: string]: string } = {
      healthcareProfessional: 'Healthcare Professional',
      ce_location: 'Location',
      ce_service: 'Health Service',
      ce_procedure: 'Procedure',
      ce_blog: 'Blog',
      ce_careersArea: 'Career Area',
      ce_careersPage: 'Careers Page',
      ce_news: 'News',
      ce_person: 'Person',
      ce_personGroup: 'Person Group',
      ce_pageServices: 'Other',
      ce_testimonial: 'Testimonial',
      ce_classesAndEvents: 'Classes and Events',
      ce_educationResearch: 'Education and Research',
    };

    if (answer?.response?.citations) {
      const citationPromises = answer.response.citations.map(citationId =>
        this.fetchCitationContent(citationId)
      );

      try {
        const citationResults = await Promise.all(citationPromises);

        citationResults.forEach(citation => {
          if (citation?.response.docs[0]) {
            const doc = citation.response.docs[0];

            const url = doc.c_url
              ? `https://www.ecommunity.com${doc.c_url.startsWith('/') ? '' : '/'}${doc.c_url}`
              : doc.websiteUrl?.url || undefined;

            // Map the entity type or use original if not in map
            // if not in the map use other?
            const rawEntityType = doc.meta?.entityType?.id;
            const mappedEntityType = rawEntityType
              ? entityTypeMap[rawEntityType] || 'Other'
              : 'Other';
            formattedCitations.push({
              id: doc.$key.primary_key,
              title: doc.name,
              description: doc.description,
              url: url || undefined,
              content: doc.c_content,
              entityType: mappedEntityType,
            });
          }
        });
      } catch (error) {
        console.error('Error fetching citations:', error);
      }
    }

    return { answer, citations: formattedCitations };
  }
}

// Export singleton instance
export const yextAPI = new YextAPI();
