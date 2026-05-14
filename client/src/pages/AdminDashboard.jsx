import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

function AdminDashboard({ onLogout, orders = [], onOrdersChanged, onRentalsChanged }) {
  const [activeTab, setActiveTab] = useState('products');
  const [dateFilter, setDateFilter] = useState('');
  const [orderActionMessage, setOrderActionMessage] = useState('');
  const [isLoadingRentals, setIsLoadingRentals] = useState(false);
  const [cameraUploadMessage, setCameraUploadMessage] = useState('');

  const [productData, setProductData] = useState({
    name: '',
    category: 'Flowers',
    price: '',
    stock: '',
    description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '', isActive: true });
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null);

  const [rentalCameras, setRentalCameras] = useState([]);
  const [rentalBookings, setRentalBookings] = useState([]);
  const [cameraForm, setCameraForm] = useState({
    name: '',
    dailyRate: '',
    details: '',
    terms: '',
    isActive: true
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [sampleFiles, setSampleFiles] = useState([]);
  const [editingCameraId, setEditingCameraId] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const fetchRentals = async () => {
    try {
      setIsLoadingRentals(true);
      const [cameraRes, bookingRes] = await Promise.all([
        axios.get('http://localhost:5000/api/admin/rental-cameras'),
        axios.get('http://localhost:5000/api/admin/rentals')
      ]);
      setRentalCameras(cameraRes.data);
      setRentalBookings(bookingRes.data);
    } catch (error) {
      console.error('Failed to fetch rental data:', error);
    } finally {
      setIsLoadingRentals(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchAnnouncements();
      fetchRentals();
    });
  }, []);

  const handleProductUpload = async (e) => {
    e.preventDefault();
    setUploadMessage('');
    const formData = new FormData();
    formData.append('name', productData.name);
    formData.append('category', productData.category);
    formData.append('price', productData.price);
    formData.append('stock', productData.stock);
    formData.append('description', productData.description);
    if (imageFile) formData.append('image', imageFile);

    try {
      const response = await axios.post('http://localhost:5000/api/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.status === 201) {
        setUploadMessage('Product uploaded successfully!');
        setProductData({ name: '', category: 'Flowers', price: '', stock: '', description: '' });
        setImageFile(null);
        document.getElementById('productImageInput').value = '';
      }
    } catch (error) {
      const serverMessage = error.response?.data?.message || error.message;
      setUploadMessage(`Error uploading product: ${serverMessage}`);
    }
  };

  const formatDisplayDate = (dateValue) => {
    const date = new Date(dateValue);
    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (!dateFilter) return true;
    return order.createdAt.slice(0, 10) === dateFilter;
  });

  const totalSales = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const totalItemsSold = filteredOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0
  );

  const rentalSalesByCamera = useMemo(
    () =>
      rentalBookings
        .filter((booking) => booking.status === 'BOOKED')
        .reduce((acc, booking) => {
          const key = booking.cameraName || 'Unknown Camera';
          acc[key] = (acc[key] || 0) + Number(booking.totalFee || 0);
          return acc;
        }, {}),
    [rentalBookings]
  );

  const totalRentalSales = useMemo(
    () => Object.values(rentalSalesByCamera).reduce((sum, value) => sum + value, 0),
    [rentalSalesByCamera]
  );

  const handleConfirmOrder = async (orderId) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/confirm`);
      setOrderActionMessage(`Order ${orderId} confirmed successfully.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (error) {
      setOrderActionMessage(error.response?.data?.message || 'Failed to confirm order.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const approved = window.confirm(`Delete order ${orderId}? This cannot be undone.`);
    if (!approved) return;
    try {
      await axios.delete(`http://localhost:5000/api/orders/${orderId}`);
      setOrderActionMessage(`Order ${orderId} deleted.`);
      if (onOrdersChanged) await onOrdersChanged();
    } catch (error) {
      setOrderActionMessage(error.response?.data?.message || 'Failed to delete order.');
    }
  };

  const handleExportOrders = () => {
    if (!filteredOrders.length) {
      setOrderActionMessage('No orders available to export.');
      return;
    }
    const header = ['Order ID', 'Date', 'Customer Name', 'Messenger', 'Items', 'Payment Method', 'Status', 'Receipt File', 'Total Amount'];
    const rows = filteredOrders.map((order) => [
      order.id,
      formatDisplayDate(order.createdAt),
      order.customerName,
      order.messenger || '',
      order.items.map((item) => `${item.name} x${item.quantity}`).join(' | '),
      order.paymentMethod,
      order.status || 'PENDING',
      order.receiptFileName || '',
      Number(order.totalAmount).toFixed(2)
    ]);
    const csvContent = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `krizza-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setOrderActionMessage('Orders exported to CSV (Excel-readable) successfully.');
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({ title: '', content: '', isActive: true });
    setEditingAnnouncementId(null);
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) return;
    try {
      if (editingAnnouncementId) {
        await axios.put(`http://localhost:5000/api/admin/announcements/${editingAnnouncementId}`, announcementForm);
      } else {
        await axios.post('http://localhost:5000/api/admin/announcements', announcementForm);
      }
      resetAnnouncementForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed saving announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/announcements/${id}`);
      fetchAnnouncements();
      if (editingAnnouncementId === id) resetAnnouncementForm();
    } catch (error) {
      console.error('Failed deleting announcement:', error);
    }
  };

  const resetCameraForm = () => {
    setCameraForm({ name: '', dailyRate: '', details: '', terms: '', isActive: true });
    setCoverImageFile(null);
    setSampleFiles([]);
    setEditingCameraId(null);
    const cameraCoverInput = document.getElementById('cameraCoverInput');
    const cameraSamplesInput = document.getElementById('cameraSamplesInput');
    if (cameraCoverInput) cameraCoverInput.value = '';
    if (cameraSamplesInput) cameraSamplesInput.value = '';
  };

  const handleCameraSubmit = async (e) => {
    e.preventDefault();
    setCameraUploadMessage('');
    const formData = new FormData();
    formData.append('name', cameraForm.name);
    formData.append('dailyRate', cameraForm.dailyRate);
    formData.append('details', cameraForm.details);
    formData.append('terms', cameraForm.terms);
    formData.append('isActive', String(cameraForm.isActive));
    if (coverImageFile) formData.append('coverImage', coverImageFile);
    sampleFiles.forEach((file) => formData.append('sampleShots', file));

    try {
      if (editingCameraId) {
        await axios.put(`http://localhost:5000/api/admin/rental-cameras/${editingCameraId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCameraUploadMessage('Camera updated successfully.');
      } else {
        await axios.post('http://localhost:5000/api/admin/rental-cameras', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCameraUploadMessage('Camera uploaded successfully.');
      }
      resetCameraForm();
      fetchRentals();
    } catch (error) {
      setCameraUploadMessage(error.response?.data?.message || 'Failed to save camera details.');
    }
  };

  const handleDeleteCamera = async (id) => {
    if (!window.confirm('Delete this camera?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/rental-cameras/${id}`);
      fetchRentals();
    } catch (error) {
      console.error('Failed deleting camera:', error);
    }
  };

  const handleConfirmRental = async (bookingCode) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/rentals/${bookingCode}/confirm`);
      fetchRentals();
      if (onRentalsChanged) onRentalsChanged();
    } catch (error) {
      console.error('Failed confirming rental booking:', error);
    }
  };

  return (
    <div className="admin-dashboard-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">Krizza Admin</div>
        <ul className="admin-nav">
          <li className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
            <i className="fas fa-chart-line"></i> Analytics
          </li>
          <li className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
            <i className="fas fa-box-open"></i> Manage Products
          </li>
          <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
            <i className="fas fa-receipt"></i> Orders
          </li>
          <li className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>
            <i className="far fa-calendar-alt"></i> Rental Calendar
          </li>
          <li className={activeTab === 'announcements' ? 'active' : ''} onClick={() => setActiveTab('announcements')}>
            <i className="fas fa-bullhorn"></i> Announcements
          </li>
        </ul>
        <div className="admin-logout">
          <button onClick={onLogout}>
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {activeTab === 'analytics' && (
          <div className="fade-in">
            <header className="admin-header">
              <h1>Dashboard Overview</h1>
              <p>Your shop's performance at a glance.</p>
            </header>
            <div className="dashboard-grid">
              <div className="stat-card"><span className="stat-card-title">Total Sales</span><span className="stat-card-value">{totalSales.toFixed(2)}</span></div>
              <div className="stat-card"><span className="stat-card-title">Orders Count</span><span className="stat-card-value">{filteredOrders.length}</span></div>
              <div className="stat-card"><span className="stat-card-title">Items Sold</span><span className="stat-card-value">{totalItemsSold}</span></div>
              <div className="stat-card"><span className="stat-card-title">Paid via GCash</span><span className="stat-card-value">{filteredOrders.filter((order) => order.paymentMethod === 'GCASH').length}</span></div>
            </div>
            <div className="white-panel">
              <h2>Sales Filter</h2>
              <div className="orders-filter-row">
                <label htmlFor="analyticsDateFilter">Filter by date</label>
                <input id="analyticsDateFilter" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                <button type="button" className="admin-btn clear-btn" onClick={() => setDateFilter('')}>Clear</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="fade-in">
            <header className="admin-header"><h1>Order Details</h1><p>Track complete checkout details and payment information.</p></header>
            <div className="white-panel">
              <div className="orders-filter-row">
                <label htmlFor="ordersDateFilter">Filter by order date</label>
                <input id="ordersDateFilter" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
                <button type="button" className="admin-btn clear-btn" onClick={() => setDateFilter('')}>Clear</button>
                <button type="button" className="admin-btn export-btn" onClick={handleExportOrders}>Export Excel (CSV)</button>
              </div>
              {orderActionMessage && <p className="order-action-message">{orderActionMessage}</p>}
              {filteredOrders.length === 0 ? (
                <p style={{ color: '#777' }}>No orders found for the selected date.</p>
              ) : (
                <div className="orders-table-wrap">
                  <table className="orders-table">
                    <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Messenger</th><th>Items</th><th>Payment</th><th>Status</th><th>Receipt</th><th>Total</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.id}</td><td>{formatDisplayDate(order.createdAt)}</td><td>{order.customerName}</td><td>{order.messenger || '-'}</td>
                          <td>{order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}</td>
                          <td>{order.paymentMethod}</td>
                          <td><span className={`order-status ${order.status === 'CONFIRMED' ? 'confirmed' : 'pending'}`}>{order.status || 'PENDING'}</span></td>
                          <td>{order.receiptUrl ? <a href={`http://localhost:5000${order.receiptUrl}`} download={order.receiptFileName || `${order.id}-receipt`} target="_blank" rel="noreferrer">Download</a> : '-'}</td>
                          <td>{Number(order.totalAmount).toFixed(2)}</td>
                          <td><div className="order-action-buttons"><button type="button" className="admin-btn order-btn confirm-btn" onClick={() => handleConfirmOrder(order.id)} disabled={order.status === 'CONFIRMED'}>Confirm</button><button type="button" className="admin-btn order-btn delete-btn" onClick={() => handleDeleteOrder(order.id)}>Delete</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="fade-in">
            <header className="admin-header"><h1>Product Management</h1><p>Upload and manage your store's items.</p></header>
            <div className="white-panel">
              <h2>Upload New Product</h2>
              <form onSubmit={handleProductUpload}>
                {uploadMessage && <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: uploadMessage.includes('Error') ? '#ffebee' : '#e8f5e9', color: uploadMessage.includes('Error') ? '#d32f2f' : '#2e7d32', borderRadius: '6px' }}>{uploadMessage}</div>}
                <input type="text" placeholder="Product Name" required value={productData.name} onChange={(e) => setProductData({ ...productData, name: e.target.value })} />
                <select style={{ width: '100%', padding: '12px 15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '15px', fontFamily: 'inherit', fontSize: '15px' }} value={productData.category} onChange={(e) => setProductData({ ...productData, category: e.target.value })}>
                  <option value="Flowers">Flowers</option><option value="Jewelries">Jewelries</option><option value="Clothes">Clothes</option>
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <input type="number" placeholder="Price" required step="0.01" min="0" value={productData.price} onChange={(e) => setProductData({ ...productData, price: e.target.value })} />
                  <input type="number" placeholder="Stocks Available" required min="0" value={productData.stock} onChange={(e) => setProductData({ ...productData, stock: e.target.value })} />
                </div>
                <textarea placeholder="Product Description..." rows="4" value={productData.description} onChange={(e) => setProductData({ ...productData, description: e.target.value })}></textarea>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontSize: '14px' }}>Upload Image</label>
                  <input type="file" id="productImageInput" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} style={{ border: '1px solid #ddd', padding: '10px', borderRadius: '8px', width: '100%' }} />
                </div>
                <button type="submit" className="admin-btn" style={{ marginTop: '10px' }}>Upload Product</button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="fade-in">
            <header className="admin-header"><h1>Rental Calendar</h1><p>Manage camera details, booking records, and return schedule.</p></header>
            <div className="dashboard-grid">
              <div className="stat-card"><span className="stat-card-title">Total Rental Sales</span><span className="stat-card-value">{totalRentalSales.toFixed(2)}</span></div>
              {Object.entries(rentalSalesByCamera).map(([cameraName, amount]) => (
                <div key={cameraName} className="stat-card"><span className="stat-card-title">{cameraName}</span><span className="stat-card-value">{Number(amount).toFixed(2)}</span></div>
              ))}
            </div>
            <div className="white-panel">
              <h2>Upload / Edit Rental Camera</h2>
              {cameraUploadMessage && <p className="order-action-message">{cameraUploadMessage}</p>}
              <form onSubmit={handleCameraSubmit}>
                <input type="text" placeholder="Camera name" required value={cameraForm.name} onChange={(e) => setCameraForm((prev) => ({ ...prev, name: e.target.value }))} />
                <input type="number" placeholder="Daily rate" min="0" step="0.01" required value={cameraForm.dailyRate} onChange={(e) => setCameraForm((prev) => ({ ...prev, dailyRate: e.target.value }))} />
                <textarea placeholder="Camera details" rows="3" value={cameraForm.details} onChange={(e) => setCameraForm((prev) => ({ ...prev, details: e.target.value }))}></textarea>
                <textarea placeholder="Terms and agreement" rows="4" required value={cameraForm.terms} onChange={(e) => setCameraForm((prev) => ({ ...prev, terms: e.target.value }))}></textarea>
                <label className="admin-checkbox"><input type="checkbox" checked={cameraForm.isActive} onChange={(e) => setCameraForm((prev) => ({ ...prev, isActive: e.target.checked }))} />Active on homepage</label>
                <label>Camera cover image</label>
                <input id="cameraCoverInput" type="file" accept="image/*" onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)} />
                <label>Sample shots (multiple)</label>
                <input id="cameraSamplesInput" type="file" accept="image/*" multiple onChange={(e) => setSampleFiles(Array.from(e.target.files || []))} />
                <div className="admin-form-actions">
                  <button type="submit" className="admin-btn">{editingCameraId ? 'Update Camera' : 'Upload Camera'}</button>
                  {editingCameraId && <button type="button" className="admin-btn clear-btn" onClick={resetCameraForm}>Cancel Edit</button>}
                </div>
              </form>
            </div>
            <div className="white-panel">
              <h2>Uploaded Cameras</h2>
              {rentalCameras.length === 0 ? <p style={{ color: '#777' }}>No rental cameras uploaded yet.</p> : (
                <div className="admin-camera-grid">
                  {rentalCameras.map((camera) => (
                    <article key={camera.id} className="admin-camera-card">
                      <div className="admin-camera-cover" style={{ backgroundImage: `url(http://localhost:5000${camera.coverImageUrl || ''})` }}></div>
                      <h3>{camera.name}</h3><p>Rate: {Number(camera.dailyRate).toFixed(2)} / day</p><p>Status: {camera.isActive ? 'Active' : 'Hidden'}</p>
                      <div className="admin-camera-actions">
                        <button type="button" className="admin-btn order-btn" onClick={() => { setEditingCameraId(camera.id); setCameraForm({ name: camera.name, dailyRate: camera.dailyRate, details: camera.details || '', terms: camera.terms || '', isActive: camera.isActive }); }}>Edit</button>
                        <button type="button" className="admin-btn order-btn delete-btn" onClick={() => handleDeleteCamera(camera.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
            <div className="white-panel">
              <h2>Bookings and Return Schedule</h2>
              {isLoadingRentals ? <p style={{ color: '#777' }}>Loading rental bookings...</p> : rentalBookings.length === 0 ? <p style={{ color: '#777' }}>No rental bookings yet.</p> : (
                <div className="orders-table-wrap">
                  <table className="orders-table">
                    <thead><tr><th>Booking</th><th>Camera</th><th>Renter Details</th><th>Rental Dates</th><th>Return Time</th><th>Total Fee</th><th>Payment Info</th><th>Receipt</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                      {rentalBookings.map((booking) => (
                        <tr key={booking.bookingCode}>
                          <td><strong>{booking.bookingCode}</strong></td>
                          <td>{booking.cameraName}</td>
                          <td>
                            <div>{booking.customerName}</div>
                            <div style={{fontSize: '12px', color: '#555'}}>{booking.contact}</div>
                          </td>
                          <td>
                            <div style={{ whiteSpace: 'nowrap' }}>{new Date(booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div style={{ fontSize: '12px', color: '#777', textAlign: 'center' }}>to</div>
                            <div style={{ whiteSpace: 'nowrap' }}>{new Date(booking.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                          </td>
                          <td>{formatDisplayDate(booking.returnDateTime)}</td>
                          <td>₱{Number(booking.totalFee).toFixed(2)}</td>
                          <td>{booking.paymentMethod}</td>
                          <td>
                            {booking.reservationReceiptUrl ? (
                              <a href={`http://localhost:5000${booking.reservationReceiptUrl}`} target="_blank" rel="noreferrer" style={{color: '#8e44ad', textDecoration: 'underline'}}>View Receipt</a>
                            ) : '-'}
                          </td>
                          <td><span className={`order-status ${booking.status === 'BOOKED' ? 'confirmed' : 'pending'}`}>{booking.status}</span></td>
                          <td><button type="button" className="admin-btn order-btn confirm-btn" onClick={() => handleConfirmRental(booking.bookingCode)} disabled={booking.status === 'BOOKED'}>Confirm</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="fade-in">
            <header className="admin-header"><h1>Announcements</h1><p>Post updates for customers on the homepage.</p></header>
            <div className="white-panel">
              <h2>{editingAnnouncementId ? 'Edit Announcement' : 'Create Announcement'}</h2>
              <form onSubmit={handleAnnouncementSubmit}>
                <input type="text" placeholder="Announcement title" required value={announcementForm.title} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))} />
                <textarea placeholder="What would you like to share?" rows="4" required value={announcementForm.content} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))}></textarea>
                <label className="admin-checkbox"><input type="checkbox" checked={announcementForm.isActive} onChange={(e) => setAnnouncementForm((prev) => ({ ...prev, isActive: e.target.checked }))} />Active announcement</label>
                <div className="admin-form-actions">
                  <button className="admin-btn" type="submit">{editingAnnouncementId ? 'Update Announcement' : 'Post Announcement'}</button>
                  {editingAnnouncementId && <button type="button" className="admin-btn clear-btn" onClick={resetAnnouncementForm}>Cancel Edit</button>}
                </div>
              </form>
            </div>
            <div className="white-panel">
              <h2>Posted Announcements</h2>
              {announcements.length === 0 ? <p style={{ color: '#777' }}>No announcements posted yet.</p> : (
                <div className="announcement-list">
                  {announcements.map((item) => (
                    <article key={item.id} className="announcement-item">
                      <div><h3>{item.title}</h3><p>{item.content}</p><small>Status: {item.isActive ? 'Active' : 'Hidden'}</small></div>
                      <div className="announcement-actions">
                        <button type="button" className="admin-btn order-btn" onClick={() => { setEditingAnnouncementId(item.id); setAnnouncementForm({ title: item.title, content: item.content, isActive: item.isActive }); }}>Edit</button>
                        <button type="button" className="admin-btn order-btn delete-btn" onClick={() => handleDeleteAnnouncement(item.id)}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;