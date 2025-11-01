/**
 * Unit tests for Logger utility
 */

import { Logger, logger } from '@/utils/logger';

describe('Logger', () => {
  let consoleInfoSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
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
});
