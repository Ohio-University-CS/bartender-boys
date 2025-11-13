/**
 * Unit tests for Notifications context
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications } from '@/contexts/notifications';

const TestComponent = ({ 
  onNotifications 
}: { 
  onNotifications: (notifications: ReturnType<typeof useNotifications>) => void;
}) => {
  const notifications = useNotifications();
  React.useEffect(() => {
    onNotifications(notifications);
  }, [notifications]);
  return null;
};

describe('Notifications Context', () => {
  let notificationsState: ReturnType<typeof useNotifications> | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    notificationsState = null;
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Test 1: Normal case - Showing a notification
   * Verifies that showNotification() adds a notification to the list
   */
  test('should show a notification', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showNotification('Test message', 'info');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    expect(notificationsState?.notifications[0].message).toBe('Test message');
    expect(notificationsState?.notifications[0].type).toBe('info');
  });

  /**
   * Test 2: Normal case - Showing success notification
   * Verifies that showSuccess() creates a success notification
   */
  test('should show success notification', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showSuccess('Operation successful');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    expect(notificationsState?.notifications[0].type).toBe('success');
    expect(notificationsState?.notifications[0].message).toBe('Operation successful');
  });

  /**
   * Test 3: Normal case - Showing error notification
   * Verifies that showError() creates an error notification
   */
  test('should show error notification', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showError('Something went wrong');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    expect(notificationsState?.notifications[0].type).toBe('error');
    expect(notificationsState?.notifications[0].message).toBe('Something went wrong');
  });

  /**
   * Test 4: Normal case - Showing info notification
   * Verifies that showInfo() creates an info notification
   */
  test('should show info notification', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showInfo('Here is some information');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    expect(notificationsState?.notifications[0].type).toBe('info');
    expect(notificationsState?.notifications[0].message).toBe('Here is some information');
  });

  /**
   * Test 5: Normal case - Showing warning notification
   * Verifies that showWarning() creates a warning notification
   */
  test('should show warning notification', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showWarning('Warning message');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    expect(notificationsState?.notifications[0].type).toBe('warning');
    expect(notificationsState?.notifications[0].message).toBe('Warning message');
  });

  /**
   * Test 6: Normal case - Dismissing a notification
   * Verifies that dismissNotification() removes a notification
   */
  test('should dismiss a notification', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showNotification('Test 1', 'info');
      notificationsState?.showNotification('Test 2', 'success');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(2);
    
    const firstId = notificationsState?.notifications[0].id;
    await act(async () => {
      notificationsState?.dismissNotification(firstId!);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    expect(notificationsState?.notifications[0].message).toBe('Test 2');
  });

  /**
   * Test 7: Normal case - Clearing all notifications
   * Verifies that clearAll() removes all notifications
   */
  test('should clear all notifications', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showNotification('Test 1', 'info');
      notificationsState?.showNotification('Test 2', 'success');
      notificationsState?.showNotification('Test 3', 'error');
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(3);
    
    await act(async () => {
      notificationsState?.clearAll();
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(0);
  });

  /**
   * Test 8: Edge case - Custom duration
   * Verifies that notifications can have custom durations
   */
  test('should accept custom duration', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showNotification('Test', 'info', 5000);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications[0].duration).toBe(5000);
  });

  /**
   * Test 9: Edge case - Zero duration (no auto-dismiss)
   * Verifies that duration of 0 prevents auto-dismiss
   */
  test('should not auto-dismiss when duration is 0', async () => {
    render(
      <NotificationsProvider>
        <TestComponent onNotifications={(n) => { notificationsState = n; }} />
      </NotificationsProvider>
    );
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      notificationsState?.showNotification('Persistent', 'info', 0);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
    
    // Wait longer than normal duration - notification should still be there
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 4000));
    });
    
    expect(notificationsState?.notifications.length).toBe(1);
  });
});

