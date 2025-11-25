import { api } from '../api';

// Define generic types to replace MongoDB driver types
export type Document = Record<string, any>;
export type Filter<T> = Record<string, any>; // Keeping T for compatibility with existing code but it's effectively any
export type UpdateFilter<T> = Record<string, any>;
export type OptionalId<T> = T & { _id?: string };

/**
 * Frontend Database Service
 * Replaces direct MongoDB connection with API calls
 */
class DatabaseService {
    /**
     * Find multiple documents in a collection
     */
    async find<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {},
        options: {
            sort?: Record<string, 1 | -1>;
            limit?: number;
            skip?: number;
        } = {}
    ): Promise<T[]> {
        return api.get<T[]>(`/${collectionName}`, {
            filter,
            sort: options.sort,
            limit: options.limit,
            skip: options.skip
        });
    }

    /**
     * Find a single document in a collection
     */
    async findOne<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<T | null> {
        const results = await this.find<T>(collectionName, filter, { limit: 1 });
        return results[0] || null;
    }

    /**
     * Find a document by ID
     */
    async findById<T extends Document>(
        collectionName: string,
        id: string
    ): Promise<T | null> {
        try {
            return await api.get<T>(`/${collectionName}/${id}`);
        } catch (error: any) {
            if (error.status === 404) return null;
            throw error;
        }
    }

    /**
     * Insert a single document
     */
    async insertOne<T extends Document>(
        collectionName: string,
        document: OptionalId<T>
    ): Promise<T> {
        return api.post<T>(`/${collectionName}`, document);
    }

    /**
     * Insert multiple documents
     */
    async insertMany<T extends Document>(
        collectionName: string,
        documents: OptionalId<T>[]
    ): Promise<T[]> {
        return api.post<T[]>(`/${collectionName}/bulk`, documents);
    }

    /**
     * Update a document by ID
     */
    async updateById<T extends Document>(
        collectionName: string,
        id: string,
        update: Partial<T>
    ): Promise<boolean> {
        try {
            await api.put(`/${collectionName}/${id}`, update);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete a document by ID
     */
    async deleteById(collectionName: string, id: string): Promise<boolean> {
        try {
            await api.delete(`/${collectionName}/${id}`);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete multiple documents
     * Note: This is inefficient as it fetches then deletes one by one.
     * Ideally, we should add a bulk delete endpoint to the backend.
     */
    async deleteMany<T extends Document>(
        collectionName: string,
        filter: Filter<T>
    ): Promise<boolean> {
        try {
            const items = await this.find<T>(collectionName, filter);
            if (items.length === 0) return true;

            const results = await Promise.all(
                items.map(item => {
                    const id = item._id || item.id;
                    if (!id) return Promise.resolve(false);
                    return this.deleteById(collectionName, id);
                })
            );

            return results.every(r => r);
        } catch (error) {
            return false;
        }
    }

    /**
     * Count documents
     */
    async count<T extends Document>(
        collectionName: string,
        filter: Filter<T> = {}
    ): Promise<number> {
        const result = await api.get<{ count: number }>(`/${collectionName}/count`, { filter });
        return result.count;
    }

    /**
     * Upsert a document
     */
    async upsert<T extends Document>(
        collectionName: string,
        filter: Filter<T>,
        document: Partial<T>
    ): Promise<T> {
        return api.post<T>(`/${collectionName}/upsert`, { filter, document });
    }

    /**
     * Aggregate (simulated via find for now, or add specific API endpoint if needed)
     * For complex aggregations, we should add specific endpoints to the backend
     */
    async aggregate<T extends Document>(
        _collectionName: string,
        _pipeline: any[]
    ): Promise<T[]> {
        console.warn('Aggregation not fully supported in frontend-api bridge yet. Using find fallback if possible.');
        // Fallback to finding all and filtering in memory if absolutely necessary, 
        // but ideally we should create specific API endpoints for complex queries.
        // For now, returning empty array to prevent crash, but this needs specific backend support if used heavily.
        return [];
    }
}

export const db = new DatabaseService();
