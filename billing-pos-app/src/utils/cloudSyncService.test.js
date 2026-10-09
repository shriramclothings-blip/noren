import { buildSyncQueueItem, getNextRetryDelay, sanitizeCloudSyncConfig } from './cloudSyncService';

describe('cloud sync service helpers', () => {
  it('builds a deterministic queue item with hash and ids', () => {
    const item = buildSyncQueueItem({
      entityType: 'products',
      entityId: 42,
      actionType: 'create',
      payload: { name: 'Test' },
      businessId: 'biz-1',
      deviceId: 'device-1',
    });

    expect(item.entityType).toBe('products');
    expect(item.entityId).toBe(42);
    expect(item.actionType).toBe('create');
    expect(item.syncStatus).toBe('Pending');
    expect(item.syncHash).toMatch(/^[a-f0-9]{64}$/);
    expect(item.queueUuid).toBeTruthy();
    expect(item.transactionUuid).toBeTruthy();
  });

  it('applies a progressive retry delay', () => {
    expect(getNextRetryDelay(1)).toBe(30);
    expect(getNextRetryDelay(2)).toBe(120);
    expect(getNextRetryDelay(3)).toBe(300);
    expect(getNextRetryDelay(4)).toBe(900);
    expect(getNextRetryDelay(5)).toBe(900);
  });

  it('sanitizes and validates the cloud sync config', () => {
    const cleaned = sanitizeCloudSyncConfig({
      enabled: true,
      apiEndpoint: 'https://example.com/api',
      businessId: 'biz-1',
      deviceId: 'device-1',
      syncSecretKey: 'secret',
      syncIntervalSeconds: '15',
      batchSize: '5',
      retryIntervalSeconds: '30',
      maxRetryAttempts: '4',
      autoSync: true,
    });

    expect(cleaned.enabled).toBe(true);
    expect(cleaned.apiEndpoint).toBe('https://example.com/api');
    expect(cleaned.syncIntervalSeconds).toBe(15);
    expect(cleaned.batchSize).toBe(5);
    expect(cleaned.retryIntervalSeconds).toBe(30);
    expect(cleaned.maxRetryAttempts).toBe(4);
  });
});
