'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const AdminNavbar = () => {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        router.push('/login');
    };

    const navStyle: React.CSSProperties = {
        backgroundColor: '#0A2540', // Dark blue theme color
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
    };

    const linkStyle: React.CSSProperties = {
        color: 'white',
        textDecoration: 'none',
        marginRight: '1.5rem',
        fontSize: '1rem',
        fontWeight: 500,
    };

    const logoStyle: React.CSSProperties = {
        fontSize: '1.5rem',
        fontWeight: 'bold',
    };

    const buttonStyle: React.CSSProperties = {
        backgroundColor: '#E53E3E', // Red for logout
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 500,
    };

    return (
        <nav style={navStyle}>
            <div>
                <Link href="/admin/dashboard" style={{...linkStyle, ...logoStyle}}>
                    Admin Panel
                </Link>
            </div>
            <div>
                <Link href="/admin/dashboard" style={linkStyle}>
                    Dashboard
                </Link>
                <Link href="/admin/create-user" style={linkStyle}>
                    Create User
                </Link>
                {/* Add more admin links here as needed */}
            </div>
            <div>
                <button onClick={handleLogout} style={buttonStyle}>
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default AdminNavbar; 