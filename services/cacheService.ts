/**
 * Cache Service - Manages data caching to reduce Firebase queries
 * 
 * Features:
 * - In-memory caching with TTL (Time To Live)
 * - Automatic cache invalidation
 * - Cache statistics for monitoring
 * - Request deduplication
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private pendingRequests: Map<string, Promise<any>> = new Map();

  // Default TTL: 5 minutes
  private DEFAULT_TTL = 5 * 60 * 1000;

  /**
   * Get cached data or execute fetch function
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check if data is in cache and not expired
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      this.stats.hits++;
      console.log(`[Cache HIT] ${key}`);
      return cached.data as T;
    }

    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(key)) {
      console.log(`[Cache PENDING] ${key} - waiting for in-flight request`);
      return this.pendingRequests.get(key)!;
    }

    // Fetch new data
    this.stats.misses++;
    console.log(`[Cache MISS] ${key} - fetching from source`);

    const promise = fetchFn()
      .then((data) => {
        this.set(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    this.stats.size = this.cache.size;
    console.log(`[Cache SET] ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.stats.size = this.cache.size;
    console.log(`[Cache INVALIDATE] ${key}`);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    let count = 0;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.size = this.cache.size;
    console.log(`[Cache INVALIDATE PATTERN] ${pattern} - invalidated ${count} entries`);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    console.log(`[Cache CLEAR] All cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2)
      : '0.00';
    
    console.log(`[Cache STATS] Hits: ${this.stats.hits}, Misses: ${this.stats.misses}, Hit Rate: ${hitRate}%, Size: ${this.stats.size}`);
    return this.stats;
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, size: 0 };
    console.log(`[Cache STATS RESET]`);
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache key constants
export const CACHE_KEYS = {
  SCHOOLS: 'schools',
  TEACHERS: 'teachers',
  MENTORS: 'mentors',
  MANAGEMENT: 'management',
  TRAININGS: 'trainings',
  AUDITS: 'audits',
  TASKS: 'tasks',
  DASHBOARD_STATS: 'dashboard_stats',
  TRAINING_COMPLETION: 'training_completion',
  TEACHERS_BY_SCHOOL: (schoolId: string) => `teachers_school_${schoolId}`,
  MENTORS_BY_SCHOOL: (schoolId: string) => `mentors_school_${schoolId}`,
  MANAGEMENT_BY_SCHOOL: (schoolId: string) => `management_school_${schoolId}`,
};

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,        // 1 minute
  MEDIUM: 5 * 60 * 1000,       // 5 minutes
  LONG: 15 * 60 * 1000,        // 15 minutes
  VERY_LONG: 60 * 60 * 1000,   // 1 hour
};

export default cacheService;

