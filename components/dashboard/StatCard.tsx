
import React from 'react';
import Card from '../ui/Card';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    return (
        <Card className="flex items-center">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div className="mx-5">
                <h4 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">{value}</h4>
                <div className="text-gray-500 dark:text-gray-400">{title}</div>
            </div>
        </Card>
    );
};

export default StatCard;
