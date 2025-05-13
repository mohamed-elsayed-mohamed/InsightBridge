import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
            <h1 className="text-2xl font-semibold text-gray-900">Welcome, {user?.name}!</h1>
            <p className="mt-2 text-gray-600">
              This is your dashboard. Here you can manage your database connections and reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 