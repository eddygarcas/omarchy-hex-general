.pragma library

// Pixel sprites of the units, 48 x 24, side view facing right, rasterised
// from shape definitions the way a sprite tool would: a stack of shapes
// in a fixed palette, then a dark outline, a lit top edge and a shadowed
// underside are applied pixel by pixel. Each formation's sprite is what it
// actually fielded in the Ardennes, December 1944. Drawn at an integer
// pixel scale so they stay crisp when zoomed.
//
// Palette letters: K outline, B body, M body mid, D body shadow, L lit
// edge, T track/tyre, W road wheel, V wheel hub, G gun, X white, S skin,
// H helmet, U uniform, Y wood, C canvas, N glass, R red.

var WIDTH = 48, HEIGHT = 24

var PALETTES = {
  axis: {   // dunkelgelb under winter whitewash
    K: "#141410", B: "#8a8570", M: "#6f6b58", D: "#4d4a3c", L: "#b4ae96", T: "#2b2a25", W: "#6a685f", V: "#a9a79c",
    G: "#3c3b36", X: "#f2f2ec", S: "#d9b596", H: "#4e5048", U: "#5f6350", Y: "#8a6a3c", C: "#a89f86", N: "#9fb7c6", R: "#b3261e"
  },
  allies: { // olive drab
    K: "#141410", B: "#66733f", M: "#4d5730", D: "#333a1f", L: "#8b9963", T: "#2b2a25", W: "#5d5c52", V: "#9c9a8e",
    G: "#3c3b36", X: "#f2f2ec", S: "#d9b596", H: "#4e5a36", U: "#6b7047", Y: "#8a6a3c", C: "#8c8a68", N: "#9fb7c6", R: "#b3261e"
  }
}

// ---------------------------------------------------------- shape helpers
function poly(tone, pts) { return { kind: "poly", tone: tone, pts: pts } }
function rect(tone, x, y, w, h) { return { kind: "poly", tone: tone, pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] } }
function circle(tone, cx, cy, r) { return { kind: "circle", tone: tone, cx: cx, cy: cy, r: r } }
// Thick line as a polygon.
function bar(tone, x0, y0, x1, y1, w) {
  var dx = x1 - x0, dy = y1 - y0, len = Math.sqrt(dx * dx + dy * dy) || 1
  var nx = -dy / len * w / 2, ny = dx / len * w / 2
  return poly(tone, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]])
}
function wheel(cx, cy, r) { return [circle("K", cx, cy, r + 0.6), circle("W", cx, cy, r), circle("V", cx, cy, Math.max(0.6, r * 0.35))] }
function track(x0, x1, y0, y1) {
  var out = [rect("T", x0, y0, x1 - x0, y1 - y0)]
  for (var x = x0 + 1; x < x1 - 1; x += 2) out.push(rect("K", x, y1 - 1.2, 0.9, 0.9))   // track links
  return out
}
function gun(x0, y0, x1, y1, w, brake) {
  var out = [bar("G", x0, y0, x1, y1, w)]
  if (brake) out.push(bar("K", x1 - 2.2, y1 + (y1 - y0) * 0.02, x1, y1, w * 1.9))
  return out
}
function cross(x, y) { return [rect("K", x - 2, y - 0.6, 4, 1.2), rect("K", x - 0.6, y - 2, 1.2, 4), rect("X", x - 1.5, y - 0.35, 3, 0.7), rect("X", x - 0.35, y - 1.5, 0.7, 3)] }
function star(x, y) { return [rect("X", x - 2.2, y - 0.5, 4.4, 1), rect("X", x - 0.5, y - 2.2, 1, 4.4), rect("X", x - 1.5, y - 1.5, 3, 3)] }

function concat() { var out = []; for (var i = 0; i < arguments.length; i++) out = out.concat(arguments[i]); return out }

