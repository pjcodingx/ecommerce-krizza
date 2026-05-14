const db = require('../config/db');

const normalizeDate = (value) => new Date(`${value}T00:00:00`);

const toIsoDate = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toReturnDateTime = (dateValue, timeValue = '21:00') => {
  const returnDate = new Date(`${dateValue}T${timeValue}:00`);
  returnDate.setDate(returnDate.getDate() + 1);
  const year = returnDate.getFullYear();
  const month = String(returnDate.getMonth() + 1).padStart(2, '0');
  const day = String(returnDate.getDate()).padStart(2, '0');
  const hour = String(returnDate.getHours()).padStart(2, '0');
  const minute = String(returnDate.getMinutes()).padStart(2, '0');
  const second = String(returnDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

const diffDaysInclusive = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
};

const hasDateConflict = (cameraId, startDate, endDate, callback) => {
  const sql = `
    SELECT id FROM rental_bookings
    WHERE cameraId = ?
      AND status IN ('PENDING', 'BOOKED')
      AND startDate <= ?
      AND endDate >= ?
    LIMIT 1
  `;
  db.query(sql, [cameraId, endDate, startDate], (err, rows) => {
    if (err) return callback(err);
    return callback(null, rows.length > 0);
  });
};

exports.getCameraAvailability = (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'startDate and endDate are required.' });
  }

  hasDateConflict(id, startDate, endDate, (err, hasConflict) => {
    if (err) {
      console.error('Failed checking availability:', err);
      return res.status(500).json({ message: 'Failed checking camera availability.' });
    }
    return res.status(200).json({ available: !hasConflict });
  });
};

exports.checkoutRental = (req, res) => {
  const {
    cameraId,
    customerName,
    contact,
    startDate,
    endDate,
    paymentMethod,
    termsAccepted,
    rentalTime
  } = req.body;

  if (!cameraId || !customerName || !contact || !startDate || !endDate || !paymentMethod || !rentalTime) {
    return res.status(400).json({ message: 'Missing required rental details (including rental time).' });
  }
  if (!(termsAccepted === true || termsAccepted === 'true')) {
    return res.status(400).json({ message: 'Terms and agreement must be accepted.' });
  }

  const today = toIsoDate(new Date());
  const isSameDay = startDate === today;
  const payment = String(paymentMethod).toUpperCase();
  const receiptUrl = req.file ? `/uploads/rentals/receipts/${req.file.filename}` : null;

  if (!isSameDay && payment !== 'GCASH') {
    return res.status(400).json({ message: 'Advanced bookings require GCash reservation.' });
  }
  if (!isSameDay && !receiptUrl) {
    return res.status(400).json({ message: 'GCash reservation receipt is required for advanced bookings.' });
  }
  if (isSameDay && payment !== 'GCASH' && payment !== 'CASH') {
    return res.status(400).json({ message: 'Same-day booking supports cash or GCash only.' });
  }

  if (normalizeDate(startDate) > normalizeDate(endDate)) {
    return res.status(400).json({ message: 'End date must be after or equal to start date.' });
  }

  hasDateConflict(cameraId, startDate, endDate, (conflictErr, hasConflict) => {
    if (conflictErr) {
      console.error('Failed checking booking conflict:', conflictErr);
      return res.status(500).json({ message: 'Failed checking booking conflict.' });
    }
    if (hasConflict) {
      return res.status(409).json({ message: 'Selected rental dates are no longer available.' });
    }

    db.query('SELECT id, dailyRate, name FROM rental_cameras WHERE id = ? AND isActive = 1 LIMIT 1', [cameraId], (cameraErr, cameraRows) => {
      if (cameraErr) {
        console.error('Failed loading camera:', cameraErr);
        return res.status(500).json({ message: 'Failed loading selected camera.' });
      }
      if (!cameraRows.length) {
        return res.status(404).json({ message: 'Selected camera not found or inactive.' });
      }

      const camera = cameraRows[0];
      const rentalDays = diffDaysInclusive(startDate, endDate);
      const totalFee = Number(camera.dailyRate) * rentalDays;
      const bookingCode = `RNT-${Date.now()}`;
      const returnDateTime = toReturnDateTime(endDate, rentalTime);

      const sql = `
        INSERT INTO rental_bookings
        (bookingCode, cameraId, customerName, contact, startDate, endDate, returnDateTime, rentalDays, totalFee, paymentMethod, paymentStatus, reservationReceiptUrl, status, termsAccepted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `;
      const paymentStatus = payment === 'GCASH' ? 'RESERVATION_SUBMITTED' : 'PAY_ON_RETURN';

      db.query(
        sql,
        [
          bookingCode,
          cameraId,
          customerName.trim(),
          contact.trim(),
          startDate,
          endDate,
          returnDateTime,
          rentalDays,
          totalFee,
          payment,
          paymentStatus,
          receiptUrl,
          1
        ],
        (insertErr) => {
          if (insertErr) {
            console.error('Failed creating rental booking:', insertErr);
            return res.status(500).json({ message: 'Failed to place rental booking.' });
          }
          return res.status(201).json({
            message: 'Rental checkout submitted. Awaiting admin confirmation.',
            bookingCode,
            cameraName: camera.name,
            totalFee: Number(totalFee.toFixed(2)),
            returnDateTime,
            status: 'PENDING',
            paymentStatus
          });
        }
      );
    });
  });
};

