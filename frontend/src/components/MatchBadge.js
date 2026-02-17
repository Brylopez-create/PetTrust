import React from 'react';

const MatchBadge = ({ score }) => {
    const getStatus = (s) => {
        if (s >= 90) return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Perfect Match' };
        if (s >= 75) return { color: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Great Match' };
        return { color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'Good Match' };
    };

    const status = getStatus(score);

    return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border ${status.color} shadow-sm transition-all hover:scale-105 duration-300`}>
            <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70 leading-none">
                    {status.label}
                </span>
                <span className="text-lg font-black leading-none">
                    {Math.round(score)}%
                </span>
            </div>
        </div>
    );
};

export default MatchBadge;