// Infantryman at (x, base y = feet). Helmet: "stahl" | "m1" | "fj" | "para".
function soldier(x, y, helmet, weapon) {
  var s = []
  s.push(rect("U", x - 1.4, y - 6, 1.2, 6), rect("U", x + 0.2, y - 6, 1.2, 6))          // legs
  s.push(poly("U", [[x - 2.2, y - 6], [x - 1.8, y - 12], [x + 1.8, y - 12], [x + 2.2, y - 6]])) // torso
  s.push(rect("S", x - 1, y - 14, 2, 2.2))                                                  // face
  if (helmet === "stahl") s.push(poly("H", [[x - 2.6, y - 13.6], [x - 2.2, y - 15.6], [x - 1, y - 16.6], [x + 1, y - 16.6], [x + 2.2, y - 15.6], [x + 2.6, y - 13.6], [x + 1.6, y - 13.2], [x - 1.6, y - 13.2]]))
  else if (helmet === "m1") s.push(circle("H", x, y - 15, 2.4), rect("H", x - 2.4, y - 15, 4.8, 1.3))
  else if (helmet === "fj") s.push(circle("H", x, y - 14.8, 2.2))
  else s.push(circle("H", x, y - 15, 2.4), rect("H", x - 2.4, y - 15, 4.8, 1.1), rect("K", x - 1.4, y - 12.6, 2.8, 0.5))
  if (weapon === "rifle") s.push(bar("G", x - 3.5, y - 5, x + 3.5, y - 11, 0.9))
  else if (weapon === "smg") s.push(bar("G", x - 1.5, y - 8, x + 3.8, y - 9.2, 1.1))
  else if (weapon === "mg") s.push(bar("G", x - 3, y - 7.5, x + 5, y - 9.5, 1.2), bar("K", x + 3.5, y - 9, x + 2.8, y - 6, 0.6), bar("K", x + 3.5, y - 9, x + 4.6, y - 6, 0.6))
  return s
}
function prone(x, y, helmet) {
  return [poly("U", [[x - 6, y], [x + 3, y], [x + 3.5, y - 2.4], [x - 5.5, y - 2.4]]),
          circle("H", x + 4.2, y - 2.2, 1.9), rect("S", x + 3.6, y - 1, 1.4, 1),
          bar("G", x + 4, y - 2.4, x + 11, y - 4, 1.1), bar("K", x + 9, y - 3.6, x + 8.4, y - 0.5, 0.6), bar("K", x + 9, y - 3.6, x + 10, y - 0.5, 0.6)]
}

