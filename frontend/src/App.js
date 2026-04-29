import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { registerUser, loginUser, getVehicles, createBooking, getMyBookings, deleteBooking } from './apiService';
import AuthModal from './AuthModal';

// --- Reusable UI Components ---

function Toast({ message, type }) {
    return <div className={`toast ${type}`}>{message}</div>;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }) {
    if (!isOpen) return null;
    return (
        <div className="modal-backdrop">
            <div className="confirm-modal-content">
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="confirm-modal-actions">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
}

// --- Custom Hooks ---

function useToast() {
    const [toast, setToast] = useState({ message: '', type: '', visible: false });
    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
    };
    return { toast, showToast };
}

// --- Main App Component ---

function App() {
    const [page, setPage] = useState('home');
    const [user, setUser] = useState(null);
    const [modalMode, setModalMode] = useState(null);
    const { toast, showToast } = useToast();

    useEffect(() => {
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                const decodedUser = jwtDecode(token);
                setUser({ name: decodedUser.sub.split('@')[0], email: decodedUser.sub });
            }
        } catch (error) {
            localStorage.removeItem('authToken');
        }
    }, []);

    const handleAuthSubmit = async (userData) => {
        const apiCall = modalMode === 'register' ? registerUser : loginUser;
        const response = await apiCall(userData);
        const token = response.data.token;
        localStorage.setItem('authToken', token);
        const decodedUser = jwtDecode(token);
        const userName = userData.name || decodedUser.sub.split('@')[0];
        setUser({ name: userName, email: decodedUser.sub });
        setModalMode(null);
        showToast(`Welcome, ${userName}!`, 'success');
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setUser(null);
        setPage('home');
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return user ? <DashboardPage showToast={showToast} /> : <HomePage user={user} showToast={showToast} />;
            case 'leaderboard': // NEW PAGE ADDED
                return <LeaderboardPage />;
            case 'stations':
                return <ChargingStationsPage />;
            case 'map':
                return <CampusMapPage />;
            case 'contact':
                return <ContactUsPage />;
            case 'home':
            default:
                return <HomePage user={user} showToast={showToast} />;
        }
    };

    return (
        <>
            {toast.visible && <Toast message={toast.message} type={toast.type} />}
            {modalMode && <AuthModal mode={modalMode} onSubmit={handleAuthSubmit} onClose={() => setModalMode(null)} showToast={showToast} />}
            <Header user={user} setPage={setPage} onLogin={() => setModalMode('login')} onRegister={() => setModalMode('register')} onLogout={handleLogout} />
            <main>
                {renderPage()}
            </main>
            <Footer setPage={setPage} />
        </>
    );
}

// --- Page & Layout Components ---

function Header({ user, setPage, onLogin, onRegister, onLogout }) {
    return (
        <nav className="nav">
            <div className="brand" onClick={() => setPage('home')} style={{ cursor: 'pointer' }}>
                <div className="logo">EV</div>
                <h1>EV Campus Connect</h1>
            </div>
            <div className="actions">
                <button className="btn" onClick={() => setPage('leaderboard')}>Leaderboard</button> {/* NEW BUTTON */}
                <button className="btn" onClick={() => setPage('stations')}>Stations</button>
                <button className="btn" onClick={() => setPage('map')}>Map</button>
                {user ? (
                    <>
                        <button className="btn" onClick={() => setPage('dashboard')}>My Dashboard</button>
                        <span className="welcome-user">Welcome, {user.name}</span>
                        <button className="btn" onClick={onLogout}>Logout</button>
                    </>
                ) : (
                    <>
                        <button className="btn" onClick={() => setPage('contact')}>Contact</button>
                        <button className="btn" onClick={onLogin}>Login</button>
                        <button className="btn primary" onClick={onRegister}>Sign Up</button>
                    </>
                )}
            </div>
        </nav>
    );
}

