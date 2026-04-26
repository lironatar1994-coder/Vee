import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * A hook to make a modal history-aware using URL hashes.
 * When the modal opens, it adds a hash to the URL (e.g., #modal).
 * When the user hits the back button, the hash is removed and the modal closes.
 * 
 * @param {boolean} isOpen - Whether the modal is currently open.
 * @param {function} onClose - Callback to close the modal.
 * @param {string} hashId - The hash string to use (without #).
 */
const useHistoryModal = (isOpen, onClose, hashId) => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (isOpen) {
            // Only push if we are not already on this hash
            if (location.hash !== `#${hashId}`) {
                navigate(`${location.pathname}${location.search}#${hashId}`);
            }
        } else {
            // If the modal was closed but the hash is still there, we need to go back
            // This happens when closing via UI (X button, etc.)
            if (location.hash === `#${hashId}`) {
                navigate(-1);
            }
        }
    }, [isOpen, hashId]); // Remove location.hash dependency to avoid loops

    useEffect(() => {
        const handleHashChange = () => {
            // If the modal is open but the hash is gone, the user hit 'Back'
            if (isOpen && window.location.hash !== `#${hashId}`) {
                onClose();
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [isOpen, onClose, hashId]);
};

export default useHistoryModal;
