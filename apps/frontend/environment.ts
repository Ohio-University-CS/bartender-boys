// Environment configuration
const isProd = false; // Set to true for production builds

// Development configuration
const DEV_CONFIG = {
  API_BASE_URL: 'http://10.233.89.234:8000', // Your local IP for mobile development
};

// Production configuration
const PROD_CONFIG = {
  API_BASE_URL: 'https://your-production-api.com', // Replace with your production API URL
};

// Export the appropriate configuration based on environment
export const ENV = isProd ? PROD_CONFIG : DEV_CONFIG;

// Export individual values for convenience
export const API_BASE_URL = ENV.API_BASE_URL;
export const IS_PROD = isProd;
