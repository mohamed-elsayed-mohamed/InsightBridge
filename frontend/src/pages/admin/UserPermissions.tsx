import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}

interface DatabaseConnection {
    id: number;
    name: string;
    connectionString: string;
    databaseType: string;
    createdAt: string;
    lastUsedAt?: string;
    isActive: boolean;
    description?: string;
    createdBy?: string;
}

interface UserPermission {
    id: number;
    userId: string;
    databaseConnectionId: number;
    allowedTables: string; // JSON string of allowed table names
    allowedColumns: string; // JSON string of allowed column names per table
    createdAt: string;
    createdBy: string;
    lastModifiedAt?: string;
    lastModifiedBy?: string;
}

interface DatabaseSchema {
    tables: { name: string; columns: { name: string }[] }[];
}

export const UserPermissions: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [selectedConnection, setSelectedConnection] = useState<string>('');
    const [tables, setTables] = useState<string[]>([]);
    const [columns, setColumns] = useState<{ [key: string]: string[] }>({});
    const [selectedTables, setSelectedTables] = useState<string[]>([]);
    const [selectedColumns, setSelectedColumns] = useState<{ [key: string]: string[] }>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingPermission, setExistingPermission] = useState<UserPermission | null>(null);
    const api = useApi();

    const loadUsers = useCallback(async () => {
        try {
            const response = await api.get<User[]>('/api/auth/users');
            setUsers(response.data);
        } catch (err) {
            console.error('Error loading users:', err);
            setError('Failed to load users');
        }
    }, [api]);

    const loadConnections = useCallback(async () => {
        try {
            const response = await api.get<DatabaseConnection[]>('/api/DatabaseConnection');
            setConnections(response.data);
        } catch (err) {
            console.error('Error loading connections:', err);
            setError('Failed to load database connections');
        }
    }, [api]);

    const loadExistingPermission = useCallback(async () => {
        if (!selectedUser || !selectedConnection) return;
        
        try {
            const response = await api.get<UserPermission[]>(`/api/UserPermission/user/${selectedUser}`);
            const permission = response.data.find(p => p.databaseConnectionId === parseInt(selectedConnection));
            setExistingPermission(permission || null);
            
            if (permission) {
                setSelectedTables(JSON.parse(permission.allowedTables));
                setSelectedColumns(JSON.parse(permission.allowedColumns));
            } else {
                setSelectedTables([]);
                setSelectedColumns({});
            }
        } catch (err) {
            console.error('Error loading existing permission:', err);
            setError('Failed to load existing permission');
        }
    }, [api, selectedUser, selectedConnection]);

    const loadTables = useCallback(async () => {
        if (!selectedConnection) return;
        try {
            const connection = connections.find(c => c.id === parseInt(selectedConnection));
            if (!connection) {
                setError('Selected connection not found');
                return;
            }
            const response = await api.post<DatabaseSchema>('/api/DatabaseConnection/schema', connection);
            setTables(response.data.tables.map(t => t.name));
        } catch (err) {
            console.error('Error loading tables:', err);
            setError('Failed to load tables');
        }
    }, [api, selectedConnection, connections]);

    const loadColumns = useCallback(async () => {
        if (selectedTables.length === 0) return;
        try {
            const connection = connections.find(c => c.id === parseInt(selectedConnection));
            if (!connection) {
                setError('Selected connection not found');
                return;
            }
            const response = await api.post<DatabaseSchema>('/api/DatabaseConnection/schema', connection);
            const columnsData: { [key: string]: string[] } = {};
            response.data.tables.forEach(table => {
                if (selectedTables.includes(table.name)) {
                    columnsData[table.name] = table.columns.map(c => c.name);
                }
            });
            setColumns(columnsData);
        } catch (err) {
            console.error('Error loading columns:', err);
            setError('Failed to load columns');
        }
    }, [api, selectedConnection, selectedTables, connections]);

    useEffect(() => {
        loadUsers();
        loadConnections();
    }, [loadUsers, loadConnections]);

    useEffect(() => {
        if (selectedConnection) {
            loadTables();
        }
    }, [selectedConnection, loadTables]);

    useEffect(() => {
        if (selectedTables.length > 0) {
            loadColumns();
        }
    }, [selectedTables, loadColumns]);

    useEffect(() => {
        if (selectedUser && selectedConnection) {
            loadExistingPermission();
        }
    }, [selectedUser, selectedConnection, loadExistingPermission]);

    const handleSavePermissions = async () => {
        try {
            setLoading(true);
            setError(null);

            const permission: UserPermission = {
                id: existingPermission?.id || 0,
                userId: selectedUser,
                databaseConnectionId: parseInt(selectedConnection),
                allowedTables: JSON.stringify(selectedTables),
                allowedColumns: JSON.stringify(selectedColumns),
                createdAt: existingPermission?.createdAt || new Date().toISOString(),
                createdBy: existingPermission?.createdBy || 'system',
                lastModifiedAt: new Date().toISOString(),
                lastModifiedBy: 'system'
            };

            if (existingPermission) {
                await api.put(`/api/UserPermission/${existingPermission.id}`, permission);
            } else {
                await api.post('/api/UserPermission', permission);
            }
            
            setError(null);
            // Reload the existing permission to reflect the changes
            await loadExistingPermission();
        } catch (err) {
            console.error('Error saving permissions:', err);
            setError('Failed to save permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (table: string, checked: boolean) => {
        if (checked) {
            setSelectedTables([...selectedTables, table]);
        } else {
            setSelectedTables(selectedTables.filter(t => t !== table));
            const newSelectedColumns = { ...selectedColumns };
            delete newSelectedColumns[table];
            setSelectedColumns(newSelectedColumns);
        }
    };

    const handleColumnChange = (table: string, column: string, checked: boolean) => {
        const tableColumns = selectedColumns[table] || [];
        if (checked) {
            setSelectedColumns({
                ...selectedColumns,
                [table]: [...tableColumns, column]
            });
        } else {
            setSelectedColumns({
                ...selectedColumns,
                [table]: tableColumns.filter(c => c !== column)
            });
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">User Permissions</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Select User
                    </label>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        <option value="">Select a user</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.email})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Select Database Connection
                    </label>
                    <select
                        value={selectedConnection}
                        onChange={(e) => setSelectedConnection(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        <option value="">Select a connection</option>
                        {connections.map(conn => (
                            <option key={conn.id} value={conn.id.toString()}>
                                {conn.name} ({conn.databaseType})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedConnection && (
                <div className="mt-6">
                    <h2 className="text-xl font-semibold mb-4">Tables and Columns</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-medium mb-2">Tables</h3>
                            <div className="space-y-2">
                                {tables.map(table => (
                                    <div key={table} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`table-${table}`}
                                            checked={selectedTables.includes(table)}
                                            onChange={(e) => handleTableChange(table, e.target.checked)}
                                            className="mr-2"
                                        />
                                        <label htmlFor={`table-${table}`}>{table}</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedTables.length > 0 && (
                            <div>
                                <h3 className="text-lg font-medium mb-2">Columns</h3>
                                {selectedTables.map(table => (
                                    <div key={table} className="mb-4">
                                        <h4 className="font-medium mb-2">{table}</h4>
                                        <div className="space-y-2">
                                            {columns[table]?.map(column => (
                                                <div key={column} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`column-${table}-${column}`}
                                                        checked={selectedColumns[table]?.includes(column) || false}
                                                        onChange={(e) => handleColumnChange(table, column, e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    <label htmlFor={`column-${table}-${column}`}>{column}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-6">
                <button
                    onClick={handleSavePermissions}
                    disabled={loading || !selectedUser || !selectedConnection || selectedTables.length === 0}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                >
                    {loading ? 'Saving...' : existingPermission ? 'Update Permissions' : 'Save Permissions'}
                </button>
            </div>
        </div>
    );
}; 