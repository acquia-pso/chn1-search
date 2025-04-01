import { LitElement, html, unsafeCSS } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
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
  type YextVerticalResults,
} from '../../libraries/data-access-yext/yext-api';
import { displayTeaser } from '../outline-yext-vertical/teaser';
import '../outline-yext-vertical/outline-yext-vertical';
import '../shared/outline-teaser/outline-teaser';
import { NoResultsMessage } from '../../libraries/ui-yext/no-results-message';
import componentStyles from './outline-yext-universal.css?inline';
import { marked } from 'marked';
import aiSparkle from '../../assets/ai-sparkle.svg';
import DOMPurify from 'dompurify';

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

interface YextUniversalSearchResponse {
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
        matchedSubstrings: MatchedSubstring[];
      };
      type: string;
    };
    error?: {
      errorType: string;
      details?: {
        responseCode: number;
        description: string;
      };
    };
  };
}

interface FormattedCitation {
  title: string;
  url?: string;
  description?: string;
  entityType?: string;
}

interface YextResponseWithError {
  error?: {
    errorType: string;
    details?: {
      responseCode: number;
      description: string;
    };
  };
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
  @state() private aiAnswer: string | null = null;
  @state() private isLoadingAI = false;
  @state() private aiError: string | null = null;
  @state() private citations: FormattedCitation[] = [];
  private needsScrollAndFocus = false;
  @state() private showSourcesPanel = false;
  @state() private showAIAnswer = true;
  @state() private forceRunAI = false;

  private suggestionTimeout: number | null = null;
  private verticalComponent: OutlineYextVerticalElement | null = null;
  private readonly debouncedHandleInput: (value: string) => void;

  private searchInputRef: HTMLInputElement | null = null;
  @state() private currentSearchId: string | null = null;

  @state() private verticalClicked = false;

  private touchStartX: number | null = null;

  static styles = unsafeCSS(componentStyles);

  constructor() {
    super();
    this.debouncedHandleInput = debounce(this.handleInput.bind(this), 200);
  }

  connectedCallback(): void {
    super.connectedCallback();
    yextStore.subscribe(this);
    document.addEventListener('keydown', this.handleEscapeKey);
    window.addEventListener('popstate', this.handlePopState);
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
    document.removeEventListener('keydown', this.handleEscapeKey);
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    window.removeEventListener('popstate', this.handlePopState);

  }

