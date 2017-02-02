'use strict';

var inherits = require('inherits'),
  base = require('../base'),
  forEach = require('lodash/collection').forEach,
  sortBy = require('lodash/collection').sortBy;

function Links(definitions, moddle, links, eventBus, elementRegistry) {
  base.call(this, definitions, links);
  this._moddle = moddle;
  this._links = links;
  this._eventBus = eventBus;
  this._elementRegistry = elementRegistry;
  this.init();
}

Links.$inject = [
  'd3polytree.definitions',
  'd3polytree.moddle',
  'links',
  'eventBus',
  'elementRegistry'
];

module.exports = Links;

inherits(Links, base);

Links.prototype.create = function (nodeADef, nodeBDef) {
  var x = nodeADef.position.x + (nodeADef.size / 2),
    y = nodeADef.position.y + (nodeADef.size / 2),
    x1 = nodeBDef.position.x + (nodeBDef.size / 2),
    y1 = nodeBDef.position.y + (nodeBDef.size / 2);
  
  var waypoint1 = this._moddle.create('pfdn:Coordinates', {x, y}),
    waypoint2 = this._moddle.create('pfdn:Coordinates', {x: x1, y: y1}),
    newLinkDef = this._moddle.create('pfdn:Link', {
      source: nodeADef,
      target: nodeBDef,
      waypoint: [
        waypoint1,
        waypoint2
      ]
    });
  this._links._builder(newLinkDef);
  // return the element
  return newLinkDef;
};

Links.prototype.init = function () {
  var that = this;
  this._eventBus.on('node.moved', function (element, definition) {
    that.updateNodeLinks(element, definition);
  });
};

Links.prototype._calculateAngle = function (a, b) {
  // angle between 2 vectors (lines)
  var dotProduct = (a.x * b.x) + (a.y * b.y);
  var vectorAModule = Math.sqrt(Math.pow(a.x, 2) + Math.pow(a.y, 2));
  var vectorBModule = Math.sqrt(Math.pow(b.x, 2) + Math.pow(b.y, 2));
  return Math.acos(dotProduct / (vectorAModule * vectorBModule));
};

Links.prototype._sortSide = function (sides, sideIdx, s) {
  // set reference vector and angle factor
  var vector = {x: 1, y: 1},
    factor = 1.0,
    that = this;
  if (sideIdx === 0) {
    vector.x = -1.0;
  } else if (sideIdx === 1) {
    factor = -1.0;
  } else if (sideIdx === 2) {
    vector.y = -1.0;
  } else if (sideIdx === 3) {
    vector.x = -1.0;
    vector.y = -1.0;
    factor = -1.0;
  }
  return sortBy(sides[sideIdx], function (o) {
    var vectorB = {
      x: o.pos.x - s.x,
      y: o.pos.y - s.y
    };
    return factor * that._calculateAngle(vector, vectorB);
  });
};

Links.prototype._setQuadrants = function (sides, s, t, toSave, isTarget) {
  
  var sideIdx = false;
  if (t.x >= s.x && t.y >= s.y) {
    if (Math.abs(t.x - s.x) >= Math.abs(t.y - s.y)) {
      // left side
      sideIdx = 3;
      if (isTarget && Math.abs(t.y - s.y) > 80)
        sideIdx = 0;
    } else {
      // upside
      sideIdx = 0;
      if (isTarget && Math.abs(t.x - s.x) > 80)
        sideIdx = 3;
    }
  } else if (t.x < s.x && t.y >= s.y) {
    if (Math.abs(t.x - s.x) >= Math.abs(t.y - s.y)) {
      // right side
      sideIdx = 1;
      if (isTarget && Math.abs(t.y - s.y) > 80)
        sideIdx = 0;
    } else {
      // upside
      sideIdx = 0;
      if (isTarget && Math.abs(t.x - s.x) > 80)
        sideIdx = 1;
    }
  } else if (t.x >= s.x && t.y < s.y) {
    if (Math.abs(t.x - s.x) >= Math.abs(t.y - s.y)) {
      // right side
      sideIdx = 3;
      if (isTarget && Math.abs(t.y - s.y) > 80)
        sideIdx = 2;
    } else {
      // downside
      sideIdx = 2;
      if (isTarget && Math.abs(t.x - s.x) > 80)
        sideIdx = 3;
    }
  } else if (t.x < s.x && t.y < s.y) {
    if (Math.abs(t.x - s.x) >= Math.abs(t.y - s.y)) {
      // right side
      sideIdx = 1;
      if (isTarget && Math.abs(t.y - s.y) > 80)
        sideIdx = 2;
    } else {
      // downside
      sideIdx = 2;
      if (isTarget && Math.abs(t.x - s.x) > 80)
        sideIdx = 1;
    }
  }
  
  if (sideIdx === false) {
    return;
  }
  sides[sideIdx].push({
    obj: toSave,
    pos: s
  });
  sides[sideIdx] = this._sortSide(sides, sideIdx, t);
  
};

Links.prototype._setSideConnectors = function (definition, isTarget) {
  var sides = [[], [], [], []],
    that = this,
    element = this._elementRegistry.get(definition.id);
  if (element) {
    this._fillPredAndSuc(element, definition);
    forEach(element.predecessorList, function (link) {
      var nodeLink = that._elementRegistry.get(link.id);
      that._setQuadrants(sides, nodeLink.data()[0].source.position, definition.position, link.id, isTarget);
    });
    forEach(element.adjacencyList, function (link) {
      var nodeLink = that._elementRegistry.get(link.id);
      that._setQuadrants(sides, nodeLink.data()[0].target.position, definition.position, link.id, false);
    });
    element.sides = sides;
  }
};

