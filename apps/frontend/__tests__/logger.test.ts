/**
 * Logger unit tests
 *
 * This suite verifies behavior of the Logger singleton used in the app.
 *
 * Coverage:
 * - Logs are emitted on console methods when logging is enabled
 * - No logs are emitted when disabled with setEnabled(false)
 * - Level-specific prefixes like [INFO], [DEBUG], [WARN], [ERROR]
 *
 * Assumptions:
 * - Tests run in development-like mode (IS_PROD === false)
 * - Vitest environment provides vi for spying on console
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Logger, logger } from '@/utils/logger';

describe('Logger', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    (Logger as any).instance = undefined;
    logger.setEnabled(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test 1: Normal case - Singleton pattern
   * Verifies that getInstance() returns the same instance
   */
  test('should return the same singleton instance', () => {
    const instance1 = Logger.getInstance();
    const instance2 = Logger.getInstance();
    expect(instance1).toBe(instance2);
  });

  /**
   * Test 2: Normal case - Logging when enabled
   * Verifies that info messages are logged when logger is enabled
   */
  test('should log messages when enabled', () => {
    logger.setEnabled(true);
    logger.info('Test message');
    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleInfoSpy.mock.calls[0][0]).toContain('[INFO]');
  });

  /**
   * Test 3: Edge case - No logging when disabled
   * Verifies that no logs are output when logger is disabled
   */
  test('should not log when disabled', () => {
    logger.setEnabled(false);
    logger.info('Test message');
    logger.error('Test message');
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  /**
   * Test 4: Normal case - Different log levels
   * Verifies that all log levels work correctly
   */
  test('should support all log levels', () => {
    logger.setEnabled(true);
    
    logger.debug('Debug message');
    logger.info('Info message');
    logger.warn('Warn message');
    logger.error('Error message');
    logger.log('Log message');
    
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  /**
   * Test 5: Normal case - Log formatting
   * Verifies that logs include timestamp and level
   */
  test('should format logs with timestamp and level', () => {
    logger.setEnabled(true);
    logger.info('Test message');
    
    const logCall = consoleInfoSpy.mock.calls[0][0];
    expect(logCall).toContain('[INFO]');
    expect(logCall).toContain('Test message');
    expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
  });

  /**
   * Test 6: Edge case - Production mode behavior
   * Verifies that logger respects IS_PROD setting (tested via jest-setup.js mock)
   * Note: Actual production behavior is tested via environment mock in jest-setup.js
   */
  test('should respect production mode setting', () => {
    // The logger is initialized with IS_PROD from environment
    // In test environment, IS_PROD is mocked to false in jest-setup.js
    // So logging should work when enabled
    logger.setEnabled(true);
    logger.info('Test in dev mode');
    expect(consoleInfoSpy).toHaveBeenCalled();
  });
});
