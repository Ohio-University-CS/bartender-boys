// Environment configuration
const isProd = false; // Set to true for production builds

// Network IP configuration
const NETWORK_IP = '10.233.120.253'; // Update this when your IP changes

// Development configuration
const DEV_CONFIG = {
  // Use your machine's Wi‑Fi IPv4 so the phone can reach the backend over LAN
  // Update NETWORK_IP above if your IP changes
  API_BASE_URL: `http://${NETWORK_IP}:8000`,
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
export { NETWORK_IP };
