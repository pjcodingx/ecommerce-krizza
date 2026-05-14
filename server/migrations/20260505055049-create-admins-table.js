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
  return db.createTable('admins', {
    id: { type: 'int', primaryKey: true, autoIncrement: true },
    username: { type: 'string', notNull: true, unique: true },
    password: { type: 'string', notNull: true }
  }).then(() => {
    // Let's insert a default admin user directly
    return db.insert('admins', ['username', 'password'], ['admin', 'admin123']);
  });
};

exports.down = function(db) {
  return db.dropTable('admins');
};

exports._meta = {
  "version": 1
};
