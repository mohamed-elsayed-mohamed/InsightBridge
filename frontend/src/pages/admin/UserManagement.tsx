import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
}

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'User'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewUser(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateUser = async () => {
        try {
            setLoading(true);
            setError(null);

            // Create user first
            const registerData = {
                email: newUser.email,
                password: newUser.password,
                firstName: newUser.firstName,
                lastName: newUser.lastName
            };

            await api.post('/api/auth/register', registerData);
            
            // Then update their role if needed
            if (newUser.role !== 'User') {
                const users = await api.get<User[]>('/api/auth/users');
                const createdUser = users.data.find(u => u.email === newUser.email);
                if (createdUser) {
                    await api.put(`/api/auth/users/${createdUser.id}/roles`, [newUser.role]);
                }
            }

            await loadUsers();
            setNewUser({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                role: 'User'
            });
        } catch (err: any) {
            console.error('Error creating user:', err);
            setError(err?.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            setLoading(true);
            setError(null);
            await api.delete(`/api/auth/users/${userId}`);
            await loadUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            setError('Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        try {
            setLoading(true);
            setError(null);
            await api.put(`/api/auth/users/${userId}/roles`, [newRole]);
            await loadUsers();
        } catch (err) {
            console.error('Error updating user role:', err);
            setError('Failed to update user role');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
                <h2 className="text-xl font-semibold mb-4">Add New User</h2>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={newUser.email}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            First Name
                        </label>
                        <input
                            type="text"
                            name="firstName"
                            value={newUser.firstName}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Last Name
                        </label>
                        <input
                            type="text"
                            name="lastName"
                            value={newUser.lastName}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={newUser.password}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Role
                        </label>
                        <select
                            name="role"
                            value={newUser.role}
                            onChange={handleInputChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        onClick={handleCreateUser}
                        disabled={loading}
                    >
                        Create User
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-md rounded px-8 pt-6 pb-8">
                <h2 className="text-xl font-semibold mb-4">Existing Users</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                        <div key={user.id} className="border rounded p-4">
                            <h3 className="font-semibold mb-2">{user.firstName} {user.lastName}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                                Email: {user.email}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                Roles: {user.roles.join(', ')}
                            </p>
                            <div className="flex justify-between items-center">
                                <select
                                    value={user.roles[0]}
                                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                    className="shadow appearance-none border rounded py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                >
                                    <option value="User">User</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                <button
                                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    disabled={loading}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}; 