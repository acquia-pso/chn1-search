import { LitElement, html, unsafeCSS } from 'lit';
import { state } from 'lit/decorators.js';
import {
  yextStore,
  type SearchSettings,
  type StoreSubscriber,
} from '../../libraries/data-access-yext/yext-store';
import { type YextSuggestion } from '../../libraries/data-access-yext/yext-types';
import {
  yextAPI,
  type YextResult,
  type YextUniversalSearchResponse,
} from '../../libraries/data-access-yext/yext-api';
import { displayTeaser } from '../outline-yext-vertical/teaser';
import '../outline-yext-vertical/outline-yext-vertical';
import '../shared/outline-teaser/outline-teaser';
import { NoResultsMessage } from '../../libraries/ui-yext/no-results-message';
import componentStyles from './outline-yext-universal.css?inline';

function debounce<T extends (arg: string) => void>(
  func: T,
  wait: number
): (arg: string) => void {
  let timeout: number | null = null;

  return (arg: string) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(() => {
      func(arg);
      timeout = null;
    }, wait);
  };
}

interface OutlineYextVerticalElement extends HTMLElement {
  updateResults(
    input: string,
    vertical: string,
    page: number,
    limit: number
  ): Promise<void>;
}

interface MatchedSubstring {
  offset: number;
  length: number;
}

/**
 * Universal search component that provides cross-vertical search functionality
 * Implements accessibility features and clean state management
 */
