const db = require('../config/db');

exports.getAnnouncements = (req, res) => {
  const onlyActive = req.query.active === 'true';
  const sql = onlyActive
    ? 'SELECT * FROM announcements WHERE isActive = 1 ORDER BY createdAt DESC'
    : 'SELECT * FROM announcements ORDER BY createdAt DESC';

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('Failed to fetch announcements:', err);
      return res.status(500).json({ message: 'Failed to fetch announcements.' });
    }

    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
    return res.status(200).json(data);
  });
};

exports.createAnnouncement = (req, res) => {
  const { title, content, isActive } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }

  const sql = 'INSERT INTO announcements (title, content, isActive) VALUES (?, ?, ?)';
  db.query(sql, [title.trim(), content.trim(), isActive === false || isActive === 'false' ? 0 : 1], (err, result) => {
    if (err) {
      console.error('Failed to create announcement:', err);
      return res.status(500).json({ message: 'Failed to create announcement.' });
    }
    return res.status(201).json({ message: 'Announcement created.', id: result.insertId });
  });
};

exports.updateAnnouncement = (req, res) => {
  const { id } = req.params;
  const { title, content, isActive } = req.body;

  const sql = `
    UPDATE announcements
    SET title = ?, content = ?, isActive = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [String(title || '').trim(), String(content || '').trim(), isActive === true || isActive === 'true' ? 1 : 0, id],
    (err, result) => {
      if (err) {
        console.error('Failed to update announcement:', err);
        return res.status(500).json({ message: 'Failed to update announcement.' });
      }
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Announcement not found.' });
      }
      return res.status(200).json({ message: 'Announcement updated.' });
    }
  );
};

exports.deleteAnnouncement = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM announcements WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('Failed to delete announcement:', err);
      return res.status(500).json({ message: 'Failed to delete announcement.' });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Announcement not found.' });
    }
    return res.status(200).json({ message: 'Announcement deleted.' });
  });
};
