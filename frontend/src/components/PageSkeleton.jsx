import React from 'react';

const PageSkeleton = () => {
    return (
        <div style={{ 
            width: '100%', 
            maxWidth: '800px', 
            margin: '0 auto', 
            padding: '20px 2.5rem 100px',
            marginTop: '56px', // Matches persistent header height
            opacity: 0.6
        }}>
            {/* Header / Title Area Skeleton */}
            <div style={{ padding: '20px 0 20px' }}>
                <div className="skeleton-box skeleton-title" style={{ width: '180px', height: '32px', marginBottom: '12px' }}></div>
                <div className="skeleton-box skeleton-text" style={{ width: '120px', height: '16px' }}></div>
            </div>

            {/* Content Area Skeleton */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="skeleton-row" style={{ padding: '12px 0' }}>
                        <div className="skeleton-box skeleton-circle" style={{ width: '22px', height: '22px' }}></div>
                        <div className="skeleton-box skeleton-text" style={{ height: '18px', width: `${Math.random() * 40 + 40}%` }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PageSkeleton;
