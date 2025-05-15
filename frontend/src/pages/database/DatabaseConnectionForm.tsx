import React, { useState } from 'react';
import { databaseService, DatabaseConnection } from '../../services/dbService';

const defaultConnection: DatabaseConnection = {
    name: '',
    databaseType: 'SqlServer',
    server: '',
    port: 1433,
    databaseName: '',
    username: '',
    password: '',
    useSSL: false,
};

export const DatabaseConnectionForm: React.FC = () => {
    const [connection, setConnection] = useState<DatabaseConnection>(defaultConnection);
    const [testing, setTesting] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [testResult, setTestResult] = useState<string | null>(null);
    const [schemas, setSchemas] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setConnection(prev => ({
            ...prev,
            [name]: type === 'checkbox' && 'checked' in e.target ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        setError(null);
        try {
            const success = await databaseService.testConnection(connection);
            setTestResult(success ? 'Connection successful!' : 'Connection failed.');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Error testing connection');
        } finally {
            setTesting(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        setSchemas([]);
        setError(null);
        try {
            const result = await databaseService.connect(connection);
            if (result.success) {
                setSchemas(result.schemas);
            } else {
                setError('Failed to connect or fetch schemas.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Error connecting to database');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <div style={{ maxWidth: 500, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
            <h2>Database Connection</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input name="name" placeholder="Connection Name" value={connection.name} onChange={handleChange} />
                <select name="databaseType" value={connection.databaseType} onChange={handleChange}>
                    <option value="SqlServer">SQL Server</option>
                    {/* Add more DB types as needed */}
                </select>
                <input name="server" placeholder="Server" value={connection.server} onChange={handleChange} />
                <input name="port" type="number" placeholder="Port" value={connection.port} onChange={handleChange} />
                <input name="databaseName" placeholder="Database Name" value={connection.databaseName} onChange={handleChange} />
                <input name="username" placeholder="Username" value={connection.username} onChange={handleChange} />
                <input name="password" type="password" placeholder="Password" value={connection.password} onChange={handleChange} />
                <label>
                    <input name="useSSL" type="checkbox" checked={!!connection.useSSL} onChange={handleChange} /> Use SSL
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleTest} disabled={testing}>{testing ? 'Testing...' : 'Test Connection'}</button>
                    <button onClick={handleConnect} disabled={connecting}>{connecting ? 'Connecting...' : 'Connect & Fetch Schemas'}</button>
                </div>
                {testResult && <div style={{ color: testResult.includes('successful') ? 'green' : 'red' }}>{testResult}</div>}
                {error && <div style={{ color: 'red' }}>{error}</div>}
                {schemas.length > 0 && (
                    <div>
                        <h4>Schemas:</h4>
                        <ul>
                            {schemas.map(s => <li key={s}>{s}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseConnectionForm; 