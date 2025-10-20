// Environment configuration
const isProd = false; // Set to true for production builds

// Development configuration
const DEV_CONFIG = {
  // Use your machine's Wi‑Fi IPv4 so the phone can reach the backend over LAN
  // Update if your IP changes (ipconfig -> Wireless LAN adapter Wi‑Fi -> IPv4 Address)/
  API_BASE_URL: 'http://10.233.236.17:8000',
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
