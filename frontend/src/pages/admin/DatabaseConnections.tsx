import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';

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

export const DatabaseConnections: React.FC = () => {
    const [connections, setConnections] = useState<DatabaseConnection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newConnection, setNewConnection] = useState<{
        name: string;
        server: string;
        database: string;
        username: string;
        password: string;
        databaseType: string;
    }>({
        name: '',
        server: '',
        database: '',
        username: '',
        password: '',
        databaseType: 'SqlServer'
    });
    const api = useApi();

    const generateConnectionString = useCallback((connection: typeof newConnection): string => {
        switch (connection.databaseType) {
            case 'SqlServer':
                return `Server=${connection.server};Database=${connection.database};User Id=${connection.username};Password=${connection.password};TrustServerCertificate=True;`;
            case 'PostgreSQL':
                return `Host=${connection.server};Database=${connection.database};Username=${connection.username};Password=${connection.password};`;
            case 'MySQL':
                return `Server=${connection.server};Database=${connection.database};User=${connection.username};Password=${connection.password};`;
            default:
                throw new Error('Unsupported database type');
        }
    }, []);

    const loadConnections = useCallback(async () => {
        try {
            const response = await api.get<DatabaseConnection[]>('/api/DatabaseConnection');
            setConnections(response.data);
        } catch (err) {
            console.error('Error loading connections:', err);
            setError('Failed to load database connections');
        }
    }, [api]);

    useEffect(() => {
        loadConnections();
    }, [loadConnections]);

    const handleAddConnection = async () => {
        try {
            setLoading(true);
            setError(null);

            const connectionString = generateConnectionString(newConnection);
            const connection: Partial<DatabaseConnection> = {
                name: newConnection.name,
                connectionString,
                databaseType: newConnection.databaseType,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            await api.post('/api/DatabaseConnection', connection);
            await loadConnections();
            setShowAddModal(false);
            setNewConnection({
                name: '',
                server: '',
                database: '',
                username: '',
                password: '',
                databaseType: 'SqlServer'
            });
        } catch (err) {
            console.error('Error adding connection:', err);
            setError('Failed to add database connection');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConnection = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this connection?')) {
            return;
        }

        try {
            setLoading(true);
            setError(null);

            await api.delete(`/api/DatabaseConnection/${id}`);
            await loadConnections();
        } catch (err) {
            console.error('Error deleting connection:', err);
            setError('Failed to delete database connection');
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async (connection: DatabaseConnection) => {
        try {
            setLoading(true);
            setError(null);

            await api.post('/api/DatabaseConnection/test', connection);
            alert('Connection successful!');
        } catch (err) {
            console.error('Error testing connection:', err);
            setError('Failed to connect to database');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Database Connections</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Add Connection
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="bg-white shadow-md rounded my-6">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {connections.map((connection) => (
                            <tr key={connection.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{connection.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{connection.databaseType}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${connection.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {connection.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(connection.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => handleTestConnection(connection)}
                                        className="text-blue-600 hover:text-blue-900 mr-4"
                                    >
                                        Test
                                    </button>
                                    <button
                                        onClick={() => handleDeleteConnection(connection.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add Database Connection</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                        type="text"
                                        value={newConnection.name}
                                        onChange={(e) => setNewConnection({ ...newConnection, name: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Database Type</label>
                                    <select
                                        value={newConnection.databaseType}
                                        onChange={(e) => setNewConnection({ ...newConnection, databaseType: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    >
                                        <option value="SqlServer">SQL Server</option>
                                        <option value="PostgreSQL">PostgreSQL</option>
                                        <option value="MySQL">MySQL</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Server</label>
                                    <input
                                        type="text"
                                        value={newConnection.server}
                                        onChange={(e) => setNewConnection({ ...newConnection, server: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Database</label>
                                    <input
                                        type="text"
                                        value={newConnection.database}
                                        onChange={(e) => setNewConnection({ ...newConnection, database: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Username</label>
                                    <input
                                        type="text"
                                        value={newConnection.username}
                                        onChange={(e) => setNewConnection({ ...newConnection, username: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Password</label>
                                    <input
                                        type="password"
                                        value={newConnection.password}
                                        onChange={(e) => setNewConnection({ ...newConnection, password: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddConnection}
                                    disabled={loading || !newConnection.name || !newConnection.server || !newConnection.database || !newConnection.username || !newConnection.password}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                                >
                                    {loading ? 'Adding...' : 'Add Connection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 