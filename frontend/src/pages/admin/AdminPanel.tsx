import React, { useState } from 'react';
import { UserManagement } from './UserManagement';
import { DatabaseConnections } from './DatabaseConnections';
import { UserPermissions } from './UserPermissions';

type AdminTab = 'users' | 'connections' | 'permissions';

export const AdminPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    const tabs: { id: AdminTab; label: string }[] = [
        { id: 'users', label: 'User Management' },
        { id: 'connections', label: 'Database Connections' },
        { id: 'permissions', label: 'User Permissions' }
    ];

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

            <div className="mb-6">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'connections' && <DatabaseConnections />}
                {activeTab === 'permissions' && <UserPermissions />}
            </div>
        </div>
    );
}; 