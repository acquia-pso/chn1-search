import { LitElement, html, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import {
  yextAPI,
  type YextResult,
} from '../../libraries/data-access-yext/yext-api';
import { yextStore } from '../../libraries/data-access-yext/yext-store';
import { displayTeaser } from './teaser';
import '../shared/outline-teaser/outline-teaser';
import '../outline-yext-pager/outline-yext-pager';
import { NoResultsMessage } from '../../libraries/ui-yext/no-results-message';
import componentStyles from './outline-yext-vertical.css?inline';
import { customElement } from 'lit/decorators.js';

interface MatchedSubstring {
  offset: number;
  length: number;
}

export class OutlineYextVertical extends LitElement {
  @state() private currentPage = 1;
  @state() private currentQuery = '';
  @state() private currentVertical = '';
  @state() private results: YextResult[] = [];
  @state() private totalResults = 0;
  @state() private isError = false;
  @state() private errorMessage = '';
  @state() private isLoading = false;

  private readonly itemsPerPage = 16;

  static styles = unsafeCSS(componentStyles);

  /**
   * Public method to update results
   */
  public async updateResults(
    query: string,
    vertical: string,
    page: number = 1,
    limit: number = 16
  ): Promise<void> {
    try {
      this.isLoading = true;
      const offset = (page - 1) * limit;
      const currentSettings = yextStore.getSettings();
      const needsUpdate =
        currentSettings.input !== query ||
        currentSettings.vertical !== vertical ||
        currentSettings.page !== page ||
        currentSettings.limit !== limit ||
        currentSettings.offset !== offset;

      if (needsUpdate) {
        yextStore.updateSettings({
          input: query,
          vertical: vertical,
          page: page,
          limit: limit,
          offset: offset,
        });
      }

      this.currentQuery = query;
      this.currentVertical = vertical;
      this.currentPage = page;

      const response = await yextAPI.verticalSearch(
        query,
        vertical,
        page,
        limit
      );

      // Check for timeout error
      if (response.response?.error?.errorType === 'TIMEOUT') {
        this.isError = true;
        this.results = [];
        this.totalResults = 0;
        return;
      }

      this.results = response.response.results;
      this.totalResults = response.response.resultsCount;
      this.isError = false;
      this.errorMessage = '';
    } catch (error) {
      console.error('Vertical search failed:', error);
      this.isError = true;
    } finally {
      this.isLoading = false;
    }
  }

  private handlePageChange(e: CustomEvent) {
    const page = e.detail.page;
    this.updateResults(
      this.currentQuery,
      this.currentVertical,
      page,
      this.itemsPerPage
    ).then(() => {
      // Scroll the component into view
      this.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Wait for DOM update before focusing
      setTimeout(() => {
        const firstResult = this.shadowRoot?.querySelector('.result-item');
        if (firstResult) {
          (firstResult as HTMLElement).focus();
        }
      }, 100);
    });
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

  private renderResultCard(result: YextResult) {
    return displayTeaser(result);
  }

  private getResultsSummary() {
    if (this.totalResults === 0) {
      return NoResultsMessage();
    }
    return html`<strong
        >${(this.currentPage - 1) * this.itemsPerPage + 1}-${Math.min(
          this.currentPage * this.itemsPerPage,
          this.totalResults
        )}</strong
      >
      of ${this.totalResults} results`;
  }

  render() {
    if (this.isError) {
      return html`<div class="results-container">${NoResultsMessage()}</div>`;
    }

    if (this.isLoading) {
      return html`
        <div class="loading-container" role="status">
          <div class="spinner" aria-label="Loading results"></div>
        </div>
      `;
    }

    // Only show results container if we have results or need to show "no results found"
    if (
      this.currentQuery &&
      (this.totalResults > 0 || this.currentQuery.length > 0)
    ) {
      return html`
        <div class="results-container">
          <div
            class="${this.totalResults === 0
              ? 'no-results-message'
              : 'results-header'}"
            role="status"
          >
            ${this.getResultsSummary()}
          </div>

          ${this.totalResults > 0
            ? html`
                <ul class="results-grid">
                  ${this.results.map(
                    result => html`
                      <li class="result-item">
                        ${this.renderResultCard(result)}
                      </li>
                    `
                  )}
                </ul>

                ${this.totalResults > this.itemsPerPage
                  ? html`
                      <outline-yext-pager
                        current-page="${this.currentPage}"
                        total-pages="${Math.ceil(
                          this.totalResults / this.itemsPerPage
                        )}"
                        @page-change="${this.handlePageChange}"
                      ></outline-yext-pager>
                    `
                  : ''}
              `
            : ''}
        </div>
      `;
    }

    // Return empty if no query or no results to display
    return html``;
  }
}

customElements.define('outline-yext-vertical', OutlineYextVertical);
