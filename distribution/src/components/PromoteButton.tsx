import React, { useState } from 'react';

interface PromoteButtonProps {
    dealId: number;
}

const PromoteButton: React.FC<PromoteButtonProps> = ({ dealId }) => {
    const [loading, setLoading] = useState(false);

    const handlePromote = async (packageType: 'flame' | 'inferno') => {
        setLoading(true);
        // Replace with your Proxy URL
        const API_URL = 'http://localhost:5000/api/promote';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dealId, packageType })
            });

            const session = await response.json();
            if (session.url) {
                window.location.href = session.url;
            }
        } catch (error) {
            console.error("Promotion Error:", error);
            alert("System Busy. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-2 flex gap-2">
            <button
                onClick={() => handlePromote('flame')}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 text-black font-bold text-xs py-1 px-2 uppercase hover:brightness-110 disabled:opacity-50"
            >
                {loading ? 'INIT...' : '[ PROMOTE ] $49'}
            </button>
            <button
                onClick={() => handlePromote('inferno')}
                disabled={loading}
                className="flex-1 bg-red-900 border border-red-500 text-red-500 font-bold text-xs py-1 px-2 uppercase hover:bg-red-500 hover:text-black animate-pulse disabled:opacity-50"
            >
                {loading ? 'INIT...' : '[ INFERNO ] $149'}
            </button>
        </div>
    );
};

export default PromoteButton;
