/**
 * Types for the Yext search store
 */
export interface SearchSettings {
  input: string;
  vertical?: string;
  page?: number;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
  facetFilters?: Record<string, unknown>;
  sortBys?: Array<{ type: string }>;
  retrieveFacets?: boolean;
}

export interface StoreSubscriber {
  onStateChange: (settings: SearchSettings) => void;
}

/**
 * Default search settings
 */
export const defaultSearchSettings: SearchSettings = {
  input: '',
  vertical: 'all',
  page: 1,
  limit: 16,
  offset: 0,
  filters: {},
  facetFilters: {},
  sortBys: [{ type: 'RELEVANCE' }],
  retrieveFacets: true,
};

/**
 * YextStore - Manages application state through URL parameters
 * Implements publisher-subscriber pattern for state changes
 */
export class YextStore {
  private subscribers: Set<StoreSubscriber> = new Set();
  private currentSettings: SearchSettings;

  constructor() {
    this.currentSettings = this.getSettingsFromUrl();
    this.setupHistoryListener();
  }

  /**
   * Subscribe to state changes
   * @param subscriber - Component that wants to receive state updates
   */
  subscribe(subscriber: StoreSubscriber): void {
    this.subscribers.add(subscriber);
    // Immediately notify new subscriber of current state
    subscriber.onStateChange(this.currentSettings);
  }

  /**
   * Unsubscribe from state changes
   * @param subscriber - Component to unsubscribe
   */
  unsubscribe(subscriber: StoreSubscriber): void {
    this.subscribers.delete(subscriber);
  }

  /**
   * Update search settings and notify subscribers
   * @param settings - Partial settings to update
   */
  updateSettings(settings: Partial<SearchSettings>): void {
    // Reset page to 1 and clear offset when vertical changes
    if (
      settings.vertical &&
      settings.vertical !== this.currentSettings.vertical
    ) {
      settings.page = 1;
      settings.offset = 0;
    }

    this.currentSettings = {
      ...this.currentSettings,
      ...settings,
    };

    this.updateUrl();
    this.notifySubscribers();
  }

  /**
   * Get current search settings
   */
  getSettings(): SearchSettings {
    return { ...this.currentSettings };
  }

  /**
   * Parse settings from URL parameters
   */
  private getSettingsFromUrl(): SearchSettings {
    const params = new URLSearchParams(window.location.search);
    const settings: SearchSettings = { ...defaultSearchSettings };

    // Parse each parameter with yext_ prefix
    for (const [key, value] of params.entries()) {
      if (key.startsWith('yext_')) {
        const settingKey = key.replace('yext_', '');

        // Skip if not a valid setting key
        if (!this.isValidSettingKey(settingKey)) continue;

        try {
          // Try to parse as JSON for complex values
          const parsedValue = JSON.parse(value);
          this.processSettingValue(settings, settingKey, parsedValue);
        } catch {
          // Use raw value if not JSON
          this.processSettingValue(settings, settingKey, value);
        }
      }
    }

    return settings;
  }

  /**
   * Check if the key is a valid setting key
   */
  private isValidSettingKey(key: string): key is keyof SearchSettings {
    return [
      'input',
      'vertical',
      'page',
      'limit',
      'offset',
      'filters',
      'facetFilters',
      'sortBys',
      'retrieveFacets',
    ].includes(key);
  }

  /**
   * Process and validate a setting value
   */
  private processSettingValue(
    settings: SearchSettings,
    key: keyof SearchSettings,
    value: unknown
  ): void {
    let numValue: number;
    let offsetValue: number;

    switch (key) {
      case 'input':
      case 'vertical':
        if (typeof value === 'string') {
          settings[key] = value;
        }
        break;
      case 'page':
      case 'limit':
        numValue =
          typeof value === 'string' ? Number(value) : (value as number);
        if (typeof numValue === 'number' && !isNaN(numValue)) {
          settings[key] = numValue;
        }
        break;
      case 'offset':
        if (typeof value === 'string') {
          offsetValue = Number(value);
          if (!isNaN(offsetValue)) {
            settings[key] = offsetValue;
          }
        }
        break;
      case 'filters':
        if (value !== null && typeof value === 'object') {
          settings.filters = value as Record<string, unknown>;
        }
        break;
      case 'facetFilters':
        if (value !== null && typeof value === 'object') {
          settings.facetFilters = value as Record<string, unknown>;
        }
        break;
      case 'sortBys':
        if (value !== null && Array.isArray(value)) {
          settings.sortBys = value as Array<{ type: string }>;
        }
        break;
      case 'retrieveFacets':
        if (typeof value === 'boolean') {
          settings.retrieveFacets = value;
        }
        break;
    }
  }

  /**
   * Update URL with current settings
   */
  private updateUrl(): void {
    const params = new URLSearchParams();

    // Add each setting to URL parameters
    Object.entries(this.currentSettings).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const paramValue =
          typeof value === 'object' ? JSON.stringify(value) : String(value);
        params.set(`yext_${key}`, paramValue);
      }
    });

    // Update URL without reloading page
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(
      {
        path: newUrl,
        searchSettings: { ...this.currentSettings },
      },
      '',
      newUrl
    );
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(subscriber => {
      subscriber.onStateChange(this.currentSettings);
    });
  }

  /**
   * Setup browser history listener for back/forward navigation
   */
  private setupHistoryListener(): void {
    window.addEventListener('popstate', event => {
      // Try to get settings from state first
      if (event.state?.searchSettings) {
        this.currentSettings = event.state.searchSettings;
      } else {
        // Fallback to parsing from URL if state is not available
        this.currentSettings = this.getSettingsFromUrl();
      }
      this.notifySubscribers();
    });
  }
}

// Export singleton instance
export const yextStore = new YextStore();
