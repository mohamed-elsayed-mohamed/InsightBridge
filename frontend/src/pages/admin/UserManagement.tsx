import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await authService.getAllUsers();
            setUsers(data);
        } catch (err) {
            setError('Failed to load users');
        }
    };

    const handleRoleChange = async (userId: string, roles: string[]) => {
        try {
            await authService.updateUserRoles(userId, roles);
            setSuccess('User roles updated successfully');
            loadUsers();
        } catch (err) {
            setError('Failed to update user roles');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
                    <div className="max-w-md mx-auto">
                        <div className="divide-y divide-gray-200">
                            <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                                <h2 className="text-2xl font-bold mb-8">User Management</h2>
                                
                                {error && (
                                    <div className="rounded-md bg-red-50 p-4 mb-4">
                                        <div className="text-sm text-red-700">{error}</div>
                                    </div>
                                )}
                                
                                {success && (
                                    <div className="rounded-md bg-green-50 p-4 mb-4">
                                        <div className="text-sm text-green-700">{success}</div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {users.map((user) => (
                                        <div key={user.id} className="border rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <div>
                                                    <h3 className="text-lg font-medium">
                                                        {user.firstName} {user.lastName}
                                                    </h3>
                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <label className="block text-sm font-medium text-gray-700">
                                                    Roles
                                                </label>
                                                <div className="mt-1 space-y-2">
                                                    {['Admin', 'Analyst', 'Viewer'].map((role) => (
                                                        <label key={role} className="inline-flex items-center mr-4">
                                                            <input
                                                                type="checkbox"
                                                                className="form-checkbox h-4 w-4 text-indigo-600"
                                                                checked={user.roles.includes(role)}
                                                                onChange={(e) => {
                                                                    const newRoles = e.target.checked
                                                                        ? [...user.roles, role]
                                                                        : user.roles.filter((r) => r !== role);
                                                                    handleRoleChange(user.id, newRoles);
                                                                }}
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">{role}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement; 