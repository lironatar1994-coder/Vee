import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import Logo from '../assets/Logo.png';
import './AppRedirectLoader.css';

export default function AppRedirectLoader({ to = '/inbox' }) {
  const navigate = useNavigate();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      navigate(to, { replace: true });
    }, 520);

    return () => window.clearTimeout(timeout);
  }, [navigate, to]);

  return (
    <main className="app-redirect-loader" dir="rtl" aria-live="polite" aria-busy="true">
      <div className="app-redirect-loader__mark">
        <img src={Logo} alt="Vee" />
        <span />
      </div>
      <p>פותחים את Vee...</p>
    </main>
  );
}

AppRedirectLoader.propTypes = {
  to: PropTypes.string,
};