function HomePage({ user, showToast }) {
    const [vehicles, setVehicles] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const response = await getVehicles();
                setVehicles(response.data);
            } catch (error) {
                showToast('Could not load vehicle data.', 'error');
            }
        };
        fetchVehicles();
    }, [showToast]);

    const handleBooking = async (vehicleId) => {
        if (!user) {
            showToast('Please log in to book a vehicle.', 'error');
            return;
        }
        try {
            await createBooking(vehicleId);
            showToast('Vehicle booked successfully! Check your dashboard.', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'An unexpected error occurred.';
            showToast(errorMessage, 'error');
        }
    };
    
    const filteredVehicles = vehicles.filter(v => filter === 'all' || v.type === filter);

    return (
        <section className="hero">
            <div className="bg" style={{backgroundImage: "url('https://images.unsplash.com/photo-1617886322207-6f504e7472c5?w=1920')"}}></div>
            <div className="content">
                <h2>Zero Emissions, Maximum Convenience</h2>
                <p>An integrated platform for shared electric vehicles and charging infrastructure on campus.</p>
                <div className="how-it-works">
                    <h3>How It Works</h3>
                    <div className="steps">
                        <div className="step"><span>1</span> Register & Login</div>
                        <div className="step"><span>2</span> Find Your Ride</div>
                        <div className="step"><span>3</span> Book Instantly</div>
                    </div>
                </div>
                <div className="vehicle-showcase">
                    <div className="filter-tabs">
                        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>All</button>
                        <button onClick={() => setFilter('scooter')} className={filter === 'scooter' ? 'active' : ''}>Scooters</button>
                        <button onClick={() => setFilter('bike')} className={filter === 'bike' ? 'active' : ''}>Bikes</button>
                    </div>
                    <div className="vehicle-list">
                        {filteredVehicles.length > 0 ? filteredVehicles.map(v => (
                            <div key={v.id} className="vehicle-card">
                                <img src={v.imageUrl} alt={v.name} />
                                <div className="vehicle-info">
                                    <h4>{v.name}</h4>
                                    <span>{v.range} range</span>
                                    <p>{v.offer}</p>
                                    {user && <button className="btn primary book-btn" onClick={() => handleBooking(v.id)}>Book Now</button>}
                                </div>
                            </div>
                        )) : <p>Loading vehicles...</p>}
                    </div>
                </div>
            </div>
        </section>
    );
}

