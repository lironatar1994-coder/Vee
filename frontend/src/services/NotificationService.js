const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const subscribeToPushNotifications = async (userId) => {
    if (!('serviceWorker' in navigator) || (!('PushManager' in window))) {
        return { success: false, error: 'Push messaging is not supported' };
    }

    try {
        // 1. Request permission FIRST (must be sync-ish with user gesture)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return { success: false, error: 'לא ניתן אישור להתראות' };
        }

        // 2. Register/Get Service Worker
        const registration = await navigator.serviceWorker.register('/service-worker.js');

        // 3. Get Public Key
        const response = await fetch('/api/notifications/public-key');
        if (!response.ok) {
            throw new Error('Failed to fetch public key');
        }

        const { publicKey } = await response.json();
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);

        // 4. Subscribe
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
        });

        await fetch('/api/notifications/subscribe', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, subscription }),
            headers: {
                'content-type': 'application/json'
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to subscribe to push notifications:', error);
        return { success: false, error: error.message };
    }
};

export const unsubscribeFromPushNotifications = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            await fetch('/api/notifications/unsubscribe', {
                method: 'POST',
                body: JSON.stringify({ endpoint: subscription.endpoint }),
                headers: {
                    'content-type': 'application/json'
                }
            });
            return { success: true };
        }
    } catch (error) {
        console.error('Failed to unsubscribe from push notifications:', error);
        return { success: false, error: error.message };
    }
};
