import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  Address,
  HighlightedField,
  verticalSearchResult,
} from '../outline-yext-universal/outline-yext-types';
import '../shared/outline-button/outline-button';
import '../shared/outline-teaser/outline-teaser';

export function displayTeaser(vertical: string, result: verticalSearchResult) {
  const highlightField = (field: string) =>
    result.highlightedFields[field]
      ? highlightText(result.highlightedFields[field])
      : result.data[field];

  const cleanDataUnformatted = highlightField('s_snippet');
  const cleanData = (cleanDataUnformatted ?? '').replace(/\·\·\·/g, ' ');
  const startDate = highlightField('c_classes_events_start_date');
  const date = startDate ? formatDate(startDate) :  startDate
  const title = highlightField('name');

  const url = result.data.c_url
    ? `https://www.ecommunity.com${result.data.c_url}`
    : result.data.landingPageUrl;

  const teaserFunctions = {
    healthcare_professionals: () =>
      healthcareProfessionalTeaser(
        result.data.headshot?.url,
        title,
        url,
        highlightField('c_specialties') || []
      ),
    testimonial: () =>
      testimonialTeaser(result.data.c_testimonial_Photo, title, url, cleanData),
    person: () => defaultTeaser(title, url, highlightField('c_title')),
    page: () => defaultTeaser(highlightField('c_title'), url, cleanData),
    locationsearch: () =>
      locationTeaser(
        title,
        url,
        result.data.address,
        result.data.c_phoneSearch,
        '',
        result.data.c_locationHoursAndFax,
        result.data.c_googleMapLocations
      ),
    news: () =>
      newsTeaser(
        `News | ${title}`,
        url,
        cleanData,
        result.data.c_author || '',
        result.data.c_authorCreatedDate
      ),
    'classes-and-events': () =>
      defaultTeaser( startDate ? `${title} | ${date}` : title, url, cleanData),
  };

  return (
    teaserFunctions[vertical as keyof typeof teaserFunctions]?.() ||
    defaultTeaser(
      getTeaserTitle(vertical, title, result.data.c_url),
      url,
      cleanData
    )
  );
}

function getTeaserTitle(
  vertical: string,
  title: string,
  url: string | undefined
): string {
  const prefixes = {
    careers_area: 'Careers',
    procedure: getCategoryFromURL(url || ''),
    careers_page: 'Careers at Community',
  };

  const prefix = prefixes[vertical as keyof typeof prefixes] || '';
  return prefix ? `${prefix} | ${title}` : title;
}

export function defaultTeaser(title: string, url: string, snippet: string) {
  return html`<outline-teaser
    url="${url}"
    title="${title}"
    snippet="${snippet}"
  ></outline-teaser>`;
}

export function newsTeaser(
  title: string,
  url: string,
  snippet: string,
  author: string,
  date: string
) {
  return html`<outline-teaser
    url="${url}"
    title="${title}"
    snippet="${snippet}"
    author="${author}"
    date="${date}"
  ></outline-teaser>`;
}

export function healthcareProfessionalTeaser(
  image: string | undefined,
  title: string,
  url: string,
  specialties: string[]
) {
  return html`
    <outline-teaser image="${image}" title="${title}" url="${url}">
      ${specialties.length > 0
        ? html`
            <ul class="specialty-list">
              ${specialties.map(
                (el: string) => html`<li class="specialty">${el}</li>`
              )}
            </ul>
          `
        : null}
      <outline-button
        slot="cta"
        button-url="${url}"
        button-title="Request Appointment"
      ></outline-button>
    </outline-teaser>
  `;
}

export function testimonialTeaser(
  image: string | undefined,
  title: string,
  url: string,
  snippet: string
) {
  return html`
    <outline-teaser
      image="${image}"
      title="${title}"
      subtitle="Patient Testimonial"
      snippet="${snippet}"
      url="${url}"
    ></outline-teaser>
  `;
}

export function locationTeaser(
  title: string,
  url: string,
  address: Address | undefined,
  phone: string,
  fax: string,
  hours: string | undefined,
  directionsUrl: string | undefined
) {
  return html`
    <outline-teaser
      title="${title}"
      url="${url}"
      phone="${phone}"
      fax="${fax}"
      directions-url="${directionsUrl}"
      hours="${hours}"
    >
      ${address
        ? unsafeHTML(`
      <div slot="address">
        ${address.line1}<br />
        ${address.city}, ${address.region} ${address.postalCode}<br />
      </div>
      `)
        : null}
    </outline-teaser>
  `;
}

function getCategoryFromURL(url: string): string {
  const regex = /\/([^/]+)(?=\/[^/]+$)/;
  const match = url.match(regex);

  return match && match[1]
    ? match[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';
}

function highlightText(content: HighlightedField): string {
  if (!content.matchedSubstrings || content.matchedSubstrings.length === 0) {
    return content.value;
  }

  const sortedMatches = content.matchedSubstrings.sort(
    (a, b) => a.offset - b.offset
  );
  let highlightedText = '';
  let lastIndex = 0;

  for (const match of sortedMatches) {
    const startIndex = match.offset;
    const endIndex = startIndex + match.length;

    highlightedText += content.value.substring(lastIndex, startIndex);
    highlightedText += `<span class="highlight">${content.value.substring(startIndex, endIndex)}</span>`;
    lastIndex = endIndex;
  }

  highlightedText += content.value.substring(lastIndex);

  return highlightedText;
}

function formatDate(dateString: string): string {
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