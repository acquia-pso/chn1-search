/**
 * Yext API configuration
 */
export interface YextConfig {
  apiKey: string;
  businessId: string;
  apiVersion: string;
  environment: 'production' | 'sandbox';
}

/**
 * Get configuration from environment variables or defaults
 */
export function getYextConfig(): YextConfig {
  return {
    apiKey: '0f3c031ce836961cf921558aca570af3',
    businessId: 'me',
    apiVersion: '20230406',
    environment: 'production',
  };
}

// Export singleton instance
export const yextConfig = getYextConfig();

// Additional configuration values used by existing components
export const apiKey = '0f3c031ce836961cf921558aca570af3';
export const apiVersion = '20230406';
export const accountId = 'me';
export const experienceKey = 'universal-search';
export const locale = 'en';
export const urlHref = 'https://cdn.yextapis.com/v2/accounts';
export const version = 'PRODUCTION';