Links.prototype.updateNodeLinks = function (element, definition) {
  var that = this;
  
  // update the positions of the links related to the node.
  this._fillPredAndSuc(element, definition);
  
  forEach(element.predecessorList, function (link) {
    that._updateLink(link);
  });
  forEach(element.sucessorList, function (link) {
    that._updateLink(link);
  });
};

Links.prototype._createWaypoint = function(x, y) {
  return this._moddle.create('pfdn:Coordinates', {x, y});
};

Links.prototype._updateLink = function (link) {
  // update the positions of the links related to the node.
  this._setSideConnectors(link.source, false);
  this._setSideConnectors(link.target, true);
  
  var sourcePoint = {x: link.source.position.x, y: link.source.position.y},
    targetPoint = {x: link.target.position.x, y: link.target.position.y},
    sourceElem = this._elementRegistry.get(link.source.id),
    targetElem = this._elementRegistry.get(link.target.id),
    sourceSide = {idx: 0},
    targetSide = {idx: 0},
    waypoints = [],
    curve1RefPoint = false,
    curve2RefPoint = false,
    midPoint = false;
  
  this._adjustSidePoint(sourcePoint, sourceElem.sides, link.id,  link.source.size, sourceSide);
  this._adjustSidePoint(targetPoint, targetElem.sides, link.id,  link.target.size, targetSide);
  
  waypoints.push(this._createWaypoint(sourcePoint.x, sourcePoint.y));
  if (sourceSide.idx === 1 || sourceSide.idx === 3){
    // source point starts from left or right
    if (targetSide.idx === 0 || targetSide.idx === 2){
      // target point arrives to top or bottom, draw a curve line
      curve1RefPoint = {
        x: targetPoint.x,
        y: sourcePoint.y
      };
    } else {
      if (Math.abs(sourcePoint.y - targetPoint.y) > 20) {
        // if distance allows to create a quadratic bezier curve, then draw it; else, show a straight line
        midPoint = {
          x: (targetPoint.x + sourcePoint.x) / 2,
          y: (targetPoint.y + sourcePoint.y) / 2
        };
        curve1RefPoint = {
          x: midPoint.x,
          y: sourcePoint.y
        };
        curve2RefPoint = {
          x: midPoint.x,
          y: targetPoint.y
        };
      }
    }
  } else {
    // source point starts from top or bottom
    if (targetSide.idx === 1 || targetSide.idx === 3){
      // target point arrives to left or right, draw a curve line
      curve1RefPoint = {
        x: sourcePoint.x,
        y: targetPoint.y
      };
    } else {
      if (Math.abs(sourcePoint.x - targetPoint.x) > 20) {
        // if distance allows to create a quadratic bezier curve, then draw it; else, show a straight line
        midPoint = {
          x: (targetPoint.x + sourcePoint.x) / 2,
          y: (targetPoint.y + sourcePoint.y) / 2
        };
        curve1RefPoint = {
          x: sourcePoint.x,
          y: midPoint.y
        };
        curve2RefPoint = {
          x: targetPoint.x,
          y: midPoint.y
        };
      }
    }
  }
  
  if (curve2RefPoint !== false){
    waypoints.push(this._createWaypoint(curve1RefPoint.x, curve1RefPoint.y));
  }
  if (curve2RefPoint !== false){
    waypoints.push(this._createWaypoint(curve2RefPoint.x, curve2RefPoint.y));
  }
  waypoints.push(this._createWaypoint(targetPoint.x, targetPoint.y));
  
  link.waypoint = waypoints;
  this._links._builder(link);
  this._links._redrawAll();
  console.log(link);
  console.log(waypoints);
  
};

Links.prototype._adjustSidePoint = function(point, sides, referencePoint, elemSize, saveIndex){
  var found = false;
  forEach(sides, function(side, sideIdx){
    var sideLen = side.length;
    if (found || sideLen===0){return;}
    var distBtwArrows = elemSize * 0.8 / (sideLen + 1);
    var origin = (elemSize / 2.0) - (distBtwArrows * (sideLen + 1) / 2);
    forEach(side, function(v) {
      origin += distBtwArrows;
      console.log(v.obj, referencePoint);
      if (v.obj === referencePoint){
        console.log(true, sideIdx);
        saveIndex.idx = sideIdx;
        if (sideIdx === 0) {
          point.x += origin;
          //point.y -= elemSize / 2.0;
        } else if (sideIdx === 1) {
          point.x += 3.0 * elemSize / 2.0;
          point.y += origin;
        } else if (sideIdx === 2) {
          point.x += origin;
          point.y += 3.0 * elemSize / 2.0;
        } else if (sideIdx === 3) {
          //point.x += elemSize / 2.0;
          point.y += origin;
        }
        found = true;
      }
    });
  });
};

Links.prototype._fillPredAndSuc = function (element, definition) {
  element.predecessorList = [];
  element.sucessorList = [];
  
  forEach(this._links.getAll(), function (link) {
    if (link.target === definition) {
      element.predecessorList.push(link);
    }
    if (link.source === definition) {
      element.sucessorList.push(link);
    }
  });
};
