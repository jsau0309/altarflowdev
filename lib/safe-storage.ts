import { logger } from '@/lib/logger';
/**
 * Safe storage utility that handles errors gracefully
 * Provides fallback behavior when localStorage/sessionStorage is unavailable
 */

type StorageType = 'localStorage' | 'sessionStorage'

interface SafeStorageResult {
  success: boolean
  error?: Error
}

class SafeStorage {
  /**
   * Check if a storage type is available and working
   */
  isAvailable(type: StorageType = 'localStorage'): boolean {
    try {
      const storage = window[type]
      const testKey = '__storage_test__'
      storage.setItem(testKey, 'test')
      storage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Safely set an item in storage
   */
  setItem(
    key: string, 
    value: string, 
    type: StorageType = 'localStorage'
  ): SafeStorageResult {
    try {
      const storage = window[type]
      storage.setItem(key, value)
      return { success: true }
    } catch (error) {
      // Handle specific error types
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'QuotaExceededError':
            logger.warn(`[SafeStorage] ${type} quota exceeded for key: ${key}`)
            break
          case 'SecurityError':
            logger.warn(`[SafeStorage] ${type} access denied (private mode?) for key: ${key}`)
            break
          default:
            logger.warn(`${type} error for key ${key}`, { operation: 'browser.storage_error', type, key, errorName: error.name, errorMessage: error.message })
        }
      } else {
        logger.warn(`Unknown error setting storage key ${key}`, { operation: 'browser.storage_unknown_error', type, key, error: error instanceof Error ? error.message : String(error) })
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown storage error')
      }
    }
  }

  /**
   * Safely get an item from storage
   */
  getItem(
    key: string, 
    type: StorageType = 'localStorage'
  ): string | null {
    try {
      const storage = window[type]
      return storage.getItem(key)
    } catch (error) {
      logger.warn(`Error reading storage key ${key} from ${type}`, { operation: 'browser.storage_read_error', type, key, error: error instanceof Error ? error.message : String(error) })
      return null
    }
  }

  /**
   * Safely remove an item from storage
   */
  removeItem(
    key: string, 
    type: StorageType = 'localStorage'
  ): SafeStorageResult {
    try {
      const storage = window[type]
      storage.removeItem(key)
      return { success: true }
    } catch (error) {
      logger.warn(`Error removing storage key ${key} from ${type}`, { operation: 'browser.storage_remove_error', type, key, error: error instanceof Error ? error.message : String(error) })
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown storage error')
      }
    }
  }

  /**
   * Safely clear all items from storage
   */
  clear(type: StorageType = 'localStorage'): SafeStorageResult {
    try {
      const storage = window[type]
      storage.clear()
      return { success: true }
    } catch (error) {
      logger.warn(`Error clearing ${type}`, { operation: 'browser.storage_clear_error', type, error: error instanceof Error ? error.message : String(error) })
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('Unknown storage error')
      }
    }
  }

  /**
   * Set JSON data safely
   */
  setJSON<T>(
    key: string, 
    value: T, 
    type: StorageType = 'localStorage'
  ): SafeStorageResult {
    try {
      const jsonString = JSON.stringify(value)
      return this.setItem(key, jsonString, type)
    } catch (error) {
      logger.warn(`Error stringifying JSON for storage key ${key}`, { operation: 'browser.storage_json_stringify_error', type, key, error: error instanceof Error ? error.message : String(error) })
      return { 
        success: false, 
        error: error instanceof Error ? error : new Error('JSON stringify error')
      }
    }
  }

  /**
   * Get JSON data safely
   */
  getJSON<T>(
    key: string, 
    defaultValue: T | null = null,
    type: StorageType = 'localStorage'
  ): T | null {
    try {
      const item = this.getItem(key, type)
      if (!item) return defaultValue

      return JSON.parse(item) as T
    } catch (error) {
      logger.warn(`Error parsing JSON for storage key ${key}`, { operation: 'browser.storage_json_parse_error', type, key, error: error instanceof Error ? error.message : String(error) })
      return defaultValue
    }
  }
}

// Export singleton instance
export const safeStorage = new SafeStorage()

// Export types
export type { SafeStorageResult, StorageType }