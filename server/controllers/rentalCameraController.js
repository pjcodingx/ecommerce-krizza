const db = require('../config/db');

const mapCamera = (row) => ({
  id: row.id,
  name: row.name,
  dailyRate: Number(row.dailyRate),
  details: row.details || '',
  terms: row.terms || '',
  coverImageUrl: row.coverImageUrl || '',
  isActive: Boolean(row.isActive),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt
});

const getCamerasWithSamples = (isAdmin, callback) => {
  const sql = isAdmin
    ? 'SELECT * FROM rental_cameras ORDER BY createdAt DESC'
    : 'SELECT * FROM rental_cameras WHERE isActive = 1 ORDER BY createdAt DESC';

  db.query(sql, (err, cameraRows) => {
    if (err) return callback(err);
    if (!cameraRows.length) return callback(null, []);

    const cameraIds = cameraRows.map((camera) => camera.id);
    db.query(
      'SELECT * FROM rental_camera_samples WHERE cameraId IN (?) ORDER BY sortOrder ASC, id ASC',
      [cameraIds],
      (sampleErr, sampleRows) => {
        if (sampleErr) return callback(sampleErr);
        const sampleMap = sampleRows.reduce((acc, sample) => {
          if (!acc[sample.cameraId]) acc[sample.cameraId] = [];
          acc[sample.cameraId].push(sample.imageUrl);
          return acc;
        }, {});

        const payload = cameraRows.map((row) => ({
          ...mapCamera(row),
          samplePhotos: sampleMap[row.id] || []
        }));

        return callback(null, payload);
      }
    );
  });
};

exports.getPublicRentalCameras = (req, res) => {
  getCamerasWithSamples(false, (err, cameras) => {
    if (err) {
      console.error('Failed to fetch rental cameras:', err);
      return res.status(500).json({ message: 'Failed to fetch rental cameras.' });
    }
    return res.status(200).json(cameras);
  });
};

exports.getAdminRentalCameras = (req, res) => {
  getCamerasWithSamples(true, (err, cameras) => {
    if (err) {
      console.error('Failed to fetch admin rental cameras:', err);
      return res.status(500).json({ message: 'Failed to fetch rental cameras.' });
    }
    return res.status(200).json(cameras);
  });
};

exports.createRentalCamera = (req, res) => {
  const { name, dailyRate, details, terms, isActive } = req.body;
  const coverImage = req.files?.coverImage?.[0];
  const sampleShots = req.files?.sampleShots || [];

  if (!name || dailyRate === undefined || dailyRate === '' || !terms) {
    return res.status(400).json({ message: 'Camera name, daily rate, and terms are required.' });
  }

  const coverImageUrl = coverImage ? `/uploads/rentals/covers/${coverImage.filename}` : null;
  const sql = `
    INSERT INTO rental_cameras (name, dailyRate, details, terms, coverImageUrl, isActive)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name.trim(), Number(dailyRate), details || '', terms.trim(), coverImageUrl, isActive === false || isActive === 'false' ? 0 : 1],
    (err, result) => {
      if (err) {
        console.error('Failed to create rental camera:', err);
        return res.status(500).json({ message: 'Failed to create rental camera.' });
      }

      if (!sampleShots.length) {
        return res.status(201).json({ message: 'Rental camera created.', id: result.insertId });
      }

      const sampleValues = sampleShots.map((file, index) => [result.insertId, `/uploads/rentals/samples/${file.filename}`, index]);
      db.query(
        'INSERT INTO rental_camera_samples (cameraId, imageUrl, sortOrder) VALUES ?',
        [sampleValues],
        (sampleErr) => {
          if (sampleErr) {
            console.error('Failed to save sample shots:', sampleErr);
            return res.status(500).json({ message: 'Failed to save camera sample shots.' });
          }
          return res.status(201).json({ message: 'Rental camera created.', id: result.insertId });
        }
      );
    }
  );
};

exports.updateRentalCamera = (req, res) => {
  const { id } = req.params;
  const { name, dailyRate, details, terms, isActive } = req.body;
  const coverImage = req.files?.coverImage?.[0];
  const sampleShots = req.files?.sampleShots || [];

  const coverImageClause = coverImage ? ', coverImageUrl = ?' : '';
  const values = [
    String(name || '').trim(),
    Number(dailyRate || 0),
    details || '',
    String(terms || '').trim(),
    isActive === true || isActive === 'true' ? 1 : 0
  ];
  if (coverImage) values.push(`/uploads/rentals/covers/${coverImage.filename}`);
  values.push(id);

  const sql = `
    UPDATE rental_cameras
    SET name = ?, dailyRate = ?, details = ?, terms = ?, isActive = ?
    ${coverImageClause}
    WHERE id = ?
  `;

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Failed to update rental camera:', err);
      return res.status(500).json({ message: 'Failed to update rental camera.' });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Rental camera not found.' });
    }

    if (!sampleShots.length) {
      return res.status(200).json({ message: 'Rental camera updated.' });
    }

    db.query('DELETE FROM rental_camera_samples WHERE cameraId = ?', [id], (deleteErr) => {
      if (deleteErr) {
        console.error('Failed replacing sample shots:', deleteErr);
        return res.status(500).json({ message: 'Failed to update camera sample shots.' });
      }
      const sampleValues = sampleShots.map((file, index) => [id, `/uploads/rentals/samples/${file.filename}`, index]);
      db.query(
        'INSERT INTO rental_camera_samples (cameraId, imageUrl, sortOrder) VALUES ?',
        [sampleValues],
        (sampleErr) => {
          if (sampleErr) {
            console.error('Failed saving replacement sample shots:', sampleErr);
            return res.status(500).json({ message: 'Failed to update camera sample shots.' });
          }
          return res.status(200).json({ message: 'Rental camera updated.' });
        }
      );
    });
  });
};

exports.deleteRentalCamera = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM rental_cameras WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Failed to delete rental camera:', err);
      return res.status(500).json({ message: 'Failed to delete rental camera.' });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Rental camera not found.' });
    }
    return res.status(200).json({ message: 'Rental camera deleted.' });
  });
};
