const db = require('../config/db');

exports.getAllOrders = (req, res) => {
  const sql = 'SELECT * FROM orders ORDER BY createdAt DESC';
  db.query(sql, (err, orderRows) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ message: 'Failed to fetch orders' });
    }

    if (!orderRows.length) {
      return res.status(200).json([]);
    }

    const orderIds = orderRows.map((order) => order.id);
    const itemSql = 'SELECT * FROM order_items WHERE orderId IN (?) ORDER BY id ASC';
    db.query(itemSql, [orderIds], (itemErr, itemRows) => {
      if (itemErr) {
        console.error('Error fetching order items:', itemErr);
        return res.status(500).json({ message: 'Failed to fetch order items' });
      }

      const itemsByOrderId = itemRows.reduce((acc, item) => {
        if (!acc[item.orderId]) acc[item.orderId] = [];
        acc[item.orderId].push({
          id: item.productId,
          name: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          subtotal: Number(item.subtotal)
        });
        return acc;
      }, {});

      const orders = orderRows.map((order) => ({
        id: order.orderCode,
        customerName: order.customerName,
        messenger: order.messenger,
        paymentMethod: order.paymentMethod,
        receiptFileName: order.receiptFileName || 'N/A',
        receiptUrl: order.receiptUrl || null,
        agreedToTerms: Boolean(order.agreedToTerms),
        status: order.status || 'PENDING',
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        items: itemsByOrderId[order.id] || []
      }));

      return res.status(200).json(orders);
    });
  });
};

exports.createOrder = (req, res) => {
  let parsedItems = req.body.items;
  if (typeof req.body.items === 'string') {
    try {
      parsedItems = JSON.parse(req.body.items);
    } catch (error) {
      return res.status(400).json({ message: 'Invalid items payload format.' });
    }
  }
  const orderCode = req.body.orderCode;
  const customerName = req.body.customerName;
  const messenger = req.body.messenger;
  const paymentMethod = req.body.paymentMethod;
  const agreedToTerms = req.body.agreedToTerms === 'true' || req.body.agreedToTerms === true;
  const totalAmount = req.body.totalAmount;
  const receiptUrl = req.file ? `/uploads/receipts/${req.file.filename}` : null;
  const receiptFileName = req.file ? req.file.originalname : null;

  if (!customerName || !messenger || !paymentMethod || !Array.isArray(parsedItems) || parsedItems.length === 0) {
    return res.status(400).json({ message: 'Missing required order details.' });
  }

  if (!agreedToTerms) {
    return res.status(400).json({ message: 'Terms agreement is required.' });
  }

  if (paymentMethod === 'GCASH' && !receiptUrl) {
    return res.status(400).json({ message: 'GCash receipt is required.' });
  }

  const finalOrderCode = orderCode || `ORD-${Date.now()}`;
  const safeTotal = Number(totalAmount || 0);
  const orderSql = `
    INSERT INTO orders (orderCode, customerName, messenger, paymentMethod, receiptFileName, receiptUrl, agreedToTerms, totalAmount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `;

  db.query(
    orderSql,
    [finalOrderCode, customerName, messenger, paymentMethod, receiptFileName || null, receiptUrl, agreedToTerms ? 1 : 0, safeTotal],
    (orderErr, orderResult) => {
      if (orderErr) {
        console.error('Error creating order:', orderErr);
        return res.status(500).json({ message: 'Failed to create order' });
      }

      const orderId = orderResult.insertId;
      const itemValues = parsedItems.map((item) => [
        orderId,
        item.id || null,
        item.name,
        Number(item.quantity || 0),
        Number(item.unitPrice || 0),
        Number(item.subtotal || 0)
      ]);

      const itemsSql = `
        INSERT INTO order_items (orderId, productId, productName, quantity, unitPrice, subtotal)
        VALUES ?
      `;

      db.query(itemsSql, [itemValues], (itemErr) => {
        if (itemErr) {
          console.error('Error creating order items:', itemErr);
          return res.status(500).json({ message: 'Failed to save order items' });
        }

        return res.status(201).json({ message: 'Order created successfully', id: finalOrderCode });
      });
    }
  );
};

exports.confirmOrder = (req, res) => {
  const { orderCode } = req.params;
  const sql = 'UPDATE orders SET status = ? WHERE orderCode = ?';
  db.query(sql, ['CONFIRMED', orderCode], (err, result) => {
    if (err) {
      console.error('Error confirming order:', err);
      return res.status(500).json({ message: 'Failed to confirm order' });
    }
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.status(200).json({ message: 'Order confirmed' });
  });
};

exports.deleteOrder = (req, res) => {
  const { orderCode } = req.params;
  const getOrderSql = 'SELECT id FROM orders WHERE orderCode = ? LIMIT 1';

  db.query(getOrderSql, [orderCode], (findErr, rows) => {
    if (findErr) {
      console.error('Error finding order:', findErr);
      return res.status(500).json({ message: 'Failed to find order' });
    }
    if (!rows.length) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const orderId = rows[0].id;
    db.query('DELETE FROM order_items WHERE orderId = ?', [orderId], (itemErr) => {
      if (itemErr) {
        console.error('Error deleting order items:', itemErr);
        return res.status(500).json({ message: 'Failed to delete order items' });
      }

      db.query('DELETE FROM orders WHERE id = ?', [orderId], (orderErr) => {
        if (orderErr) {
          console.error('Error deleting order:', orderErr);
          return res.status(500).json({ message: 'Failed to delete order' });
        }
        return res.status(200).json({ message: 'Order deleted successfully' });
      });
    });
  });
};
