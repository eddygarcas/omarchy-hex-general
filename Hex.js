.pragma library

// Hex-grid math, pointy-top hexes. Two coordinate systems:
//   axial (q, r)      -- what the engine uses: distance, neighbours, paths
//   offset (col, row) -- "odd-r" rectangular layout (odd rows shifted right),
//                        what the scenario is authored in and the map is drawn as
// See redblobgames.com/grids/hexagons for the derivations.

function cube(q, r) {
  return { x: q, y: -q - r, z: r }
}

function cubeDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z))
}

function distance(a, b) {
  return cubeDistance(cube(a.q, a.r), cube(b.q, b.r))
}

var DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]]

function neighbors(q, r) {
  var out = []
  for (var i = 0; i < DIRS.length; i++)
    out.push({ q: q + DIRS[i][0], r: r + DIRS[i][1] })
  return out
}

function key(q, r) {
  return q + "," + r
}

function parseKey(k) {
  var parts = k.split(",")
  return { q: parseInt(parts[0], 10), r: parseInt(parts[1], 10) }
}

function offsetToAxial(col, row) {
  return { q: col - (row - (row & 1)) / 2, r: row }
}

function axialToOffset(q, r) {
  return { col: q + (r - (r & 1)) / 2, row: r }
}

// axial -> pixel centre, origin at hex (0,0)'s centre
function toPixel(q, r, size) {
  return {
    x: size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r),
    y: size * (1.5 * r)
  }
}

function axialRound(qf, rf) {
  var c = cube(qf, rf)
  var rx = Math.round(c.x), ry = Math.round(c.y), rz = Math.round(c.z)
  var dx = Math.abs(rx - c.x), dy = Math.abs(ry - c.y), dz = Math.abs(rz - c.z)
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy > dz) ry = -rx - rz
  else rz = -rx - ry
  return { q: rx, r: rz }
}

// pixel -> nearest axial hex
function fromPixel(x, y, size) {
  var qf = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size
  var rf = (2 / 3 * y) / size
  return axialRound(qf, rf)
}

// Corner points of a hex centred at (cx, cy), pointy-top orientation.
function corners(cx, cy, size) {
  var pts = []
  for (var i = 0; i < 6; i++) {
    var angle = Math.PI / 180 * (60 * i - 30)
    pts.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) })
  }
  return pts
}