// ------------------------------------------------------------ the sprites
// Coordinates: x 0..48 (front to the right), y 0..24 (ground at ~22).
var DEFS = {
  // Tiger II: long hull, sloped Henschel turret, 8.8 cm L/71, nine overlapping wheels.
  tigerII: concat(
    track(2, 46, 16, 22.5),
    wheel(5, 19.2, 2.2), wheel(9.5, 19.4, 2.6), wheel(14, 19.4, 2.6), wheel(18.5, 19.4, 2.6), wheel(23, 19.4, 2.6),
    wheel(27.5, 19.4, 2.6), wheel(32, 19.4, 2.6), wheel(36.5, 19.4, 2.6), wheel(41, 19.4, 2.6), wheel(44.6, 18.8, 2),
    [poly("B", [[1.5, 16.5], [1.5, 10.5], [5, 8.5], [39, 8.5], [46.5, 12], [46.5, 16.5]]),
     poly("M", [[39, 8.5], [46.5, 12], [46.5, 16.5], [37, 16.5]]),
     rect("D", 1.5, 15.2, 45, 1.3),
     poly("B", [[12, 8.5], [14.5, 2.5], [29, 2.5], [33.5, 8.5]]),
     poly("M", [[29, 2.5], [33.5, 8.5], [28, 8.5]]),
     rect("D", 15.5, 1.3, 4, 1.4), rect("D", 30.5, 4.2, 3.5, 3.6)],
    gun(33.5, 5.8, 48, 5.6, 1.5, true),
    cross(21, 12)),

  // Panther: sloped glacis, turret set back with a rounded mantlet, 7.5 cm L/70, interleaved wheels.
  panther: concat(
    track(2, 45, 16, 22.5),
    wheel(5, 19, 2.4), wheel(10, 19.2, 3), wheel(15.5, 19.2, 3), wheel(21, 19.2, 3), wheel(26.5, 19.2, 3), wheel(32, 19.2, 3), wheel(37.5, 19.2, 3), wheel(42.5, 18.6, 2.2),
    [poly("B", [[1.5, 16.5], [1.5, 11], [5, 8.5], [29, 8.5], [43, 12.5], [45.5, 16.5]]),
     poly("M", [[29, 8.5], [43, 12.5], [45.5, 16.5], [30, 16.5]]),
     rect("D", 1.5, 15.2, 44, 1.3),
     poly("B", [[11, 8.5], [14, 3], [26, 3], [29.5, 8.5]]),
     circle("D", 28.5, 6, 2.6), rect("D", 15, 1.8, 3.5, 1.4),
     rect("D", 3, 9.5, 6, 1.2)],
    gun(30, 6, 48, 5.6, 1.4, true),
    cross(19, 12)),

  // Panzer IV: boxy hull and superstructure, shorter 7.5 cm L/48, eight small wheels.
  pzIV: concat(
    track(4, 41, 16, 22.5),
    wheel(6, 19.5, 2), wheel(10, 19.8, 1.9), wheel(14, 19.8, 1.9), wheel(18, 19.8, 1.9), wheel(22, 19.8, 1.9), wheel(26, 19.8, 1.9), wheel(30, 19.8, 1.9), wheel(34, 19.8, 1.9), wheel(38.5, 19.2, 2.2),
    [poly("B", [[3, 16.5], [3, 10], [41.5, 10], [41.5, 16.5]]),
     rect("D", 3, 15.2, 38.5, 1.3),
     poly("B", [[6, 10], [6, 7.5], [35, 7.5], [37, 10]]),
     poly("B", [[13, 7.5], [14.5, 3], [27, 3], [30, 7.5]]),
     rect("D", 28, 4.5, 2.5, 3), rect("D", 16, 1.8, 3.5, 1.4),
     rect("M", 6, 8, 29, 0.8)],
    gun(30.5, 6, 45, 5.8, 1.3, true),
    cross(20, 12.5)),

  // SdKfz 251: open-topped armoured half-track, MG 34 forward.
  sdkfz251: concat(
    track(5, 29, 16, 22.5),
    wheel(8, 19.6, 2.1), wheel(12.5, 19.8, 2.1), wheel(17, 19.8, 2.1), wheel(21.5, 19.8, 2.1), wheel(26, 19.4, 2.1),
    wheel(39.5, 19.5, 3),
    [poly("B", [[5, 16.5], [5, 10.5], [9.5, 7.5], [30, 7.5], [33.5, 10.5], [38, 10.5], [44.5, 13], [44.5, 16.5]]),
     poly("M", [[33.5, 10.5], [38, 10.5], [44.5, 13], [44.5, 16.5], [33.5, 16.5]]),
     rect("D", 5, 15.2, 39.5, 1.3),
     rect("L", 10, 7, 19.5, 1.2),
     rect("D", 35, 11.5, 8, 2.2)],
    gun(26, 6.5, 32, 4.2, 1, false),
    cross(15, 12)),

  // SdKfz 234 Puma: eight-wheeled, low hull, small turret with the 5 cm gun.
  puma: concat(
    wheel(7.5, 18.8, 3), wheel(17.5, 18.8, 3), wheel(29, 18.8, 3), wheel(39.5, 18.8, 3),
    [poly("B", [[3, 16], [6, 10], [40, 10], [45.5, 13], [45.5, 16]]),
     poly("M", [[40, 10], [45.5, 13], [45.5, 16], [38, 16]]),
     rect("D", 3, 14.8, 42.5, 1.2),
     poly("B", [[16, 10], [18, 5.5], [28, 5.5], [30.5, 10]]),
     rect("D", 27.5, 7, 2.5, 3)],
    gun(30, 8.3, 40, 8, 1.1, true),
    cross(12, 12.8)),

  // Pak 40: shield, long barrel with muzzle brake, split trail.
  pak40: concat(
    [bar("M", 15, 14, 3, 20.5, 1.4), bar("M", 15, 14, 6, 21, 1.4),
     poly("B", [[14, 6], [24, 6], [26.5, 15], [12, 15]]),
     rect("D", 14, 13.5, 12.5, 1.5)],
    gun(19, 9.3, 47, 8.7, 1.5, true),
    wheel(14, 18.3, 2.9), wheel(26, 18.3, 2.9),
    [rect("D", 17.5, 7.5, 5, 2)]),

  // 10.5 cm leFH 18 howitzer: shield, spoked wheel, barrel raised, box trail.
  lefh18: concat(
    [bar("M", 15, 15, 3, 21, 1.6),
     poly("B", [[14, 8], [23, 8], [25, 16], [12, 16]]),
     rect("D", 14, 14.5, 11, 1.5)],
    [bar("G", 18, 11, 44, 1.5, 2.2), bar("K", 42, 2.5, 44, 1.5, 3.4)],
    wheel(18, 18, 3.6),
    [rect("D", 16, 9.5, 5, 2.5)]),

  // Nebelwerfer 41: six launcher tubes on a Pak 35/36 carriage.
  nebelwerfer: concat(
    [bar("M", 14, 16, 3, 21.5, 1.4),
     rect("B", 11, 14, 12, 3), rect("D", 11, 16, 12, 1.2),
     bar("G", 13, 15, 38, 3, 2.6), bar("G", 16, 16.5, 41, 4.5, 2.6), bar("G", 19, 18, 44, 6, 2.6),
     bar("K", 36, 4, 38, 3, 3), bar("K", 39, 5.5, 41, 4.5, 3), bar("K", 42, 7, 44, 6, 3)],
    wheel(12, 19, 2.8), wheel(22, 19, 2.8)),

  // Opel Blitz: canvas-tilted bed, flat-fronted cab.
  opelBlitz: concat(
    [rect("C", 3, 6, 27, 11), rect("K", 8, 6, 0.7, 11), rect("K", 14, 6, 0.7, 11), rect("K", 20, 6, 0.7, 11), rect("K", 26, 6, 0.7, 11),
     rect("D", 3, 16, 27, 1.5),
     poly("B", [[31, 18], [31, 7.5], [37.5, 7.5], [40, 11], [46.5, 11.5], [46.5, 18]]),
     rect("N", 32, 8.5, 4.5, 3.5), rect("D", 31, 16.5, 15.5, 1.5), rect("D", 41, 12.5, 5, 3),
     rect("M", 2, 17.5, 45, 1.5)],
    wheel(9, 19.8, 2.8), wheel(17, 19.8, 2.8), wheel(41, 19.8, 2.8)),

  // M4 Sherman (75 mm): tall hull, cast turret, three vertical-volute bogies.
  sherman: concat(
    track(3, 42, 15.5, 22.5),
    wheel(4.5, 18.8, 2), wheel(39.8, 18.4, 2.4),
    wheel(9, 20, 1.9), wheel(13, 20, 1.9), wheel(20, 20, 1.9), wheel(24, 20, 1.9), wheel(31, 20, 1.9), wheel(35, 20, 1.9),
    [rect("D", 8, 16.5, 6.5, 1.5), rect("D", 19, 16.5, 6.5, 1.5), rect("D", 30, 16.5, 6.5, 1.5),
     poly("B", [[3, 16], [3, 9], [6, 7], [31, 7], [40, 11], [42.5, 16]]),
     poly("M", [[31, 7], [40, 11], [42.5, 16], [31, 16]]),
     rect("D", 3, 14.7, 39, 1.3),
     poly("B", [[13, 7], [15, 2], [27, 2], [30.5, 7]]),
     circle("B", 26.5, 4.5, 3.2), circle("D", 28.5, 5.2, 2.2), rect("D", 17, 1, 3, 1.3)],
    gun(30.5, 5.2, 44.5, 5, 1.2, false),
    star(18, 11.5)),

  // M4A3 (76 mm): long gun with muzzle brake on the bigger turret.
  sherman76: concat(
    track(3, 42, 15.5, 22.5),
    wheel(4.5, 18.8, 2), wheel(39.8, 18.4, 2.4),
    wheel(9, 20, 1.9), wheel(13, 20, 1.9), wheel(20, 20, 1.9), wheel(24, 20, 1.9), wheel(31, 20, 1.9), wheel(35, 20, 1.9),
    [rect("D", 8, 16.5, 6.5, 1.5), rect("D", 19, 16.5, 6.5, 1.5), rect("D", 30, 16.5, 6.5, 1.5),
     poly("B", [[3, 16], [3, 9], [6, 7], [31, 7], [40, 11], [42.5, 16]]),
     poly("M", [[31, 7], [40, 11], [42.5, 16], [31, 16]]),
     rect("D", 3, 14.7, 39, 1.3),
     poly("B", [[12, 7], [13.5, 2], [28, 2], [31.5, 7]]),
     circle("D", 29, 5, 2.4), rect("D", 16, 1, 3, 1.3)],
    gun(31, 5.2, 48, 4.9, 1.2, true),
    star(18, 11.5)),

  // Sherman Firefly: 17-pounder, counterweight box on the turret rear.
  firefly: concat(
    track(3, 42, 15.5, 22.5),
    wheel(4.5, 18.8, 2), wheel(39.8, 18.4, 2.4),
    wheel(9, 20, 1.9), wheel(13, 20, 1.9), wheel(20, 20, 1.9), wheel(24, 20, 1.9), wheel(31, 20, 1.9), wheel(35, 20, 1.9),
    [rect("D", 8, 16.5, 6.5, 1.5), rect("D", 19, 16.5, 6.5, 1.5), rect("D", 30, 16.5, 6.5, 1.5),
     poly("B", [[3, 16], [3, 9], [6, 7], [31, 7], [40, 11], [42.5, 16]]),
     poly("M", [[31, 7], [40, 11], [42.5, 16], [31, 16]]),
     rect("D", 3, 14.7, 39, 1.3),
     poly("B", [[13, 7], [15, 2], [27, 2], [30.5, 7]]),
     rect("D", 9, 2.5, 5, 4.5), circle("D", 28.5, 5, 2.2)],
    gun(30.5, 5.2, 48, 4.8, 1.1, false),
    star(18, 11.5)),

  // M18 Hellcat: low, open-topped turret, five large road wheels.
  hellcat: concat(
    track(3, 43, 16, 22.5),
    wheel(6, 19, 3), wheel(13.5, 19, 3), wheel(21, 19, 3), wheel(28.5, 19, 3), wheel(36, 19, 3), wheel(41.5, 18.4, 2),
    [poly("B", [[3, 16.5], [3, 11], [7, 9], [36, 9], [43, 12.5], [43, 16.5]]),
     poly("M", [[36, 9], [43, 12.5], [43, 16.5], [36, 16.5]]),
     rect("D", 3, 15.2, 40, 1.3),
     poly("B", [[13, 9], [15.5, 4], [30, 4], [33, 9]]),
     rect("L", 16, 3.5, 13.5, 1), circle("D", 31, 6.5, 2.2)],
    gun(33, 6.6, 48, 6.3, 1.2, true),
    star(18, 12.5)),

  // M3 half-track: rounded bonnet, armoured cab, ring-mounted .50 cal.
  m3halftrack: concat(
    track(5, 29, 16, 22.5),
    wheel(8, 19.6, 2.1), wheel(12.5, 19.8, 2.1), wheel(17, 19.8, 2.1), wheel(21.5, 19.8, 2.1), wheel(26, 19.4, 2.1),
    wheel(39.5, 19.5, 3),
    [poly("B", [[5, 16.5], [5, 8], [28, 8], [30.5, 11], [43, 11], [44.5, 13], [44.5, 16.5]]),
     poly("M", [[30.5, 11], [43, 11], [44.5, 13], [44.5, 16.5], [30.5, 16.5]]),
     rect("D", 5, 15.2, 39.5, 1.3), rect("L", 6, 7.5, 21, 1.2),
     rect("N", 24, 9, 4, 2.5), rect("D", 35, 12, 7, 2.2), circle("D", 14, 6.5, 2.5)],
    gun(13, 6.5, 19, 4.6, 1, false),
    star(12, 12.5)),

  // M8 Greyhound: six wheels, open-topped turret, 37 mm.
  greyhound: concat(
    wheel(8, 18.8, 3), wheel(18.5, 18.8, 3), wheel(38, 18.8, 3),
    [poly("B", [[3, 16], [6, 10], [38, 10], [45, 13], [45, 16]]),
     poly("M", [[38, 10], [45, 13], [45, 16], [37, 16]]),
     rect("D", 3, 14.8, 42, 1.2),
     poly("B", [[14, 10], [16, 5.5], [26, 5.5], [28.5, 10]]),
     rect("L", 16.5, 5, 9, 1)],
    gun(28, 8, 37, 7.6, 1, false),
    star(11, 12.8)),

  // 105 mm M2A1 howitzer: split trail, shield, pneumatic tyres.
  m2a1: concat(
    [bar("M", 15, 15, 3, 21, 1.6), bar("M", 15, 15, 6, 21.5, 1.6),
     poly("B", [[14, 8], [23, 8], [25, 16], [12, 16]]),
     rect("D", 14, 14.5, 11, 1.5)],
    [bar("G", 18, 11, 40, 2.5, 2)],
    wheel(18, 18, 3.4)),

  // 155 mm M1 Long Tom: corps artillery, very long barrel, big wheels.
  longTom: concat(
    [bar("M", 16, 15, 2, 21, 1.8),
     poly("B", [[12, 9], [24, 9], [26, 17], [10, 17]]),
     rect("D", 12, 15.5, 14, 1.5), rect("D", 14, 10.5, 8, 3)],
    [bar("G", 18, 12, 47, -1, 2.4)],
    wheel(14, 18.5, 4), wheel(24, 18.5, 4)),

  // GMC CCKW 2.5-ton: canvas bed, long rounded bonnet.
  gmcTruck: concat(
    [rect("C", 3, 6, 25, 11), rect("K", 8, 6, 0.7, 11), rect("K", 14, 6, 0.7, 11), rect("K", 20, 6, 0.7, 11),
     rect("D", 3, 16, 25, 1.5),
     poly("B", [[29, 18], [29, 8], [34.5, 8], [36, 11.5], [45, 11.5], [47, 13.5], [47, 18]]),
     rect("N", 30, 9, 4, 3), rect("D", 29, 16.5, 18, 1.5), rect("D", 41, 13, 5, 2.5),
     rect("M", 2, 17.5, 45, 1.5)],
    wheel(9, 19.8, 2.8), wheel(17, 19.8, 2.8), wheel(41, 19.8, 2.8)),

  // Infantry: three riflemen; helmets and weapons per nation.
  infantryAxis: concat(soldier(10, 22, "stahl", "rifle"), soldier(23, 22.5, "stahl", "rifle"), soldier(36, 22, "stahl", "rifle")),
  fallschirmjaeger: concat(soldier(9, 22, "fj", "smg"), soldier(21, 22.5, "fj", "rifle"), prone(34, 22, "fj")),
  infantryAllied: concat(soldier(10, 22, "m1", "rifle"), soldier(23, 22.5, "m1", "rifle"), soldier(36, 22, "m1", "rifle")),
  paratrooper: concat(soldier(9, 22, "para", "smg"), soldier(21, 22.5, "para", "smg"), prone(34, 22, "para"))
}

