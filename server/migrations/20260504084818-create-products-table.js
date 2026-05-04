'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.createTable('products', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    name: { type: 'string', length: 255, notNull: true },
    description: { type: 'text' },
    price: { type: 'decimal', precision: 10, scale: 2, notNull: true },
    stock: { type: 'int', notNull: true },
    category: { type: 'string', length: 50 }, // In a real app, this might be a foreign key
    type: { type: 'string', length: 50 }, // e.g., 'For Sale', 'For Rent'
    imageUrl: { type: 'string', length: 255 },
    createdAt: { type: 'timestamp', defaultValue: new String('CURRENT_TIMESTAMP') }
  });
};

exports.down = function(db) {
  return db.dropTable('products');
};

exports._meta = {
  "version": 1
};
