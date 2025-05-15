import axios from 'axios';

export interface DatabaseConnection {
    id?: number;
    name: string;
    databaseType: string;
    server: string;
    port: number;
    databaseName: string;
    username: string;
    password: string;
    isActive?: boolean;
    createdAt?: string;
    lastUsedAt?: string;
    connectionTimeout?: number;
    commandTimeout?: number;
    useSSL?: boolean;
    additionalParameters?: string;
}

export interface TableSchema {
    columnName: string;
    dataType: string;
    characterMaximumLength: number | null;
    isNullable: string;
    columnDefault: string | null;
}

class DatabaseService {
    private readonly baseUrl = '/api/db';

    async testConnection(connection: DatabaseConnection): Promise<boolean> {
        try {
            const response = await axios.post<{ success: boolean }>(`${this.baseUrl}/test-connection`, connection);
            return response.data.success;
        } catch (error) {
            console.error('Error testing connection:', error);
            throw error;
        }
    }

    async connect(connection: DatabaseConnection): Promise<{ success: boolean; schemas: string[] }> {
        try {
            const response = await axios.post<{ success: boolean; schemas: string[] }>(`${this.baseUrl}/connect`, connection);
            return response.data;
        } catch (error) {
            console.error('Error connecting to database:', error);
            throw error;
        }
    }

    async saveConnection(connection: DatabaseConnection): Promise<boolean> {
        try {
            const response = await axios.post<{ success: boolean }>(`${this.baseUrl}/save-connection`, connection);
            return response.data.success;
        } catch (error) {
            console.error('Error saving connection:', error);
            throw error;
        }
    }

    async getSchemas(connectionId: number): Promise<string[]> {
        try {
            const response = await axios.get<{ schemas: string[] }>(`${this.baseUrl}/schemas`, {
                params: { connectionId }
            });
            return response.data.schemas;
        } catch (error) {
            console.error('Error getting schemas:', error);
            throw error;
        }
    }

    async getConnections(): Promise<DatabaseConnection[]> {
        try {
            const response = await axios.get<{ connections: DatabaseConnection[] }>(`${this.baseUrl}/connections`);
            return response.data.connections;
        } catch (error) {
            console.error('Error getting connections:', error);
            throw error;
        }
    }

    async getTableSchema(
        connectionId: number,
        schemaName: string,
        tableName: string
    ): Promise<TableSchema[]> {
        try {
            const response = await axios.get<{ schema: TableSchema[] }>(`${this.baseUrl}/table-schema`, {
                params: { connectionId, schemaName, tableName }
            });
            return response.data.schema;
        } catch (error) {
            console.error('Error getting table schema:', error);
            throw error;
        }
    }
}

export const databaseService = new DatabaseService(); 