// ------------------------------------------------------------ rasteriser
function inPoly(pts, x, y) {
  var inside = false
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function hit(shape, x, y) {
  if (shape.kind === "circle") { var dx = x - shape.cx, dy = y - shape.cy; return dx * dx + dy * dy <= shape.r * shape.r }
  return inPoly(shape.pts, x, y)
}

var BODY = { B: true, M: true, C: true, U: true, H: true }

// Sprites too fine for a one-pixel outline (the infantry figures).
var NO_OUTLINE = { infantryAxis: true, fallschirmjaeger: true, infantryAllied: true, paratrooper: true }

// Rasterise a definition into a grid of palette letters ("" = transparent),
// then outline, light the top edges and shade the undersides.
function rasterise(shapes, outline) {
  var g = [], x, y
  for (y = 0; y < HEIGHT; y++) {
    var row = []
    for (x = 0; x < WIDTH; x++) {
      var tone = ""
      for (var i = shapes.length - 1; i >= 0; i--) if (hit(shapes[i], x + 0.5, y + 0.5)) { tone = shapes[i].tone; break }
      row.push(tone)
    }
    g.push(row)
  }
  var at = function (xx, yy) { return xx < 0 || yy < 0 || xx >= WIDTH || yy >= HEIGHT ? "" : g[yy][xx] }
  var out = []
  for (y = 0; y < HEIGHT; y++) {
    var r2 = []
    for (x = 0; x < WIDTH; x++) {
      var t = g[y][x]
      if (!t) { r2.push(""); continue }
      var edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)
      if (edge && t !== "X" && outline !== false) { r2.push("K"); continue }
      if (BODY[t] && (at(x, y - 1) === "" || (at(x, y - 1) !== t && at(x, y - 2) === ""))) { r2.push("L"); continue }
      if (t === "B" && at(x, y + 1) === "K") { r2.push("D"); continue }
      r2.push(t)
    }
    out.push(r2)
  }
  return out
}

