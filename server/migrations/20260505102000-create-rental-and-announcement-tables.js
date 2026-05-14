'use strict';

var dbm;
var type;
var seed;

exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('announcements', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    title: { type: 'string', length: 255, notNull: true },
    content: { type: 'text', notNull: true },
    isActive: { type: 'boolean', notNull: true, defaultValue: true },
    createdAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP') },
    updatedAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
  })
    .then(function() {
      return db.createTable('rental_cameras', {
        id: { type: 'int', primaryKey: true, autoIncrement: true },
        name: { type: 'string', length: 255, notNull: true },
        dailyRate: { type: 'decimal', precision: 10, scale: 2, notNull: true },
        details: { type: 'text' },
        terms: { type: 'text', notNull: true },
        coverImageUrl: { type: 'string', length: 255 },
        isActive: { type: 'boolean', notNull: true, defaultValue: true },
        createdAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP') },
        updatedAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    })
    .then(function() {
      return db.createTable('rental_camera_samples', {
        id: { type: 'int', primaryKey: true, autoIncrement: true },
        cameraId: { type: 'int', notNull: true },
        imageUrl: { type: 'string', length: 255, notNull: true },
        sortOrder: { type: 'int', notNull: true, defaultValue: 0 }
      });
    })
    .then(function() {
      return db.addForeignKey('rental_camera_samples', 'rental_cameras', 'fk_sample_camera', { cameraId: 'id' }, {
        onDelete: 'CASCADE',
        onUpdate: 'RESTRICT'
      });
    })
    .then(function() {
      return db.createTable('rental_bookings', {
        id: { type: 'int', primaryKey: true, autoIncrement: true },
        bookingCode: { type: 'string', length: 80, notNull: true, unique: true },
        cameraId: { type: 'int', notNull: true },
        customerName: { type: 'string', length: 255, notNull: true },
        contact: { type: 'string', length: 255, notNull: true },
        startDate: { type: 'date', notNull: true },
        endDate: { type: 'date', notNull: true },
        returnDateTime: { type: 'datetime', notNull: true },
        rentalDays: { type: 'int', notNull: true },
        totalFee: { type: 'decimal', precision: 10, scale: 2, notNull: true },
        paymentMethod: { type: 'string', length: 30, notNull: true },
        paymentStatus: { type: 'string', length: 30, notNull: true, defaultValue: 'PENDING' },
        reservationReceiptUrl: { type: 'string', length: 255 },
        status: { type: 'string', length: 30, notNull: true, defaultValue: 'PENDING' },
        termsAccepted: { type: 'boolean', notNull: true, defaultValue: false },
        createdAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP') },
        updatedAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
      });
    })
    .then(function() {
      return db.addForeignKey('rental_bookings', 'rental_cameras', 'fk_booking_camera', { cameraId: 'id' }, {
        onDelete: 'RESTRICT',
        onUpdate: 'RESTRICT'
      });
    })
    .then(function() {
      return db.addIndex('rental_bookings', 'idx_booking_camera_range', ['cameraId', 'startDate', 'endDate']);
    });
};

exports.down = function(db) {
  return db.removeIndex('rental_bookings', 'idx_booking_camera_range')
    .then(function() {
      return db.removeForeignKey('rental_bookings', 'fk_booking_camera');
    })
    .then(function() {
      return db.dropTable('rental_bookings');
    })
    .then(function() {
      return db.removeForeignKey('rental_camera_samples', 'fk_sample_camera');
    })
    .then(function() {
      return db.dropTable('rental_camera_samples');
    })
    .then(function() {
      return db.dropTable('rental_cameras');
    })
    .then(function() {
      return db.dropTable('announcements');
    });
};

exports._meta = {
  version: 1
};