export class OutlineYextUniversal
  extends LitElement
  implements StoreSubscriber
{
  @state() private searchValue = '';
  @state() private currentSuggestions: YextSuggestion[] = [];
  @state() private showSuggestions = false;
  @state() private isLoading = false;
  @state() private currentVertical = 'all';
  @state() private verticals: string[] = [];
  @state() private verticalCounts = new Map<string, number>();
  @state() private universalResponse:
    | YextUniversalSearchResponse['response']
    | null = null;
  @state() private error: string | null = null;
  @state() private isSearching = false;
  @state() private hasSearched = false;
  private needsScrollAndFocus = false;

  private suggestionTimeout: number | null = null;
  private verticalComponent: OutlineYextVerticalElement | null = null;
  private readonly debouncedHandleInput: (value: string) => void;
  private searchInputRef: HTMLInputElement | null = null;

  static styles = unsafeCSS(componentStyles);

  constructor() {
    super();
    this.debouncedHandleInput = debounce(this.handleInput.bind(this), 200);
  }

  connectedCallback(): void {
    super.connectedCallback();
    yextStore.subscribe(this);
  }

  firstUpdated(): void {
    this.searchInputRef =
      this.shadowRoot?.querySelector('input[type="search"]') || null;
    // Add click event listener to handle clicks outside
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    yextStore.unsubscribe(this);
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }
    // Remove click event listener
    document.removeEventListener('click', this.handleClickOutside.bind(this));
  }

  async onStateChange(settings: SearchSettings): Promise<void> {
    this.searchValue = settings.input || '';
    this.currentVertical = settings.vertical || 'all';

    if (settings.input) {
      await this.performSearch(settings);

      // After search completes, check if we need to scroll and focus
      if (this.needsScrollAndFocus) {
        this.needsScrollAndFocus = false;
        requestAnimationFrame(() => {
          const verticalsContainer = this.shadowRoot?.querySelector(
            '.verticals-container'
          );
          verticalsContainer?.scrollIntoView({ behavior: 'smooth' });

          setTimeout(() => {
            // Find the vertical component and focus its first result
            const verticalComponent = this.shadowRoot?.querySelector(
              'outline-yext-vertical'
            );
            if (verticalComponent) {
              const firstResult =
                verticalComponent.shadowRoot?.querySelector('.result-item');
              if (firstResult instanceof HTMLElement) {
                firstResult.setAttribute('tabindex', '0');
                firstResult.focus();
              }
            }
          }, 300);
        });
      }
    } else {
      this.clearResults();
    }
  }

  private async handleInput(value: string) {
    this.searchValue = value;

    // Don't show suggestions if we're in search mode or input is too short
    if (this.isSearching || !value || value.length < 3) {
      this.showSuggestions = false;
      this.currentSuggestions = [];
      return;
    }

    try {
      // Store the timeout ID for potential cancellation
      this.suggestionTimeout = window.setTimeout(async () => {
        const response = await yextAPI.getAutocomplete(value);
        // Only show suggestions if we're not in search mode
        if (!this.isSearching) {
          this.currentSuggestions = response.response.results;
          this.showSuggestions = this.currentSuggestions.length > 0;
        }
        this.suggestionTimeout = null;
      }, 200) as unknown as number;
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      this.showSuggestions = false;
      this.currentSuggestions = [];
    }
  }

  private handleInputEvent(e: Event) {
    const input = e.target as HTMLInputElement;
    this.searchValue = input.value;
    this.isSearching = false; // Reset search mode when user starts typing again
    this.debouncedHandleInput(input.value);
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Cancel any pending suggestion requests
      if (this.suggestionTimeout) {
        clearTimeout(this.suggestionTimeout);
        this.suggestionTimeout = null;
      }
      // Clear suggestions immediately
      this.showSuggestions = false;
      this.currentSuggestions = [];
      // Update search value from input directly to ensure it's current
      const input = e.target as HTMLInputElement;
      this.searchValue = input.value;
      // Trigger search immediately
      this.handleSearch();
    } else if (e.key === 'ArrowDown' && this.currentSuggestions.length > 0) {
      e.preventDefault();
      const firstSuggestion = this.shadowRoot?.querySelector(
        '.suggestion-item'
      ) as HTMLElement;
      firstSuggestion?.focus();
    } else if (e.key === 'Escape') {
      this.showSuggestions = false;
    }
  }

  private handleSearch() {
    // Cancel any pending suggestion requests
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
      this.suggestionTimeout = null;
    }
    this.showSuggestions = false;
    this.currentSuggestions = [];
    this.isSearching = true;
    this.hasSearched = true;
    yextStore.updateSettings({
      input: this.searchValue,
      vertical: 'all',
      page: 1,
    });
  }

  private selectSuggestion(suggestion: YextSuggestion) {
    this.searchValue = suggestion.value;
    this.showSuggestions = false;
    this.hasSearched = true;
    yextStore.updateSettings({
      input: suggestion.value,
      vertical: suggestion.verticalKeys[0] || 'all',
      page: 1,
    });
  }

  private async performSearch(settings: SearchSettings) {
    this.isLoading = true;
    this.error = null;
    this.hasSearched = true;

    try {
      const input = settings.input || '';
      const response = await yextAPI.universalSearch(input);

      // Check for timeout error - handle both possible response structures
      if (
        'error' in response.response &&
        response.response.error?.errorType === 'TIMEOUT'
      ) {
        console.warn('Search timeout detected');
        this.universalResponse = null;
        this.verticals = [];
        this.verticalCounts = new Map();
        return NoResultsMessage();
      }

      this.universalResponse = response.response;

      const availableVerticals = response.response.modules.map(
        module => module.verticalConfigId
      );

      this.verticalCounts = new Map(
        response.response.modules.map(module => [
          module.verticalConfigId,
          module.resultsCount,
        ])
      );

      this.verticals = availableVerticals;

      if (settings.vertical && settings.vertical !== 'all') {
        if (!this.verticalComponent) {
          this.verticalComponent = document.createElement(
            'outline-yext-vertical'
          ) as OutlineYextVerticalElement;
          this.shadowRoot
            ?.querySelector('.results-container')
            ?.appendChild(this.verticalComponent);
        }

        await this.verticalComponent.updateResults(
          input,
          settings.vertical,
          settings.page || 1,
          settings.limit || 16
        );
      } else {
        if (this.verticalComponent) {
          this.verticalComponent.remove();
          this.verticalComponent = null;
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      this.error = 'Search failed. Please try again.';
      this.universalResponse = null;
    } finally {
      this.isLoading = false;
    }
  }

  private clearResults() {
    if (this.verticalComponent) {
      this.verticalComponent.remove();
      this.verticalComponent = null;
    }
    this.universalResponse = null;
    this.verticals = [];
    this.error = null;
  }

  private getVerticalDisplayName(verticalKey: string): string {
    const titleMap: { [key: string]: string } = {
      'blog': 'Blog',
      'careers_area': 'Career Area',
      'classes-and-events': 'Classes and Events',
      'education_research': 'Education and Research',
      'healthcare_professionals': 'Healthcare Professional',
      'locationsearch': 'Location',
      'news': 'News',
      'page': 'Other',
      'person': 'Person',
      'procedure': 'Procedure',
      'service': 'Health Service',
      'testimonial': 'Testimonial',
    };

    return (
      titleMap[verticalKey] ||
      verticalKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, match => match.toUpperCase())
    );
  }

  private renderHighlightedText(suggestion: YextSuggestion) {
    const result = suggestion.value;
    const matches = suggestion.matchedSubstrings.sort(
      (a, b) => a.offset - b.offset
    );

    if (matches.length === 0) {
      return html`${result}`;
    }

    const parts: Array<ReturnType<typeof html>> = [];
    let lastIndex = 0;

    matches.forEach(match => {
      // Add text before the match
      if (match.offset > lastIndex) {
        parts.push(html`${result.slice(lastIndex, match.offset)}`);
      }

      // Add highlighted text
      parts.push(
        html`<mark
          >${result.slice(match.offset, match.offset + match.length)}</mark
        >`
      );
      lastIndex = match.offset + match.length;
    });

    // Add remaining text after last match
    if (lastIndex < result.length) {
      parts.push(html`${result.slice(lastIndex)}`);
    }

    return html`${parts}`;
  }

  private calculateTotalResults(
    response: YextUniversalSearchResponse['response']
  ): number {
    return response.modules.reduce(
      (sum, module) => sum + (module.resultsCount || 0),
      0
    );
  }

  private renderHighlightedField(field: string, result: YextResult): string {
    const fieldData = result.highlightedFields?.[field];
    if (!fieldData || !fieldData.matchedSubstrings?.length) {
      return (result.data[field] as string) || '';
    }

    const value = fieldData.value;
    const matches = fieldData.matchedSubstrings;

    // Sort matches by offset to ensure proper order
    const sortedMatches = matches.sort(
      (a: MatchedSubstring, b: MatchedSubstring) => a.offset - b.offset
    );
    let highlightedText = '';
    let lastIndex = 0;

    sortedMatches.forEach((match: MatchedSubstring) => {
      // Add text before the match
      if (match.offset > lastIndex) {
        highlightedText += value.slice(lastIndex, match.offset);
      }

      // Add highlighted text
      highlightedText += `<em>${value.slice(
        match.offset,
        match.offset + match.length
      )}</em>`;
      lastIndex = match.offset + match.length;
    });

    // Add remaining text after last match
    if (lastIndex < value.length) {
      highlightedText += value.slice(lastIndex);
    }

    return highlightedText;
  }

  private renderTeaser(result: YextResult) {
    return displayTeaser(result);
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  private getTeaserTitle(
    vertical: string,
    title: string,
    url: string | undefined
  ): string {
    const prefixes: { [key: string]: string } = {
      careers_area: 'Careers',
      procedure: this.getCategoryFromURL(url || ''),
      careers_page: 'Careers at Community',
    };
    const prefix = prefixes[vertical] || '';
    return prefix ? `${prefix} | ${title}` : title;
  }

  private getCategoryFromURL(url: string): string {
    const regex = /\/([^/]+)(?=\/[^/]+$)/;
    const match = url.match(regex);
    return match && match[1]
      ? match[1]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : '';
  }

  private handleClickOutside(event: MouseEvent) {
    const target = event.target as Node;
    const searchContainer = this.shadowRoot?.querySelector('.search-container');

    if (searchContainer && !searchContainer.contains(target)) {
      this.showSuggestions = false;
    }
  }

  private handleBlur(_event: FocusEvent) {
    // Don't hide suggestions immediately to allow clicking on them
    setTimeout(() => {
      const activeElement = this.shadowRoot?.activeElement as Node | null;
      const suggestionsContainer = this.shadowRoot?.querySelector(
        '.suggestions-container'
      );

      if (!suggestionsContainer?.contains(activeElement)) {
        this.showSuggestions = false;
      }
    }, 200);
  }

  render() {
    return html`
      <div class="search-container">
        <div class="search-section">
          <div class="search-input-group">
            <input
              type="search"
              placeholder="Search..."
              aria-label="Search input"
              autocomplete="off"
              aria-controls="search-suggestions"
              aria-expanded="${this.showSuggestions}"
              .value="${this.searchValue}"
              @input="${this.handleInputEvent}"
              @keydown="${this.handleKeydown}"
              @blur="${this.handleBlur}"
            />
            <button
              class="search-button"
              ?disabled="${this.isLoading}"
              @click="${this.handleSearch}"
            >
              ${this.isLoading ? html`<span class="spinner"></span>` : 'Search'}
            </button>

            ${this.showSuggestions
              ? html`
                  <div
                    class="suggestions-container"
                    role="listbox"
                    id="search-suggestions"
                  >
                    ${this.currentSuggestions.map(
                      (suggestion, _index) => html`
                        <button
                          class="suggestion-item"
                          role="option"
                          @click="${() => this.selectSuggestion(suggestion)}"
                        >
                          <span class="suggestion-text"
                            >${this.renderHighlightedText(suggestion)}</span
                          >
                          ${suggestion.verticalKeys.length > 0
                            ? html`
                                <span class="vertical-tag"
                                  >${this.getVerticalDisplayName(
                                    suggestion.verticalKeys[0]
                                  )}</span
                                >
                              `
                            : ''}
                        </button>
                      `
                    )}
                  </div>
                `
              : ''}
          </div>

          ${this.verticals.length > 0
            ? html`
                <div class="verticals-container" role="tablist">
                  <h2 class="vertical-nav__heading">Refine Your Search</h2>
                  <div class="vertical-tabs-container">
                    <button
                      class="vertical-tab ${this.currentVertical === 'all'
                        ? 'active'
                        : ''}"
                      role="tab"
                      aria-selected="${this.currentVertical === 'all'}"
                      @click="${() =>
                        yextStore.updateSettings({
                          vertical: 'all',
                          page: 1,
                        })}"
                    >
                      All
                      (${this.universalResponse
                        ? this.calculateTotalResults(this.universalResponse)
                        : 0})
                    </button>
                    ${this.verticals.map(
                      vertical => html`
                        <button
                          class="vertical-tab ${this.currentVertical ===
                          vertical
                            ? 'active'
                            : ''}"
                          role="tab"
                          aria-selected="${this.currentVertical === vertical}"
                          @click="${() =>
                            yextStore.updateSettings({ vertical, page: 1 })}"
                        >
                          ${this.getVerticalDisplayName(vertical)}
                          (${this.verticalCounts.get(vertical) || 0})
                        </button>
                      `
                    )}
                  </div>
                </div>
              `
            : ''}
        </div>

        ${!this.hasSearched
          ? ''
          : html`
              <div class="results-container">
                ${(() => {
                  if (this.error) {
                    return html`<div class="error-message" role="alert">
                      ${this.error}
                    </div>`;
                  }
                  if (this.isLoading) {
                    return html`
                      <div class="loading-container" role="status">
                        <div class="spinner" aria-label="Loading results"></div>
                      </div>
                    `;
                  }
                  if (
                    this.currentVertical === 'all' &&
                    this.universalResponse
                  ) {
                    return html`
                      ${this.universalResponse.modules.length === 0
                        ? NoResultsMessage()
                        : html`
                            ${this.universalResponse.modules.map(
                              module => html`
                                <div class="vertical-section">
                                  <div class="vertical-header">
                                    <h2 class="vertical-title">
                                      ${this.getVerticalDisplayName(
                                        module.verticalConfigId
                                      )}
                                    </h2>
                                    <a
                                      href="#"
                                      class="view-all-link"
                                      @click="${(e: Event) => {
                                        e.preventDefault();
                                        this.needsScrollAndFocus = true;
                                        yextStore.updateSettings({
                                          vertical: module.verticalConfigId,
                                          page: 1,
                                        });
                                      }}"
                                      aria-label="View all ${this.getVerticalDisplayName(
                                        module.verticalConfigId
                                      )} results"
                                    >
                                      View All
                                    </a>
                                  </div>
                                  <div class="total-count">
                                    <strong
                                      >1-${Math.min(
                                        3,
                                        module.resultsCount
                                      )}</strong
                                    >
                                    of ${module.resultsCount} results
                                  </div>
                                  <ul class="vertical-results">
                                    ${module.results
                                      .slice(0, 3)
                                      .map(
                                        result => html`
                                          <li class="result-item">
                                            ${this.renderTeaser(result)}
                                          </li>
                                        `
                                      )}
                                  </ul>
                                </div>
                              `
                            )}
                          `}
                    `;
                  }
                  return '';
                })()}
              </div>
            `}
      </div>
    `;
  }
}

// Register web component
customElements.define('outline-yext-universal', OutlineYextUniversal);