// Run-length rows [[x, len, tone], ...], cached per sprite.
var _runs = {}

function runsOf(name) {
  if (_runs[name]) return _runs[name]
  var grid = rasterise(DEFS[name] || DEFS.infantryAxis, !NO_OUTLINE[name]), out = []
  for (var y = 0; y < HEIGHT; y++) {
    var runs = [], x = 0
    while (x < WIDTH) {
      var c = grid[y][x]
      if (!c) { x++; continue }
      var start = x
      while (x < WIDTH && grid[y][x] === c) x++
      runs.push([start, x - start, c])
    }
    out.push(runs)
  }
  _runs[name] = out
  return out
}

// Which sprite a unit uses: by side and type, refined by formation name to
// what that formation actually fielded.
function spriteFor(unit) {
  var n = unit.name
  if (unit.side === "axis") {
    switch (unit.type) {
      case "armor":
        if (/Peiper/.test(n)) return "tigerII"                       // s.SS-Pz.Abt 501 rode with Peiper
        if (/Führer-Begleit|9\. Panzer/.test(n)) return "pzIV"
        return "panther"
      case "mechInfantry": return "sdkfz251"
      case "recon": return "puma"
      case "antiTank": return "pak40"
      case "artillery": return /[Ww]erfer/.test(n) ? "nebelwerfer" : "lefh18"
      case "supply": return "opelBlitz"
      case "eliteInfantry": return "fallschirmjaeger"
      default: return /Fallschirmj|FJR|FJD/.test(n) ? "fallschirmjaeger" : "infantryAxis"
    }
  }
  switch (unit.type) {
    case "armor":
      if (/British|Armoured/.test(n)) return "firefly"
      if (/2nd AD|4th AD/.test(n)) return "sherman76"
      return "sherman"
    case "mechInfantry": return "m3halftrack"
    case "recon": return "greyhound"
    case "antiTank": return "hellcat"                                 // 705th and 811th TD Bns had M18s
    case "artillery": return /Corps/.test(n) ? "longTom" : "m2a1"
    case "supply": return "gmcTruck"
    case "eliteInfantry": return "paratrooper"
    default: return "infantryAllied"
  }
}

