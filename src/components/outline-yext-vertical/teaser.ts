import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import type { YextResult } from '../../libraries/data-access-yext/yext-api';
import '../shared/outline-button/outline-button';
import '../shared/outline-teaser/outline-teaser';

interface Address {
  line1: string;
  city: string;
  region: string;
  postalCode: string;
}

interface HighlightedField {
  value: string;
  matchedSubstrings: Array<{
    offset: number;
    length: number;
  }>;
}

/**
 * Detects the current environment from window.location.hostname and replaces
 * the URL prefix with the appropriate subdomain:
 * - dev.ecommunity.com -> dev.ecommunity.com
 * - stage.ecommunity.com -> stage.ecommunity.com
 * - ecommunity.com -> ecommunity.com
 * 
 * URLs from Yext come as ecommunity.com in every environment, so we detect
 * the current page's environment and return the appropriate prefix.
 */
function replaceEnvironmentPrefix(url: string): string {
  try {
    // Detect environment from current page's hostname
    const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
    let targetPrefix = ''; // default to production
    
    if (currentHostname.includes('dev.ecommunity.com')) {
      targetPrefix = 'dev.';
    } else if (currentHostname.includes('stage.ecommunity.com')) {
      targetPrefix = 'stage.';
    } else if (currentHostname.includes('www.ecommunity.com')) {
      targetPrefix = '';
    }
   
    return url.replace(/\bfad\.\b/, targetPrefix);
  }
  catch (e) {
    return url;
  }
}

export function displayTeaser(result: YextResult, isGenerative?: boolean) {
  const highlightField = (field: string): string => {
    const fieldData = result.highlightedFields?.[field];
    return fieldData
      ? highlightText(fieldData)
      : (result.data[field] as string) || '';
  };

  const cleanDataUnformatted = highlightField('s_snippet');
  const cleanData = cleanDataUnformatted.replace(/···/g, ' ');
  const startDate = highlightField('c_classes_events_start_date');
  const date = startDate ? formatDate(startDate) : startDate;
  const title = highlightField('name');
  const url = result.data.c_url
    ? `https://www.ecommunity.com${result.data.c_url}`
    : result.data.websiteUrl?.url || '';

  const teaserFunctions = {
    healthcareProfessional: () =>
      healthcareProfessionalTeaser(
        result.data.address as Address,
        result.data.headshot?.url || '',
        title,
        url,
        (result.data.c_specialties as string[]) || [],
        isGenerative
      ),
    ce_testimonial: () =>
      testimonialTeaser(
        (result.data.c_testimonial_Photo as string) || '',
        title,
        url,
        cleanData,
        isGenerative
      ),
    ce_person: () =>
      personTeaser(
        (result.data.c_person_Photos as string) || '',
        title,
        url,
        highlightField('c_title'),
        cleanData,
        isGenerative
      ),
    ce_page: () =>
      defaultTeaser(
        highlightField('c_title') || title,
        url,
        cleanData,
        isGenerative
      ),
    ce_location: () =>
      locationTeaser(
        title,
        url,
        result.data.address as Address,
        (result.data.c_phoneSearch as string) || '',
        '',
        (result.data.c_locationHoursAndFax as string) || '',
        (result.data.c_googleMapLocations as string) || '',
        isGenerative
      ),
    ce_news: () =>
      newsTeaser(
        `News | ${title}`,
        url,
        cleanData,
        (result.data.c_author as string) || '',
        (result.data.c_authorCreatedDate as string) || '',
        isGenerative
      ),
    ce_classesAndEvents: () =>
      defaultTeaser(
        startDate ? `${title} | ${date}` : title,
        url,
        cleanData,
        isGenerative
      ),
  };

  const resultType = result.data.type as string;
  const teaserFunction =
    teaserFunctions[resultType as keyof typeof teaserFunctions];

  return (
    teaserFunction?.() ||
    defaultTeaser(
      getTeaserTitle(resultType, title, result.data.c_url),
      url,
      cleanData,
      isGenerative
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

export function defaultTeaser(
  title: string,
  url: string,
  snippet: string,
  isGenerative?: boolean
) {
  return html`<outline-teaser
    .isGenerative=${isGenerative}
    url="${url}"
    title="${title}"
    snippet="${snippet}"
  ></outline-teaser>`;
}

export function personTeaser(
  image: string,
  title: string,
  url: string,
  subtitle: string,
  snippet: string,
  isGenerative?: boolean
) {
  return html`<outline-teaser
    .isGenerative=${isGenerative}
    url="${url}"
    title="${title}"
    subtitle="${subtitle}"
    image="${image}"
    snippet="${snippet}"
  ></outline-teaser>`;
}

export function newsTeaser(
  title: string,
  url: string,
  snippet: string,
  author: string,
  date: string,
  isGenerative?: boolean
) {
  return html`<outline-teaser
    .isGenerative=${isGenerative}
    url="${url}"
    title="${title}"
    snippet="${snippet}"
    author="${author}"
    date="${date}"
  ></outline-teaser>`;
}

export function healthcareProfessionalTeaser(
  address: Address | undefined,
  image: string | undefined,
  title: string,
  url: string,
  specialties: string[],
  isGenerative?: boolean
) {
  return html`
    <outline-teaser
      .isGenerative=${isGenerative}
      teaser-type="healthcare_professional"
      image="${image}"
      title="${title}"
      url="${replaceEnvironmentPrefix(url)}"
    >
      ${specialties.length > 0
        ? html`
            <ul class="specialty-list">
              <li class="specialty">
                ${specialties.map(
                  (el: string, index: number) => html`
                    ${el}${index < specialties.length - 1 ? ',' : ''}
                  `
                )}
              </li>
            </ul>
          `
        : null}
      ${address
        ? unsafeHTML(`
        <div slot="address">
          ${address.line1}<br />
          ${address.city}, ${address.region} ${address.postalCode}<br />
        </div>
        `)
        : null}
      <outline-button
        .isGenerative=${isGenerative}
        slot="cta"
        button-url="${replaceEnvironmentPrefix(url)}"
        button-title="Request Appointment"
      ></outline-button>
    </outline-teaser>
  `;
}

export function testimonialTeaser(
  image: string | undefined,
  title: string,
  url: string,
  snippet: string,
  isGenerative?: boolean
) {
  return html`
    <outline-teaser
      .isGenerative=${isGenerative}
      image="${image}"
      title="${title}"
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
  directionsUrl: string | undefined,
  isGenerative?: boolean
) {
  return html`
    <outline-teaser
      .isGenerative=${isGenerative}
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
    (a: { offset: number }, b: { offset: number }) => a.offset - b.offset
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
