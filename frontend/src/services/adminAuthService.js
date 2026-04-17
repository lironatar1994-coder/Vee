
/**
 * Utility for performing authenticated admin API requests.
 * Uses the admin token stored in localStorage.
 */
export const adminAuthFetch = async (url, options = {}) => {
    const token = localStorage.getItem('adminToken');
    
    const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // Optional: handle admin redirect to login
        // window.location.href = '/admin/login';
    }

    return response;
};