var LABELS = {
  tigerII: "Tiger II heavy tanks", panther: "Panther tanks", pzIV: "Panzer IV tanks", sdkfz251: "SdKfz 251 half-tracks",
  puma: "SdKfz 234 Puma armoured cars", pak40: "7.5 cm Pak 40", lefh18: "10.5 cm leFH 18 howitzers", nebelwerfer: "15 cm Nebelwerfer 41",
  opelBlitz: "Opel Blitz trucks", sherman: "M4 Sherman (75 mm)", sherman76: "M4A3 Sherman (76 mm)", firefly: "Sherman Firefly (17-pdr)",
  hellcat: "M18 Hellcat tank destroyers", m3halftrack: "M3 half-tracks", greyhound: "M8 Greyhound armoured cars",
  m2a1: "105 mm M2A1 howitzers", longTom: "155 mm M1 Long Tom", gmcTruck: "GMC CCKW trucks",
  infantryAxis: "Volksgrenadiers", fallschirmjaeger: "Fallschirmjäger", infantryAllied: "Riflemen", paratrooper: "Paratroopers"
}

function labelFor(unit) {
  return LABELS[spriteFor(unit)] || ""
}

// Optional external sprite sheets (personal art, never shipped with the
// game): ~/.local/share/hex-general/sprites/sprites.json maps sprite
// names to [x, y, w, h] cells of a PNG per side. Set from Game.qml once
// the images are loaded; anything unmapped falls back to the built-ins.
var external = { axis: null, allies: null }   // { url, sprites: {name: [x,y,w,h]} }