// --- UPDATED DASHBOARD PAGE ---
function DashboardPage({ showToast }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState(null);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await getMyBookings();
                setBookings(response.data);
            } catch (error) {
                showToast('Could not load your bookings.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [showToast]);

    const handleCancelClick = (bookingId) => {
        setBookingToDelete(bookingId);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteBooking(bookingToDelete);
            setBookings(bookings.filter(b => b.id !== bookingToDelete));
            showToast('Booking cancelled successfully.', 'success');
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Failed to cancel booking.';
            showToast(errorMessage, 'error');
        } finally {
            setConfirmOpen(false);
            setBookingToDelete(null);
        }
    };

    // NEW FEATURE: Calculate CO2 Savings
    const calculateCo2Savings = () => {
        const avgTripKm = 5; // Assume an average trip is 5km
        const gramsCo2PerKm = 122; // Average for a petrol car
        const totalSavingsGrams = bookings.length * avgTripKm * gramsCo2PerKm;
        return (totalSavingsGrams / 1000).toFixed(2); // Convert to kg and format
    };

    return (
        <>
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={confirmDelete} title="Cancel Booking" message="Are you sure you want to permanently cancel this vehicle booking?" />
            <div className="page-container">
                <h2 className="page-header">My Dashboard</h2>
                
                {/* NEW FEATURE: Sustainability Card */}
                {!loading && bookings.length > 0 && (
                    <div className="sustainability-card">
                        <h3>Your Eco Impact 🌿</h3>
                        <div className="stat">{calculateCo2Savings()} kg</div>
                        <div className="stat-label">of CO₂ saved by choosing EV</div>
                    </div>
                )}

                <h3 className="page-header" style={{fontSize: '28px', border: 'none', paddingBottom: '10px', marginTop: '20px'}}>My Bookings</h3>
                {loading && <p>Loading your bookings...</p>}
                {!loading && bookings.length === 0 && (
                    <div className="card-message">You have not made any bookings yet. Go to the homepage to book a vehicle!</div>
                )}
                <div className="booking-list">
                    {bookings.map(b => (
                        <div className="booking-card" key={b.id}>
                            <img src={b.vehicleImageUrl} alt={b.vehicleName} />
                            <div className="booking-info">
                                <h4>{b.vehicleName}</h4>
                                <p>Booked on: {new Date(b.bookingTime).toLocaleString()}</p>
                            </div>
                            <button className="btn-cancel" onClick={() => handleCancelClick(b.id)}>Cancel</button>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

// --- NEW LEADERBOARD PAGE COMPONENT ---
function LeaderboardPage() {
    // This data is mocked for the frontend-only feature
    const leaderboardData = [
        { rank: 1, name: 'Lakshya Kanjwani', savings: '15.8 kg CO₂' },
        { rank: 2, name: 'Ishita Gurbaxani', savings: '12.2 kg CO₂' },
        { rank: 3, name: 'Bhavisha Kewalramani', savings: '11.6 kg CO₂' },
        { rank: 4, name: 'Dev Chand', savings: '9.8 kg CO₂' },
        { rank: 5, name: 'Irisha Deshpande', savings: '9.0 kg CO₂' },
        { rank: 6, name: 'Ayush Kushwaha', savings: '8.5 kg CO₂' },
        { rank: 7, name: 'Shreya Khandelwal', savings: '7.9 kg CO₂' },
    ];

    return (
        <div className="page-container">
            <h2 className="page-header">Top Eco-Riders 🏆</h2>
            <ul className="leaderboard-list">
                {leaderboardData.map(player => (
                    <li key={player.rank} className="leaderboard-item">
                        <span className="leaderboard-rank">#{player.rank}</span>
                        <span className="leaderboard-name">{player.name}</span>
                        <span className="leaderboard-savings">{player.savings}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ChargingStationsPage() {
    const [filter, setFilter] = useState('All');
    const stations = [
        { name: "Chai Bugs", details: "4 Level 2 Chargers", status: "Available" },
        { name: "Student lounge", details: "2 DC Fast Chargers", status: "In Use" },
        { name: "Science Building Lot D", details: "6 Level 2 Chargers", status: "Available" },
        { name: "Basketball Court", details: "8 Level 2 Chargers", status: "Maintenance" },
        { name: "Foyer", details: "4 Level 2 Chargers", status: "Available" },
    ];
    
    const filteredStations = stations.filter(s => filter === 'All' || s.status === filter);

    return (
        <div className="page-container">
            <h2 className="page-header">Campus Charging Stations</h2>
            <div className="filter-tabs">
                <button onClick={() => setFilter('All')} className={filter === 'All' ? 'active' : ''}>All</button>
                <button onClick={() => setFilter('Available')} className={filter === 'Available' ? 'active' : ''}>Available</button>
                <button onClick={() => setFilter('In Use')} className={filter === 'In Use' ? 'active' : ''}>In Use</button>
            </div>
            <div className="booking-list">
                {filteredStations.map(station => (
                    <div className="booking-card" key={station.name}>
                        <div className="booking-info">
                            <h4>{station.name}</h4>
                            <p>{station.details}</p>
                        </div>
                        <div className="status-tag">
                            <span className={`status-indicator status-${station.status.toLowerCase().replace(' ', '-')}`}></span>
                            {station.status}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CampusMapPage() {
    return (
        <div className="page-container">
            <h2 className="page-header">Campus Reference Map</h2>
            <div className="map-visual">
                <div className="road road-h" style={{ top: '150px' }}></div>
                <div className="road road-v" style={{ left: '250px' }}></div>
                <div className="road road-v" style={{ left: '650px' }}></div>
                <div className="building" style={{ top: '15px', left: '30px', width: '150px', height: '120px' }}>Library</div>
                <div className="building" style={{ top: '10px', left: '350px', width: '200px', height: '120px' }}>Java Lab</div>
                <div className="building" style={{ top: '320px', left: '350px', width: '240px', height: '120px' }}>Chai Bugs</div>
                <div className="building" style={{ top: '180px', left: '350px', width: '240px', height: '120px' }}>Foyer</div>
                <div className="building" style={{ top: '10px', left: '700px', width: '300px', height: '120px' }}>Kataria</div>
                <div className="building" style={{ top: '200px', right: '50px', width: '230px', height: '230px' }}>Science Dept.</div>
                <div className="building" style={{ top: '200px', right: '850px', width: '180px', height: '230px' }}>Student Lounge</div>
                <div className="pin" style={{ top: '115px', left: '215px' }}><div className="pin-inner">⚡</div></div>
                <div className="pin" style={{ top: '325px', left: '285px' }}><div className="pin-inner">⚡</div></div>
                <div className="pin" style={{ top: '80px', right: '350px' }}><div className="pin-inner">⚡</div></div>
                <div className="pin" style={{ top: '370px', right: '320px' }}><div className="pin-inner">⚡</div></div>
                <div className="pin" style={{ top: '350px', right: '805px' }}><div className="pin-inner">⚡</div></div>
            </div>
        </div>
    );
}

function ContactUsPage() {
    const team = [
        { name: "Ishita Gurbaxani", role: "Backend & Systems Architecture" },
        { name: "Lakshya Kanjwani", role: "Database & API Optimization" },
        { name: "Bhavisha Kewalramani", role: "UI/UX Design & Frontend Logic" },
    ];

    return (
        <div className="page-container">
            <h2 className="page-header">Meet the Team</h2>
            <p style={{color: 'var(--muted)', marginTop: '-20px', marginBottom: '30px'}}>
                We are a team of passionate student developers from TSEC, Mumbai, dedicated to creating innovative solutions for campus life.
            </p>
            <div className="contact-grid">
                {team.map(member => (
                    <div className="contact-card" key={member.name}>
                        <h4>{member.name}</h4>
                        <p>{member.role}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Footer({ setPage }) {
    return (
        <footer className="ev-footer">
            <div className="actions">
                <a onClick={() => setPage('home')}>Home</a> &nbsp;•&nbsp;
                <a onClick={() => setPage('stations')}>Charging Stations</a> &nbsp;•&nbsp;
                <a onClick={() => setPage('contact')}>Contact Us</a>
            </div>
            <p>© 2025 EV Campus Connect. A project for the students of TSEC, Mumbai.</p>
        </footer>
    );
}

export default App;