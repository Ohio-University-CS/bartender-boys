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

// Helper: reset logger state between tests (best-effort)
function enableLogging() {
  logger.setEnabled(true);
}

function disableLogging() {
  logger.setEnabled(false);
}

describe('logger.info()', () => {
  beforeEach(() => {
    enableLogging();
    vi.restoreAllMocks();
  });

  // Normal case: logs info message with proper format
  test('should log info messages to console.info when logging is enabled', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('hello', { a: 1 });
    expect(spy).toHaveBeenCalled();
    const [firstArg] = spy.mock.calls[0] ?? [];
    expect(String(firstArg)).toContain('[INFO]');
    expect(String(firstArg)).toContain('hello');
  });

  // Edge case: handles empty string message
  test('should handle empty string messages', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('');
    expect(spy).toHaveBeenCalled();
    const [firstArg] = spy.mock.calls[0] ?? [];
    expect(String(firstArg)).toContain('[INFO]');
  });

  // Error case: should not log when disabled
  test('should not log info messages when logging is disabled', () => {
    disableLogging();
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('muted');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('logger.debug()', () => {
  beforeEach(() => {
    enableLogging();
    vi.restoreAllMocks();
  });

  // Normal case: logs debug message with proper format
  test('should log debug messages to console.log when logging is enabled', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('dbg');
    expect(spy).toHaveBeenCalled();
    const [firstArg] = spy.mock.calls[0] ?? [];
    expect(String(firstArg)).toContain('[DEBUG]');
  });

  // Edge case: handles multiple arguments
  test('should handle multiple arguments in debug calls', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('test', { key: 'value' }, 123);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.length).toBeGreaterThan(1);
  });

  // Error case: should not log when disabled
  test('should not log debug messages when logging is disabled', () => {
    disableLogging();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('muted');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('logger.warn()', () => {
  beforeEach(() => {
    enableLogging();
    vi.restoreAllMocks();
  });

  // Normal case: logs warning message with proper format
  test('should log warning messages to console.warn when logging is enabled', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('careful');
    expect(spy).toHaveBeenCalled();
    const [firstArg] = spy.mock.calls[0] ?? [];
    expect(String(firstArg)).toContain('[WARN]');
  });

  // Edge case: handles special characters in message
  test('should handle special characters in warning messages', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('Warning: 100% complete!');
    expect(spy).toHaveBeenCalled();
    const [firstArg] = spy.mock.calls[0] ?? [];
    expect(String(firstArg)).toContain('[WARN]');
  });

  // Error case: should not log when disabled
  test('should not log warning messages when logging is disabled', () => {
    disableLogging();
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logger.warn('muted');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('logger.error()', () => {
  beforeEach(() => {
    enableLogging();
    vi.restoreAllMocks();
  });

  // Normal case: logs error message with proper format
  test('should log error messages to console.error when logging is enabled', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('boom');
    expect(spy).toHaveBeenCalled();
    const [firstArg] = spy.mock.calls[0] ?? [];
    expect(String(firstArg)).toContain('[ERROR]');
  });

  // Edge case: handles error objects
  test('should handle error objects in error calls', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('test error');
    logger.error('Error occurred', err);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0]?.length).toBeGreaterThan(1);
  });

  // Error case: should not log when disabled
  test('should not log error messages when logging is disabled', () => {
    disableLogging();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('muted');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('logger.setEnabled()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Normal case: enables logging when set to true
  test('should enable logging when set to true', () => {
    logger.setEnabled(true);
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test');
    expect(spy).toHaveBeenCalled();
  });

  // Edge case: toggling between enabled and disabled states
  test('should toggle logging state correctly', () => {
    logger.setEnabled(true);
    const spy1 = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test1');
    expect(spy1).toHaveBeenCalled();

    logger.setEnabled(false);
    const spy2 = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.info('test2');
    expect(spy2).not.toHaveBeenCalled();
  });

  // Error case: should handle rapid toggling without errors
  test('should handle rapid toggling without errors', () => {
    expect(() => {
      for (let i = 0; i < 10; i++) {
        logger.setEnabled(i % 2 === 0);
      }
    }).not.toThrow();
  });
});
