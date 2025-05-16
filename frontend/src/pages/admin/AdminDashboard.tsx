import React from 'react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();

    const cards = [
        {
            title: 'Dashboard',
            description: 'View and manage data visualizations and reports',
            icon: '📊',
            path: '/dashboard'
        },
        {
            title: 'User Management',
            description: 'Create, edit, and manage user accounts',
            icon: '👥',
            path: '/admin/users'
        },
        {
            title: 'Database Connections',
            description: 'Manage database connections and test connectivity',
            icon: '🔌',
            path: '/admin/connections'
        },
        {
            title: 'User Permissions',
            description: 'Configure user access to database tables and columns',
            icon: '🔒',
            path: '/admin/permissions'
        }
    ];

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                    <div
                        key={card.path}
                        onClick={() => navigate(card.path)}
                        className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    >
                        <div className="text-4xl mb-4">{card.icon}</div>
                        <h2 className="text-xl font-semibold mb-2">{card.title}</h2>
                        <p className="text-gray-600">{card.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}; 