  async onStateChange(settings: SearchSettings): Promise<void> {
    this.searchValue = settings.input || '';
    const newVertical = settings.vertical || 'all';

    if (settings.input) {
      await this.performSearch(settings);
      this.currentVertical = newVertical;

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
      this.currentVertical = newVertical;

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
      if (this.suggestionTimeout) {
        clearTimeout(this.suggestionTimeout);
        this.suggestionTimeout = null;
      }
      this.showSuggestions = false;
      this.currentSuggestions = [];
      const input = e.target as HTMLInputElement;
      this.searchValue = input.value;
      this.forceRunAI = true;

      yextStore.updateSettings({
        input: this.searchValue,
        vertical: 'all',
        page: 1
      });
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
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
      this.suggestionTimeout = null;
    }
    this.showSuggestions = false;
    this.currentSuggestions = [];
    this.isSearching = true;
    this.hasSearched = true;
    this.forceRunAI = true;

    yextStore.updateSettings({
      input: this.searchValue,
      vertical: this.currentVertical,
      page: 1
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
    this.error = null;
     // Skip AI if:
    // 1. Not a forced search (button/enter) AND
    // 2. Either skipAI is set, vertical was clicked, OR page number changed
    const skipAI = !this.forceRunAI && (
      settings.skipAI || 
      this.verticalClicked || 
      (settings.page && settings.page > 1)
    );

    this.verticalClicked = false;
    this.hasSearched = true;
    this.forceRunAI = false;

    if (!skipAI) {
      this.isLoading = true;
      this.aiAnswer = null;
      this.aiError = null;
      this.isLoadingAI = true;
    }


    try {
      const response = await yextAPI.universalSearch(settings.input);

      // Check for timeout error using type assertion
      if ('error' in response.response) {
        const responseWithError = response.response as YextResponseWithError;
        if (responseWithError.error?.errorType === 'TIMEOUT') {
          console.warn('Search timeout detected');
          this.universalResponse = null;
          this.verticals = [];
          this.verticalCounts = new Map();
          this.isLoading = false;
          return NoResultsMessage();
        }
      }

      // Update universal results immediately
      this.universalResponse = response.response;

      this.verticals = response.response.modules.map(module => module.verticalConfigId);

      this.verticalCounts = new Map(
        response.response.modules.map(module => [
          module.verticalConfigId,
          module.resultsCount,
        ])
      );

      this.isLoading = false;
      // Handle vertical-specific results if needed

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
          settings.input,
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
      if (!skipAI) {
        const searchId = response.meta.uuid;
        this.currentSearchId = searchId;

        // Generate AI answer asynchronously
        yextAPI.generateAnswerWithCitations(
          settings.input,
          response.meta.uuid,
          response.response
        ).then(aiResponse => {
          // Only update state if this is still the current search
          if (this.currentSearchId === searchId) {
            if (aiResponse?.answer) {
              this.aiAnswer = aiResponse.answer.response.directAnswer;
              this.citations = aiResponse.citations || [];
            } else {
              this.aiError = `We're sorry, we could not generate any results. Please modify your search and try again.`;
            }
            this.isLoadingAI = false;
          }
        }).catch(error => {
          if (this.currentSearchId === searchId) {
            console.error('AI answer generation failed:', error);
            this.aiError = `We're sorry, we could not generate any results. Please modify your search and try again.`;
            this.isLoadingAI = false;
          }
        });
      }
    } catch (error) {
      console.error('Search failed:', error);
      this.error = `We're sorry, we could not generate any results. Please modify your search and try again.`      
      this.universalResponse = null;
      this.isLoading = false;
      this.isLoadingAI = false;
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
  private renderAIAnswer() {
    if (this.isLoadingAI) {
      return html`
        <div class="ai-loading">
          <div class="ai-loading-lines">
            <div class="line"></div>
            <div class="line"></div>
            <div class="line"></div>
          </div>
        </div>
      `;
    }

    // Only show error if we've actually performed a search
    if (this.aiError && !this.aiAnswer && this.hasSearched) {
      return html`<div class="ai-error-message">${this.aiError}</div>`;
    }

    if (this.aiAnswer && typeof this.aiAnswer === 'string') {
      marked.setOptions({
        gfm: true,
        breaks: true
      });

      try {
        // Convert markdown to HTML
        const htmlContent = marked.parse(this.aiAnswer, {
          async: false
        }) as string;

        // Sanitize the HTML output with default DOMPurify settings
        const sanitizedHtml = DOMPurify.sanitize(htmlContent);

        return html`
          <div class="ai-container">
            ${this.showAIAnswer ? html`
              <div class="ai-content">
                <div class="ai-answer-text">${unsafeHTML(sanitizedHtml)}</div>
                <button 
                  class="sources-trigger" 
                  @click=${() => this.toggleSourcesPanel(true)}
                >
                  View Sources
                </button>
                <div class="sources-disclaimer">
                  *Summary may be inaccurate; please click the source links below the summary to confirm the details.
                </div>
              </div>
            ` : ''}
            
            <button 
              class="toggle-summary" 
              @click=${() => this.showAIAnswer = !this.showAIAnswer}
            >
              ${this.showAIAnswer ? 'Hide' : 'Show'} AI Summary
            </button>
          </div>
        `;
      } catch (error) {
        console.error('Failed to parse markdown:', error);
        return html`<div class="ai-error-message">Failed to format the response.</div>`;
      }
    }

    return '';
  }

  private renderCitation(citation: FormattedCitation) {
    return html`
      <li class="citation-item">
        ${citation.url 
          ? html`
            <a 
              href="${citation.url}" 
              target="_blank" 
              rel="noopener noreferrer"
              @click=${(e: Event) => {
                e.preventDefault();
                window.open(citation.url, '_blank', 'noopener,noreferrer');
              }}
            >
              <div class="citation-wrapper">
                ${citation.entityType 
                  ? html`<span class="citation-entity-type">${citation.entityType}</span>`
                  : ''
                }
                <span class="citation-content">
                  <span class="citation-title">${citation.title}</span>
                  ${citation.description 
                    ? html`<span class="citation-description">${citation.description}</span>`
                    : ''
                  }
                </span>
              </div>
            </a>
          `
          : html`
            <div class="citation-wrapper">
              ${citation.entityType 
                ? html`<span class="citation-entity-type">${citation.entityType}</span>`
                : ''
              }
              <span class="citation-content">
                <span class="citation-title">${citation.title}</span>
                ${citation.description 
                  ? html`<span class="citation-description">${citation.description}</span>`
                  : ''
                }
              </span>
            </div>
          `
        }
      </li>
    `;
  }

  private toggleSourcesPanel(show: boolean) {
    const previouslyFocusedElement = document.activeElement as HTMLElement;
    this.showSourcesPanel = show;

    if (show) {
      const mainContent = this.shadowRoot?.querySelector('.search-container') as HTMLElement;
      mainContent?.setAttribute('inert', '');
      this.setAttribute('sources-panel-open', '');
      // Focus on the close button when panel opens
      setTimeout(() => {
        const closeButton = this.shadowRoot?.querySelector('.close-panel') as HTMLElement;
        closeButton?.focus();
      }, 100);
      window.history.pushState({ sourcesOpen: true }, '');
    } else {
      const mainContent = this.shadowRoot?.querySelector('.search-container') as HTMLElement;
      mainContent?.removeAttribute('inert');
      this.removeAttribute('sources-panel-open');
      // Restore focus to the element that had it before the panel was opened
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
      }
    }
  }

  private handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.showSourcesPanel) {
      this.toggleSourcesPanel(false);
    }
  }

  private handleOverlayClick = (e: MouseEvent) => {
    if(window.innerWidth >= 768){
      this.toggleSourcesPanel(false);
    }
  }

  private handleTouchStart = (e: TouchEvent) => {
    if(window.innerWidth < 768){
      this.touchStartX = e.changedTouches[0].clientX;
    }
  }

  private handleTouchEnd = (e: TouchEvent) => {
    if (!this.touchStartX) return;
    const touchEndX = e.changedTouches[0].clientX;
    if (touchEndX > this.touchStartX) { // Right swipe
       this.toggleSourcesPanel(false);
    }
    this.touchStartX = 0;
  }

  private handlePopState = () => {
    if (this.showSourcesPanel) {
      this.toggleSourcesPanel(false);
    }
  }

  render() {
    return html`
    ${this.showSourcesPanel ? html`
      <div 
        class="overlay"
        @click=${this.handleOverlayClick}
        @touchstart=${this.handleTouchStart}
        @touchend=${this.handleTouchEnd}
      ></div>
    ` : ''}
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
          ${this.hasSearched && this.searchValue
            ? html`
                <div class="ai-answer-container" role="complementary">
                  <div class="ai-answer-header-and-svg">
                    <img
                      src=${aiSparkle}
                      alt="AI Sparkle SVG"
                      width="22.58"
                      height="24"
                    />
                    <h2 class="ai-answer-title">Summary*</h2>
                  </div>
                  <div class="ai-content">
                    ${this.renderAIAnswer()}
                  </div>
                </div>
              `
            : ''}
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
                      @click="${() =>{
                        this.verticalClicked = true;
                        yextStore.updateSettings({
                          vertical: 'all',
                          page: 1,
                        });
                      }}"
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
                          @click="${() =>{
                            this.verticalClicked = true;
                            yextStore.updateSettings({ vertical, page: 1 });
                        }}"
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

       <div 
        class="sources-panel ${this.showSourcesPanel ? 'show' : ''}"
        role="dialog"
        aria-labelledby="sources-panel-title"
        aria-modal="true"
      >
        <div class="sources-panel-header">
          <h3 id="sources-panel-title">Sources</h3>
          <button 
            class="close-panel" 
            @click=${() => this.toggleSourcesPanel(false)}
            aria-label="Close sources panel"
          >×</button>
        </div>
        <ul class="citations-list">
          ${this.citations.length ? this.citations.map(this.renderCitation) : ''}
        </ul>
      </div>
    `;
  }
}

// Register web component
customElements.define('outline-yext-universal', OutlineYextUniversal);
