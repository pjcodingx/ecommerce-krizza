import { useState, useEffect } from 'react';
import axios from 'axios';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

const CALENDAR_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateInput = (dateValue) =>
  `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;

const buildCalendarCells = (bookedDates, year, month) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const bookedSet = new Set(bookedDates);
  const cells = [];

  for (let i = 0; i < firstDay; i += 1) cells.push(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      day,
      dateKey,
      isBooked: bookedSet.has(dateKey)
    });
  }

  return cells;
};

function App() {
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState('home'); // Simple routing without react-router
  const [orders, setOrders] = useState([]);
  
  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Cart states
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [receiptFile, setReceiptFile] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    fullName: '',
    messenger: ''
  });

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [announcements, setAnnouncements] = useState([]);
  const [rentalCameras, setRentalCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [rentalBookings, setRentalBookings] = useState([]);
  const [rentalMode, setRentalMode] = useState('single');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rentalTime, setRentalTime] = useState('');
  const [rentalStatusMessage, setRentalStatusMessage] = useState('');
  const [rentalError, setRentalError] = useState('');
  const [rentalCheckoutData, setRentalCheckoutData] = useState({ name: '', contact: '', paymentMethod: 'GCASH', reservationReceipt: null, acceptedTerms: false });
  const [rentalCheckoutResult, setRentalCheckoutResult] = useState(null);
  const [showRentalConfirmModal, setShowRentalConfirmModal] = useState(false);
  const [sampleIndexByCamera, setSampleIndexByCamera] = useState({});
  const [zoomedPhoto, setZoomedPhoto] = useState(null);

  const handleAddToCart = (product) => {
    setCart((prevCart) => {
      const currentQty = prevCart[product.id] || 0;
      if (currentQty < product.stock) {
        return { ...prevCart, [product.id]: currentQty + 1 };
      }
      return prevCart;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, qty) => total + qty, 0);
  };

  const cartItems = products.filter(p => cart[p.id] > 0);
  const filteredProducts = selectedCategory === 'All' ? products : products.filter(p => p.category === selectedCategory);
  const cartTotalAmount = cartItems.reduce((sum, item) => sum + (item.price * cart[item.id]), 0);
  const selectedCamera = rentalCameras.find((camera) => String(camera.id) === String(selectedCameraId)) || null;
  const currentMonthLabel = new Date().toLocaleString('en-PH', { month: 'long', year: 'numeric' });
  const bookedDates = rentalBookings
    .filter((booking) => selectedCamera && String(booking.cameraId) === String(selectedCamera.id))
    .filter((booking) => booking.status === 'BOOKED')
    .flatMap((booking) => {
      const days = [];
      const startPart = String(booking.startDate).substring(0, 10);
      const endPart = String(booking.endDate).substring(0, 10);
      const cursor = new Date(`${startPart}T00:00:00`);
      const end = new Date(`${endPart}T00:00:00`);
      while (cursor <= end) {
        days.push(formatDateInput(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    });
  const calendarCells = buildCalendarCells(bookedDates, new Date().getFullYear(), new Date().getMonth());
  const rentalDays = rentalMode === 'single'
    ? (singleDate ? 1 : 0)
    : (startDate && endDate ? Math.max(0, Math.floor((new Date(`${endDate}T00:00:00`) - new Date(`${startDate}T00:00:00`)) / (1000 * 60 * 60 * 24)) + 1) : 0);
  const estimatedRentalFee = selectedCamera ? Number(selectedCamera.dailyRate || 0) * rentalDays : 0;

  const getVisibleSamplePhotos = (camera) => {
    const start = sampleIndexByCamera[camera.id] || 0;
    return (camera.samplePhotos || []).slice(start, start + 3);
  };

  const slideSamplePhotos = (cameraId, direction) => {
    setSampleIndexByCamera((prev) => {
      const camera = rentalCameras.find((item) => String(item.id) === String(cameraId));
      if (!camera) return prev;

      const current = prev[cameraId] || 0;
      const maxStart = Math.max((camera.samplePhotos || []).length - 3, 0);
      const next = direction === 'next' ? Math.min(current + 1, maxStart) : Math.max(current - 1, 0);
      return { ...prev, [cameraId]: next };
    });
  };

  const checkSelectedCameraAvailability = async () => {
    if (!selectedCamera) return;
    setRentalError('');

    if (rentalMode === 'single') {
      if (!singleDate) {
        setRentalStatusMessage('Please select a rental date.');
        return;
      }
      try {
        const response = await axios.get(`http://localhost:5000/api/rental-cameras/${selectedCamera.id}/availability`, {
          params: { startDate: singleDate, endDate: singleDate }
        });
        setRentalStatusMessage(
          response.data.available
            ? `${selectedCamera.name} is available on ${singleDate}.`
            : `${selectedCamera.name} is booked on ${singleDate}. Please choose another date or camera.`
        );
      } catch (error) {
        setRentalError(error.response?.data?.message || 'Failed checking camera availability.');
      }
      return;
    }

    if (!startDate || !endDate) {
      setRentalStatusMessage('Please select both start and end dates.');
      return;
    }

    if (new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
      setRentalStatusMessage('End date should be the same as or after start date.');
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/rental-cameras/${selectedCamera.id}/availability`, {
        params: { startDate, endDate }
      });
      setRentalStatusMessage(
        response.data.available
          ? `${selectedCamera.name} is available from ${startDate} to ${endDate}.`
          : `${selectedCamera.name} is not available from ${startDate} to ${endDate}.`
      );
    } catch (error) {
      setRentalError(error.response?.data?.message || 'Failed checking camera availability.');
    }
  };

  const openCheckoutModal = () => {
    setCheckoutError('');
    setCheckoutSuccess('');
    setIsCheckoutOpen(true);
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const playConfirmSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.24);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.25);
    } catch (error) {
      console.error('Unable to play confirmation sound:', error);
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutError('');
    setCheckoutSuccess('');

    if (cartItems.length === 0) {
      setCheckoutError('Your bag is empty. Add items first before checkout.');
      return;
    }

    if (!customerDetails.fullName.trim()) {
      setCheckoutError('Please enter your full name.');
      return;
    }

    if (!customerDetails.messenger.trim()) {
      setCheckoutError('Please enter your Messenger account.');
      return;
    }

    if (paymentMethod === 'gcash' && !receiptFile) {
      setCheckoutError('Please upload your GCash receipt before proceeding.');
      return;
    }

    if (!agreedToTerms) {
      setCheckoutError('Please agree to the terms before proceeding.');
      return;
    }

    const newOrder = {
      id: `ORD-${Date.now()}`,
      customerName: customerDetails.fullName.trim(),
      messenger: customerDetails.messenger.trim(),
      paymentMethod: paymentMethod.toUpperCase(),
      receiptFileName: receiptFile?.name || 'N/A',
      agreedToTerms: true,
      items: cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: cart[item.id],
        unitPrice: Number(item.price),
        subtotal: Number((item.price * cart[item.id]).toFixed(2))
      })),
      totalAmount: Number(cartTotalAmount.toFixed(2)),
      createdAt: new Date().toISOString()
    };

    try {
      const formData = new FormData();
      formData.append('orderCode', newOrder.id);
      formData.append('customerName', newOrder.customerName);
      formData.append('messenger', newOrder.messenger);
      formData.append('paymentMethod', newOrder.paymentMethod);
      formData.append('agreedToTerms', String(newOrder.agreedToTerms));
      formData.append('items', JSON.stringify(newOrder.items));
      formData.append('totalAmount', String(newOrder.totalAmount));
      if (paymentMethod === 'gcash' && receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await axios.post('http://localhost:5000/api/orders', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchOrders();
      setCart({});
      setCustomerDetails({ fullName: '', messenger: '' });
      setPaymentMethod('gcash');
      setReceiptFile(null);
      setAgreedToTerms(false);
      setCheckoutSuccess('Ordered successfully! Your order was saved to the database.');
      playConfirmSound();
    } catch (error) {
      setCheckoutError(error.response?.data?.message || 'Failed to save order to database.');
    }
  };

  const handleRentalCheckout = async (e) => {
    e.preventDefault();
    if (!selectedCamera) return;
    setRentalError('');
    setRentalCheckoutResult(null);

    const resolvedStartDate = rentalMode === 'single' ? singleDate : startDate;
    const resolvedEndDate = rentalMode === 'single' ? singleDate : endDate;
    if (!resolvedStartDate || !resolvedEndDate) {
      setRentalError('Please select rental date(s).');
      return;
    }
    if (!rentalTime) {
      setRentalError('Please select a pickup/rental time.');
      return;
    }
    if (!rentalCheckoutData.name.trim() || !rentalCheckoutData.contact.trim()) {
      setRentalError('Name and contact are required.');
      return;
    }
    if (!rentalCheckoutData.acceptedTerms) {
      setRentalError('Please accept the terms and agreements before checkout.');
      return;
    }

    const today = formatDateInput(new Date());
    const isSameDay = resolvedStartDate === today;
    if (!isSameDay && rentalCheckoutData.paymentMethod !== 'GCASH') {
      setRentalError('Advanced booking requires GCash reservation.');
      return;
    }
    if (!isSameDay && !rentalCheckoutData.reservationReceipt) {
      setRentalError('Please upload reservation receipt for advanced booking.');
      return;
    }

    setShowRentalConfirmModal(true);
  };

  const confirmAndSubmitRental = async () => {
    setShowRentalConfirmModal(false);
    const resolvedStartDate = rentalMode === 'single' ? singleDate : startDate;
    const resolvedEndDate = rentalMode === 'single' ? singleDate : endDate;

    try {
      const formData = new FormData();
      formData.append('cameraId', selectedCamera.id);
      formData.append('customerName', rentalCheckoutData.name.trim());
      formData.append('contact', rentalCheckoutData.contact.trim());
      formData.append('startDate', resolvedStartDate);
      formData.append('endDate', resolvedEndDate);
      formData.append('rentalTime', rentalTime);
      formData.append('paymentMethod', rentalCheckoutData.paymentMethod);
      formData.append('termsAccepted', 'true');
      if (rentalCheckoutData.reservationReceipt) {
        formData.append('reservationReceipt', rentalCheckoutData.reservationReceipt);
      }
      const response = await axios.post('http://localhost:5000/api/rentals/checkout', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setRentalCheckoutResult(response.data);
      setRentalStatusMessage('Rental request submitted. Waiting for admin confirmation.');
      setRentalCheckoutData({ name: '', contact: '', paymentMethod: 'GCASH', reservationReceipt: null, acceptedTerms: false });
      setRentalBookings((prev) => [...prev, {
        bookingCode: response.data.bookingCode,
        cameraId: selectedCamera.id,
        cameraName: selectedCamera.name,
        customerName: response.data.customerName || rentalCheckoutData.name.trim(),
        contact: rentalCheckoutData.contact.trim(),
        startDate: resolvedStartDate,
        endDate: resolvedEndDate,
        returnDateTime: response.data.returnDateTime,
        totalFee: response.data.totalFee,
        status: response.data.status
      }]);
    } catch (error) {
      setRentalError(error.response?.data?.message || 'Failed to submit rental checkout.');
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };

    fetchProducts();
  }, []);

  const fetchRentalBookings = async () => {
    try {
      const bookingsRes = await axios.get('http://localhost:5000/api/admin/rentals');
      setRentalBookings(bookingsRes.data || []);
    } catch (error) {
      console.error('Error fetching rental data:', error);
    }
  };

  useEffect(() => {
    const fetchHomepageRentalData = async () => {
      try {
        const [announcementRes, cameraRes] = await Promise.all([
          axios.get('http://localhost:5000/api/announcements', { params: { active: true } }),
          axios.get('http://localhost:5000/api/rental-cameras')
        ]);
        setAnnouncements(announcementRes.data || []);
        setRentalCameras(cameraRes.data || []);
        if ((cameraRes.data || []).length) setSelectedCameraId((prev) => prev || cameraRes.data[0].id);
        fetchRentalBookings();
      } catch (error) {
        console.error('Error fetching homepage rental data:', error);
      }
    };

    fetchHomepageRentalData();
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchOrders();
    });
  }, []);

  return (
    <>
      <div className="petal"></div>
      <div className="petal"></div>
      <div className="petal"></div>
      <div className="petal"></div>
      <div className="petal"></div>
      <div className="petal"></div>
      <div className="petal"></div>

      <nav className="navbar">
        <ul className="nav-links">
          <li>
            <a href="#" className={currentPage === 'home' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setCurrentPage('home'); }}>
              Home
            </a>
          </li>
          <li><a href="#">About</a></li>
          <li><a href="#">Albums</a></li>
          <li><a href="#">Reviews</a></li>
          <li>
            <a href="#" className={currentPage === 'login' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setCurrentPage('login'); }}>
              Login
            </a>
          </li>
        </ul>
        <div className="cart-icon" onClick={() => setIsCartOpen(!isCartOpen)} style={{ cursor: 'pointer', position: 'relative' }}>
          <i className="fas fa-shopping-bag"></i>
          <span className="cart-badge">{getCartTotal()}</span>
          
          {isCartOpen && (
            <div className="cart-dropdown">
              <h4>Your Order</h4>
              {cartItems.length === 0 ? (
                <p>Your bag is empty.</p>
              ) : (
                <ul className="cart-list">
                  {cartItems.map(item => (
                    <li key={item.id}>
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-qty">x{cart[item.id]}</span>
                      <span className="cart-item-price">{(item.price * cart[item.id]).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {cartItems.length > 0 && (
                <div className="cart-total">
                  <strong>Total:</strong>
                  <strong>{cartTotalAmount.toFixed(2)}</strong>
                </div>
              )}
              <button
                className="btn btn-primary checkout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openCheckoutModal();
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </nav>

      {isCheckoutOpen && (
        <div className="checkout-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="checkout-header">
              <h3>Checkout Details</h3>
              <button className="checkout-close" onClick={() => setIsCheckoutOpen(false)}>x</button>
            </div>

            <div className="checkout-items">
              <h4>Your Order</h4>
              {cartItems.length === 0 ? (
                <p>Your bag is empty.</p>
              ) : (
                <ul className="cart-list">
                  {cartItems.map(item => (
                    <li key={item.id}>
                      <span className="cart-item-name">{item.name}</span>
                      <span className="cart-item-qty">x{cart[item.id]}</span>
                      <span className="cart-item-price">{(item.price * cart[item.id]).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="cart-total">
                <strong>Total:</strong>
                <strong>{cartTotalAmount.toFixed(2)}</strong>
              </div>
            </div>

            <form className="checkout-form" onSubmit={handleCheckoutSubmit}>
              <h4>Customer Details</h4>
              <input
                type="text"
                placeholder="Full name"
                value={customerDetails.fullName}
                onChange={(e) => setCustomerDetails((prev) => ({ ...prev, fullName: e.target.value }))}
                required
              />
              <input
                type="text"
                placeholder="Messenger account"
                value={customerDetails.messenger}
                onChange={(e) => setCustomerDetails((prev) => ({ ...prev, messenger: e.target.value }))}
                required
              />

              <h4>Mode of Payment</h4>
              <div className="payment-options">
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gcash"
                    checked={paymentMethod === 'gcash'}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setReceiptFile(null);
                    }}
                  />
                  GCash
                </label>
                <label>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  Cash on Delivery (COD)
                </label>
              </div>

              {paymentMethod === 'gcash' && (
                <div className="receipt-upload">
                  <label htmlFor="receiptUpload">Upload GCash Receipt</label>
                  <input
                    id="receiptUpload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              <label className="terms-checkbox">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="terms-copy">
                  I agree to the
                  <button
                    type="button"
                    className="terms-link-btn"
                    onClick={() => setShowTermsModal(true)}
                  >
                    Terms of Agreement
                  </button>
                  before proceeding.
                </span>
              </label>

              {checkoutError && <p className="checkout-message error">{checkoutError}</p>}
              {checkoutSuccess && <p className="checkout-message success">{checkoutSuccess}</p>}

              <button type="submit" className="btn btn-primary">
                Place Order
              </button>
            </form>
          </div>
        </div>
      )}

      {showTermsModal && (
        <div className="checkout-overlay" onClick={() => setShowTermsModal(false)}>
          <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Terms of Agreement</h3>
            <p>
              By placing an order, you confirm that all customer and payment information provided is
              accurate and complete.
            </p>
            <p>
              For GCash payments, uploaded receipts may be verified before order processing. For COD,
              you agree to prepare the exact payment upon delivery.
            </p>
            <p>
              Orders are subject to product availability and confirmation by Krizza Shop. Delivery
              timelines may vary depending on location and order volume.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setShowTermsModal(false)}>
              I Understand
            </button>
          </div>
        </div>
      )}

      {currentPage === 'home' && (
        <>
          <Hero />
          {announcements.length > 0 && (
            <section className="announcement-highlight-wrap">
              {announcements.map((item) => (
                <article key={item.id} className="announcement-highlight-card">
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                </article>
              ))}
            </section>
          )}
          <div className="section-header">
            <div className="section-header-inner">
              <h2 className="section-title">Our Collections</h2>
            </div>
            <p className="section-subtitle">
              Beautiful items for every occasion <i className="fas fa-heart"></i>
            </p>
            <div className="category-filters">
              {['All', 'Flowers', 'Jewelries', 'Clothes'].map(cat => (
                <button 
                  key={cat}
                  className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <section className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                cartQty={cart[product.id] || 0}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </section>

          <div className="section-header timeless-shots-header">
            <div className="section-header-inner">
              <h2 className="section-title">Timeless Shots Camera Rentals</h2>
            </div>
            <p className="section-subtitle">
              Rent premium cameras for your special events <i className="fas fa-camera"></i>
            </p>
          </div>

          <section className="timeless-shots-grid">
            {rentalCameras.map((camera) => (
              <article key={camera.id} className="timeless-camera-card">
                <div
                  className="timeless-camera-image"
                  style={{ backgroundImage: `url(http://localhost:5000${camera.coverImageUrl || ''})` }}
                ></div>
                <div className="timeless-camera-body" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '26px', color: 'var(--purple-main)', marginBottom: '10px' }}>{camera.name}</h3>
                  <p className="timeless-camera-rate" style={{ fontSize: '18px', fontWeight: 'bold', color: '#444', marginBottom: '15px' }}>Rate: ₱{Number(camera.dailyRate).toLocaleString()} / day</p>
                  
                  {camera.details && (
                    <div style={{ marginBottom: '15px' }}>
                      <strong style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '5px' }}>Technical Details / Inclusion:</strong>
                      <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#555', whiteSpace: 'pre-wrap' }}>{camera.details}</p>
                    </div>
                  )}

                  <div style={{ marginBottom: '20px' }}>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '5px' }}>Terms & Agreements:</strong>
                    <p className="timeless-camera-terms" style={{ fontSize: '14px', lineHeight: '1.6', color: '#555', whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #ccc' }}>{camera.terms}</p>
                  </div>

                  <p className="timeless-samples-label" style={{ fontWeight: 'bold', marginBottom: '10px' }}>Sample shots</p>
                  <div className="timeless-samples-row" style={{ marginBottom: '20px' }}>
                    <button
                      type="button"
                      className="sample-arrow-btn"
                      onClick={() => slideSamplePhotos(camera.id, 'prev')}
                    >
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    {getVisibleSamplePhotos(camera).map((photoUrl, index) => (
                      <button
                        type="button"
                        key={`${camera.id}-sample-${index}`}
                        className="timeless-sample-photo"
                        style={{ backgroundImage: `url(http://localhost:5000${photoUrl})` }}
                        onClick={() => setZoomedPhoto(`http://localhost:5000${photoUrl}`)}
                      ></button>
                    ))}
                    <button
                      type="button"
                      className="sample-arrow-btn"
                      onClick={() => slideSamplePhotos(camera.id, 'next')}
                    >
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`btn-view timeless-camera-select ${selectedCameraId === camera.id ? 'active' : ''}`}
                    style={{ width: '100%', padding: '12px', fontSize: '16px', marginTop: '10px' }}
                    onClick={() => {
                      setSelectedCameraId(camera.id);
                      setRentalStatusMessage('');
                    }}
                  >
                    {selectedCameraId === camera.id ? 'Selected Camera' : 'Choose Camera'}
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="timeless-calendar-wrap">
            <div className="timeless-calendar-card">
              <div className="timeless-calendar-header">
                <h3>Rental Availability Calendar</h3>
                <p>{selectedCamera ? selectedCamera.name : 'No camera selected'} - {currentMonthLabel}</p>
              </div>

              <div className="calendar-legend-row">
                <span className="legend-pill booked">Booked</span>
                <span className="legend-pill available">Available</span>
              </div>

              <div className="calendar-week-grid week-labels">
                {CALENDAR_DAYS.map((day) => (
                  <span key={day} className="week-label">{day}</span>
                ))}
              </div>

              <div className="calendar-week-grid">
                {calendarCells.map((entry, index) =>
                  entry ? (
                    <div key={entry.dateKey} className={`calendar-day ${entry.isBooked ? 'booked' : 'available'}`}>
                      {entry.day}
                    </div>
                  ) : (
                    <div key={`blank-${index}`} className="calendar-day empty"></div>
                  )
                )}
              </div>

              <div className="rental-form-block">
                <h4>Check rental schedule</h4>
                <div className="rental-mode-row">
                  <label>
                    <input
                      type="radio"
                      name="rentalMode"
                      value="single"
                      checked={rentalMode === 'single'}
                      onChange={(e) => {
                        setRentalMode(e.target.value);
                        setRentalStatusMessage('');
                      }}
                    />
                    One day
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="rentalMode"
                      value="range"
                      checked={rentalMode === 'range'}
                      onChange={(e) => {
                        setRentalMode(e.target.value);
                        setRentalStatusMessage('');
                      }}
                    />
                    Multiple days
                  </label>
                </div>

                {rentalMode === 'single' ? (
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Rental Date:</label>
                    <input
                      type="date"
                      value={singleDate}
                      min={formatDateInput(new Date())}
                      onChange={(e) => setSingleDate(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                  </div>
                ) : (
                  <div className="rental-range-row" style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Start Date:</label>
                      <input
                        type="date"
                        value={startDate}
                        min={formatDateInput(new Date())}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>End Date:</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || formatDateInput(new Date())}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label htmlFor="rentalTimeInput" style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Pickup / Rental Time:</label>
                  <input
                    id="rentalTimeInput"
                    type="time"
                    value={rentalTime}
                    onChange={(e) => setRentalTime(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>

                <button type="button" className="btn btn-primary check-availability-btn" onClick={checkSelectedCameraAvailability} style={{ width: '100%', padding: '12px', fontSize: '15px' }}>
                  Check Availability
                </button>
                {rentalStatusMessage && <p className="rental-status-message">{rentalStatusMessage}</p>}
                {rentalError && <p className="checkout-message error">{rentalError}</p>}
                <p className="admin-upload-note">
                  Camera details, pricing, terms, and sample shots are managed by admin only.
                </p>
              </div>

              <form className="rental-form-block" onSubmit={handleRentalCheckout} style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fcf8ff', borderRadius: '8px', border: '1px solid #efe1fa' }}>
                <h4 style={{ fontSize: '18px', marginBottom: '15px' }}>Proceed to Rental Checkout</h4>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Renter's Full Name:</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={rentalCheckoutData.name}
                    onChange={(e) => setRentalCheckoutData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', color: '#555', fontWeight: 'bold' }}>Contact Number / Facebook Messenger:</label>
                  <input
                    type="text"
                    placeholder="E.g. 09123456789 or fb.com/username"
                    value={rentalCheckoutData.contact}
                    onChange={(e) => setRentalCheckoutData((prev) => ({ ...prev, contact: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                  />
                </div>
                
                <p className="rental-status-message" style={{ margin: '20px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--purple-main)', textAlign: 'center', backgroundColor: '#efe1fa', padding: '10px', borderRadius: '6px' }}>
                  Estimated Total Fee: ₱{estimatedRentalFee.toFixed(2)}
                </p>

                <div className="payment-options" style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', marginBottom: '10px', color: '#555', fontWeight: 'bold' }}>Select Payment Method:</p>
                  <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rentalPaymentMethod"
                      value="GCASH"
                      checked={rentalCheckoutData.paymentMethod === 'GCASH'}
                      onChange={(e) => setRentalCheckoutData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      style={{ marginRight: '8px' }}
                    />
                    GCash Reservation
                  </label>
                  <label style={{ display: 'block', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="rentalPaymentMethod"
                      value="CASH"
                      checked={rentalCheckoutData.paymentMethod === 'CASH'}
                      onChange={(e) => setRentalCheckoutData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      style={{ marginRight: '8px' }}
                    />
                    Cash On Pickup (Same-day only)
                  </label>
                </div>
                {rentalCheckoutData.paymentMethod === 'GCASH' && (
                  <div className="receipt-upload" style={{ marginBottom: '20px', padding: '15px', border: '1px dashed #ccc', borderRadius: '6px', backgroundColor: '#fff' }}>
                    <label htmlFor="rentalReceiptUpload" style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: '#555', fontWeight: 'bold' }}>Upload Gcash Reservation Receipt:</label>
                    <input
                      id="rentalReceiptUpload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setRentalCheckoutData((prev) => ({ ...prev, reservationReceipt: e.target.files?.[0] || null }))}
                      style={{ width: '100%', padding: '5px' }}
                    />
                  </div>
                )}
                
                <label className="terms-checkbox" style={{ display: 'flex', alignItems: 'flex-start', margin: '20px 0', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={rentalCheckoutData.acceptedTerms}
                    onChange={(e) => setRentalCheckoutData((prev) => ({ ...prev, acceptedTerms: e.target.checked }))}
                    style={{ marginTop: '4px' }}
                  />
                  <span style={{ fontSize: '13px', lineHeight: '1.4', color: '#555' }}>
                    I agree to the <strong>Krizza Shop Rental Terms and Conditions</strong> and understand the Return Schedule strictly penalizes late returns.
                  </span>
                </label>

                <button type="submit" className="btn btn-primary check-availability-btn" style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold' }}>Continue to Confirmation</button>
                {rentalCheckoutResult && (
                  <div className="checkout-message success" style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e6ffe6', borderRadius: '4px', border: '1px solid #b3ffb3' }}>
                    <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Booking submitted successfully!</p>
                    <p style={{ margin: '0' }}>Booking Code: <strong>{rentalCheckoutResult.bookingCode}</strong></p>
                    <p style={{ margin: '0' }}>Return Schedule: <strong>{new Date(rentalCheckoutResult.returnDateTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</strong></p>
                  </div>
                )}
              </form>
            </div>
          </section>
        </>
      )}

      {showRentalConfirmModal && (
        <div className="checkout-overlay" onClick={() => setShowRentalConfirmModal(false)}>
          <div className="checkout-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '30px', borderRadius: '12px' }}>
            <button type="button" className="checkout-close" onClick={() => setShowRentalConfirmModal(false)}>&times;</button>
            <h2 style={{ color: 'var(--purple-main)', marginBottom: '20px', fontSize: '24px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Confirm Rental Details</h2>
            <div className="checkout-form">
              <div className="checkout-summary" style={{ backgroundColor: '#fdfbff', border: '1px solid #efe1fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', lineHeight: '1.6' }}>
                <p style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Camera:</span> <strong>{selectedCamera?.name}</strong></p>
                <p style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Renter Name:</span> <strong>{rentalCheckoutData.name}</strong></p>
                <p style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Contact / Messenger:</span> <strong>{rentalCheckoutData.contact}</strong></p>
                <p style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Rental Date(s):</span> <strong>{rentalMode === 'single' ? singleDate : `${startDate} to ${endDate}`}</strong></p>
                <p style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Pickup Time:</span> <strong>{rentalTime}</strong></p>
                <p style={{ margin: '8px 0', borderBottom: '1px solid #eee', paddingBottom: '8px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Payment Method:</span> <strong>{rentalCheckoutData.paymentMethod}</strong></p>
                <p style={{ margin: '12px 0 0', fontSize: '18px' }}><span style={{ color: '#666', width: '150px', display: 'inline-block' }}>Total Fee:</span> <strong style={{ color: 'var(--purple-main)' }}>₱{estimatedRentalFee.toFixed(2)}</strong></p>
              </div>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px', padding: '10px', backgroundColor: '#fcf8ff', borderRadius: '6px', borderLeft: '3px solid var(--purple-accent)' }}>
                <strong>Note:</strong> The return date will be exactly 1 day after the end date at the same pickup time. Please return the camera on time to avoid penalties.
              </p>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="button" className="btn btn-primary" onClick={confirmAndSubmitRental} style={{ flex: 1, padding: '12px', fontSize: '16px' }}>Confirm & Book</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowRentalConfirmModal(false)} style={{ flex: 1, padding: '12px', fontSize: '16px', backgroundColor: '#e0e0e0', color: '#333' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {zoomedPhoto && (
        <div className="checkout-overlay" onClick={() => setZoomedPhoto(null)}>
          <div className="photo-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="checkout-close" onClick={() => setZoomedPhoto(null)}>x</button>
            <img src={zoomedPhoto} alt="Sample shot preview" />
          </div>
        </div>
      )}

      {currentPage === 'admin' && (
        <AdminDashboard
          orders={orders}
          onOrdersChanged={fetchOrders}
          onRentalsChanged={fetchRentalBookings}
          onLogout={() => {
            setIsLoggedIn(false);
            setCurrentPage('login');
          }} 
        />
      )}

      {currentPage === 'login' && (
        <main className="login-page">
          <div className="login-container">
            <h2>Admin Login</h2>
            {isLoggedIn ? (
              <div>
                <p style={{ color: 'var(--purple-main)', fontWeight: 'bold' }}>Welcome Admin! You are logged in.</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => setIsLoggedIn(false)}
                >
                  Logout
                </button>
              </div>
            ) : (
              <form 
                className="login-form" 
                onSubmit={async (e) => {
                  e.preventDefault();
                  setLoginError('');
                  try {
                    const response = await axios.post('http://localhost:5000/api/admin/login', {
                      username,
                      password
                    });
                    if (response.data.message === 'Login successful') {
                      setIsLoggedIn(true);
                      setUsername('');
                      setPassword('');
                      setCurrentPage('admin');
                    }
                  } catch (error) {
                    setLoginError(error.response?.data?.message || 'Server error. Please try again.');
                  }
                }}
              >
                {loginError && <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{loginError}</p>}
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input 
                    type="text" 
                    id="username" 
                    name="username" 
                    required 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      id="password" 
                      name="password" 
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <i 
                      className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        cursor: 'pointer',
                        color: 'var(--purple-main)'
                      }}
                    ></i>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '8px' }}>
                    <a href="#" style={{ fontSize: '13px', color: 'var(--purple-main)', textDecoration: 'none' }} onClick={(e) => e.preventDefault()}>Forgot password?</a>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>Login</button>
              </form>
            )}
          </div>
        </main>
      )}
    </>
  );
}

export default App;
