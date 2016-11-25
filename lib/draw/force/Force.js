'use strict';

var d3 = require('d3');

/**
 * The D3 force handler.
 *
 * @class
 * @constructor
 *
 * @param {Object} options
 * @param {EventBus} eventBus
 */
function Force(canvas, eventBus, nodes) {

  this._force = {};

  this._canvas = canvas;
  this._eventBus = eventBus;
  this._nodes = nodes;

  this._init();
}

Force.$inject = [ 'canvas', 'eventBus', 'nodes' ];

module.exports = Force;

Force.prototype._init = function() {

  var that = this;

  this._force = d3.forceSimulation(this._nodes._nodes);

  this._links = d3.forceLink(this._nodes._links);

  this._force.on('tick', function(){
    that._eventBus.emit('force.tick');
    //that._force.stop();
  });

  that._eventBus.emit('force.init');
};