exports.getRentalByCode = (req, res) => {
  const { bookingCode } = req.params;
  const sql = `
    SELECT rb.*, rc.name AS cameraName
    FROM rental_bookings rb
    JOIN rental_cameras rc ON rc.id = rb.cameraId
    WHERE rb.bookingCode = ?
    LIMIT 1
  `;

  db.query(sql, [bookingCode], (err, rows) => {
    if (err) {
      console.error('Failed fetching rental booking:', err);
      return res.status(500).json({ message: 'Failed fetching rental booking.' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'Rental booking not found.' });
    }
    const row = rows[0];
    return res.status(200).json({
      bookingCode: row.bookingCode,
      cameraId: row.cameraId,
      cameraName: row.cameraName,
      customerName: row.customerName,
      contact: row.contact,
      startDate: row.startDate,
      endDate: row.endDate,
      returnDateTime: row.returnDateTime,
      rentalDays: row.rentalDays,
      totalFee: Number(row.totalFee),
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      reservationReceiptUrl: row.reservationReceiptUrl || null,
      status: row.status,
      createdAt: row.createdAt
    });
  });
};

exports.getAdminRentals = (req, res) => {
  const sql = `
    SELECT rb.*, rc.name AS cameraName
    FROM rental_bookings rb
    JOIN rental_cameras rc ON rc.id = rb.cameraId
    ORDER BY rb.createdAt DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Failed fetching admin rentals:', err);
      return res.status(500).json({ message: 'Failed fetching rentals.' });
    }

    const rentals = rows.map((row) => ({
      bookingCode: row.bookingCode,
      cameraId: row.cameraId,
      cameraName: row.cameraName,
      customerName: row.customerName,
      contact: row.contact,
      startDate: row.startDate,
      endDate: row.endDate,
      returnDateTime: row.returnDateTime,
      rentalDays: row.rentalDays,
      totalFee: Number(row.totalFee),
      paymentMethod: row.paymentMethod,
      paymentStatus: row.paymentStatus,
      reservationReceiptUrl: row.reservationReceiptUrl || null,
      status: row.status,
      createdAt: row.createdAt
    }));

    return res.status(200).json(rentals);
  });
};

exports.confirmRental = (req, res) => {
  const { bookingCode } = req.params;
  const sql = `
    UPDATE rental_bookings
    SET status = 'BOOKED', paymentStatus = CASE WHEN paymentMethod = 'GCASH' THEN 'RESERVATION_CONFIRMED' ELSE paymentStatus END
    WHERE bookingCode = ?
  `;

  db.query(sql, [bookingCode], (err, result) => {
    if (err) {
      console.error('Failed confirming rental booking:', err);
      return res.status(500).json({ message: 'Failed confirming rental booking.' });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Rental booking not found.' });
    }
    return res.status(200).json({ message: 'Rental booking confirmed.' });
  });
};