function setExternal(side, url, sprites) {
  external[side] = { url: url, sprites: sprites }
}

// Draw a sprite centred on (cx, cy) at an integer pixel scale.
function draw(ctx, name, side, cx, cy, scale) {
  var ext = external[side]
  if (ext && ext.sprites[name]) {
    var c = ext.sprites[name]
    var dw = c[2] * scale, dh = c[3] * scale
    var smooth = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(ext.url, c[0], c[1], c[2], c[3], Math.round(cx - dw / 2), Math.round(cy - dh / 2), dw, dh)
    ctx.imageSmoothingEnabled = smooth
    return
  }
  var runs = runsOf(name)
  var pal = PALETTES[side] || PALETTES.axis
  var x0 = Math.round(cx - WIDTH * scale / 2), y0 = Math.round(cy - HEIGHT * scale / 2)
  for (var y = 0; y < runs.length; y++) {
    var row = runs[y]
    for (var i = 0; i < row.length; i++) {
      ctx.fillStyle = pal[row[i][2]] || "#f0f"
      ctx.fillRect(x0 + row[i][0] * scale, y0 + y * scale, row[i][1] * scale, scale)
    }
  }
}

// ASCII dump for checking sprites headlessly.
function dump(name) {
  var grid = rasterise(DEFS[name], !NO_OUTLINE[name])
  return grid.map(function (row) { return row.map(function (c) { return c || "." }).join("") }).join("\n")
}
