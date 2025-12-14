/**
 * DashboardPage - Main Dashboard Entry Point
 *  
 * Provides overview of user's learning progress and quick access to features
 */

import React from 'react';

export const DashboardPage: React.FC = () => {
    return (
        <div className="h-full w-full p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to Synapse - Your Learning Platform
                </p>
            </div>
        </div>
    );
};

export default DashboardPage;
