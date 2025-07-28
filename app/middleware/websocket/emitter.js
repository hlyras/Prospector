const { EventEmitter } = require('events');
const wsEmitter = new EventEmitter();
module.exports = wsEmitter;