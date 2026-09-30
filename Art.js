.pragma library

.import "Sprites.js" as Sprites

// All the map art, drawn on a Canvas 2D context. Terrain tiles, rivers,
// roads, unit profiles (side-specific, modelled on the real vehicles and
// kit of December 1944), counters, flags, effects. Everything is vector;
// no image assets. Sizes are relative to the hex size `s` (centre to
// corner) or the unit scale `u` (about s * 0.55); vehicles face right.

var PAL = {
  snow: "#e6e8e1", snowShade: "rgba(150,160,150,0.22)", snowLight: "rgba(255,255,255,0.7)",
  hedge: "rgba(70,60,45,0.2)",
  fir: "#244d2e", firDark: "#1a3a22", firLight: "#3f7a48", trunk: "#4a3320", snowCap: "rgba(255,255,255,0.85)",
  ridge: "#c9b48c", ridgeShade: "#9c845c", ridgeLine: "#7a643f",
  wall: "#a09a92", wallShade: "#7c7670", roof: "#8f3f36", roofDark: "#6e2f29", spire: "#5a5550",
  bank: "#cfe0ec", water: "#4a83b9", waterDeep: "#3a6c9d",
  road: "#8b6a46", roadEdge: "rgba(50,35,20,0.4)", roadLine: "rgba(255,240,210,0.35)",
  bridge: "#4e3a2a", bridgeDeck: "#b59b78",
  grid: "rgba(40,40,40,0.22)", objectiveRing: "#f2cf3a",
  axisBody: "#54534c", axisDark: "#2c2b27", axisLight: "#7a7970",
  alliedBody: "#5b6a3d", alliedDark: "#313a22", alliedLight: "#7f8f5a",
  outline: "#15150f", strengthBox: "#f6f6f0"
}

// Deterministic per-hex noise so textures don't shimmer on repaint.
function noise(q, r, i) {
  var x = Math.sin(q * 127.1 + r * 311.7 + i * 74.7) * 43758.5453
  return x - Math.floor(x)
}

function hexPath(ctx, cx, cy, size) {
  ctx.beginPath()
  for (var i = 0; i < 6; i++) {
    var a = Math.PI / 180 * (60 * i - 30)
    var x = cx + size * Math.cos(a), y = cy + size * Math.sin(a)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath()
  ctx.ellipse(x - rx, y - ry, rx * 2, ry * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

// ---------------------------------------------------------------- terrain
function conifer(ctx, x, y, h) {
  ctx.fillStyle = PAL.trunk
  ctx.fillRect(x - h * 0.06, y - h * 0.1, h * 0.12, h * 0.16)
  var tiers = [[0.0, 0.55, 0.62], [-0.3, 0.42, 0.5], [-0.55, 0.3, 0.42]]
  for (var i = 0; i < tiers.length; i++) {
    var top = y + tiers[i][0] * h - tiers[i][2] * h, base = y + tiers[i][0] * h, w = tiers[i][1] * h
    ctx.fillStyle = i === 0 ? PAL.firDark : (i === 1 ? PAL.fir : PAL.firLight)
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + w, base); ctx.lineTo(x - w, base); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = PAL.snowCap
    ctx.lineWidth = Math.max(1, h * 0.06)
    ctx.beginPath(); ctx.moveTo(x - w * 0.9, base - h * 0.02); ctx.lineTo(x, top + h * 0.02); ctx.stroke()
  }
}

function house(ctx, x, y, w, h, dark) {
  ctx.fillStyle = PAL.wallShade
  ctx.fillRect(x - w / 2, y - h * 0.15, w, h * 0.65)
  ctx.fillStyle = PAL.wall
  ctx.fillRect(x - w / 2, y - h * 0.15, w * 0.55, h * 0.65)
  ctx.fillStyle = dark ? PAL.roofDark : PAL.roof
  ctx.beginPath()
  ctx.moveTo(x - w * 0.6, y - h * 0.15); ctx.lineTo(x, y - h * 0.65); ctx.lineTo(x + w * 0.6, y - h * 0.15)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = PAL.snowCap
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x - w * 0.55, y - h * 0.17); ctx.lineTo(x, y - h * 0.62); ctx.stroke()
}

function church(ctx, x, y, s) {
  house(ctx, x, y, s * 0.42, s * 0.36, true)
  ctx.fillStyle = PAL.spire
  ctx.fillRect(x + s * 0.1, y - s * 0.5, s * 0.1, s * 0.4)
  ctx.beginPath(); ctx.moveTo(x + s * 0.06, y - s * 0.5); ctx.lineTo(x + s * 0.15, y - s * 0.78); ctx.lineTo(x + s * 0.24, y - s * 0.5); ctx.closePath(); ctx.fill()
}

function tile(ctx, code, cx, cy, s, q, r) {
  hexPath(ctx, cx, cy, s)
  ctx.fillStyle = PAL.snow
  ctx.fill()
  ctx.save()
  ctx.clip()

  // Drifts and shading on every tile.
  for (var m = 0; m < 4; m++) {
    var mx = cx + (noise(q, r, m) - 0.5) * s * 1.6, my = cy + (noise(q, r, m + 10) - 0.5) * s * 1.6
    ellipse(ctx, mx, my, s * (0.2 + noise(q, r, m + 20) * 0.25), s * 0.1, PAL.snowShade)
    ellipse(ctx, mx - s * 0.05, my - s * 0.06, s * (0.14 + noise(q, r, m + 20) * 0.2), s * 0.05, PAL.snowLight)
  }

  if (code === "clear" && noise(q, r, 99) < 0.5) {
    // A faint hedgerow on about half the open hexes.
    ctx.strokeStyle = PAL.hedge
    ctx.lineWidth = 1
    var fx = cx + (noise(q, r, 100) - 0.5) * s * 0.9, fy = cy + (noise(q, r, 110) - 0.5) * s * 0.9
    var ang = noise(q, r, 120) * Math.PI, len = s * (0.25 + noise(q, r, 130) * 0.3)
    ctx.beginPath(); ctx.moveTo(fx - Math.cos(ang) * len, fy - Math.sin(ang) * len); ctx.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len); ctx.stroke()
  } else if (code === "forest") {
    var trees = []
    for (var t = 0; t < 9; t++) {
      trees.push({ x: cx + (noise(q, r, t + 30) - 0.5) * s * 1.45, y: cy + (noise(q, r, t + 40) - 0.5) * s * 1.35, h: s * (0.45 + noise(q, r, t + 50) * 0.3) })
    }
    trees.sort(function (a, b) { return a.y - b.y })
    trees.forEach(function (tr) { conifer(ctx, tr.x, tr.y + tr.h * 0.3, tr.h) })
  } else if (code === "hills") {
    for (var h = 0; h < 3; h++) {
      var hx = cx + (h - 1) * s * 0.4 + (noise(q, r, h + 60) - 0.5) * s * 0.25
      var hy = cy + (noise(q, r, h + 70) - 0.5) * s * 0.5 + s * 0.15
      var hw = s * (0.4 + noise(q, r, h + 80) * 0.18), hh = hw * 0.7
      ctx.fillStyle = PAL.ridgeShade
      ctx.beginPath(); ctx.moveTo(hx - hw, hy + 1); ctx.quadraticCurveTo(hx + hw * 0.1, hy - hh, hx + hw, hy + 1); ctx.closePath(); ctx.fill()
      ctx.fillStyle = PAL.ridge
      ctx.beginPath(); ctx.moveTo(hx - hw, hy); ctx.quadraticCurveTo(hx - hw * 0.3, hy - hh, hx + hw * 0.35, hy); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = PAL.ridgeLine
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(hx - hw, hy); ctx.quadraticCurveTo(hx + hw * 0.1, hy - hh, hx + hw, hy); ctx.stroke()
      ctx.strokeStyle = PAL.snowCap
      ctx.beginPath(); ctx.moveTo(hx - hw * 0.6, hy - hh * 0.35); ctx.quadraticCurveTo(hx - hw * 0.1, hy - hh * 0.95, hx + hw * 0.3, hy - hh * 0.5); ctx.stroke()
    }
  } else if (code === "town" || code === "city") {
    var count = code === "city" ? 9 : 5
    for (var b = 0; b < count; b++) {
      var bang = (b / count) * Math.PI * 2 + noise(q, r, b + 90) * 0.7
      var brad = code === "city" ? s * (b < 3 ? 0.22 : 0.5) : s * 0.3
      house(ctx, cx + Math.cos(bang) * brad, cy + Math.sin(bang) * brad * 0.75 + s * 0.08, s * (0.2 + noise(q, r, b + 95) * 0.1), s * 0.22, noise(q, r, b + 97) < 0.35)
    }
    if (code === "city") church(ctx, cx, cy - s * 0.05, s)
  }
  ctx.restore()
}

// Roads as smoothed polylines through hex centres.
function roads(ctx, chains, s) {
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  var passes = [[PAL.roadEdge, s * 0.22], [PAL.road, s * 0.13], [PAL.roadLine, Math.max(1, s * 0.02)]]
  passes.forEach(function (p, pi) {
    ctx.strokeStyle = p[0]
    ctx.lineWidth = p[1]
    if (pi === 2) ctx.setLineDash([s * 0.25, s * 0.2]); else ctx.setLineDash([])
    chains.forEach(function (pts) {
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (var i = 1; i < pts.length - 1; i++)
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.stroke()
    })
  })
  ctx.setLineDash([])
}

// Rivers as smoothed polylines through hex centres, continuous by
// construction (they pass under towns and bridges). `chains` =
// [{pts: [{x, y}], major}]; a major river is drawn wider.
function rivers(ctx, chains, s) {
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  var passes = [[PAL.bank, 0.42], [PAL.water, 0.26], [PAL.waterDeep, 0.1]]
  passes.forEach(function (p) {
    ctx.strokeStyle = p[0]
    chains.forEach(function (chain) {
      var pts = chain.pts
      ctx.lineWidth = s * p[1] * (chain.major ? 1.7 : 1)
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (var i = 1; i < pts.length - 1; i++)
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.stroke()
    })
  })
}

// Bridge deck along the road that crosses (angle = road direction).
function bridge(ctx, cx, cy, s, angle) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.fillStyle = PAL.bridge
  ctx.fillRect(-s * 0.5, -s * 0.17, s * 1.0, s * 0.34)
  ctx.fillStyle = PAL.bridgeDeck
  ctx.fillRect(-s * 0.5, -s * 0.09, s * 1.0, s * 0.18)
  ctx.fillStyle = PAL.bridge
  for (var i = -1; i <= 1; i += 2) {
    ctx.fillRect(-s * 0.5, i * s * 0.17 - s * 0.03, s * 0.12, s * 0.06)
    ctx.fillRect(s * 0.38, i * s * 0.17 - s * 0.03, s * 0.12, s * 0.06)
  }
  ctx.restore()
}

// -------------------------------------------------------------- symbols
function star(ctx, cx, cy, rOuter) {
  ctx.beginPath()
  for (var i = 0; i < 10; i++) {
    var rad = i % 2 === 0 ? rOuter : rOuter * 0.45
    var ang = -Math.PI / 2 + i * Math.PI / 5
    var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function flag(ctx, side, x, y, w, h) {
  ctx.fillStyle = "#222"
  ctx.fillRect(x - 1, y, 1.5, h + 2)
  ctx.fillStyle = side === "axis" ? "#3a3a3a" : "#2b4f8a"
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = "#f4f4ee"
  if (side === "axis") {
    ctx.fillRect(x + w * 0.42, y + h * 0.12, w * 0.16, h * 0.76)
    ctx.fillRect(x + w * 0.12, y + h * 0.42, w * 0.76, h * 0.16)
  } else {
    star(ctx, x + w / 2, y + h / 2, h * 0.36)
  }
  ctx.strokeStyle = "rgba(0,0,0,0.6)"
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, h)
}

// ---------------------------------------------------------------- units
// Small helpers working in unit coordinates: x right, y down, 1 = u.
function poly(ctx, cx, cy, u, pts, fill) {
  ctx.beginPath()
  for (var i = 0; i < pts.length; i++) {
    var x = cx + pts[i][0] * u, y = cy + pts[i][1] * u
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.stroke()
}

function box(ctx, cx, cy, u, x, y, w, h, fill) {
  ctx.fillStyle = fill
  ctx.fillRect(cx + x * u, cy + y * u, w * u, h * u)
  ctx.strokeRect(cx + x * u, cy + y * u, w * u, h * u)
}

function disc(ctx, cx, cy, u, x, y, rad, fill) {
  ctx.beginPath()
  ctx.arc(cx + x * u, cy + y * u, rad * u, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.stroke()
}

function barrel(ctx, cx, cy, u, x0, y0, x1, y1, w, brake) {
  ctx.lineWidth = Math.max(1.5, w * u)
  ctx.beginPath(); ctx.moveTo(cx + x0 * u, cy + y0 * u); ctx.lineTo(cx + x1 * u, cy + y1 * u); ctx.stroke()
  if (brake) {
    ctx.lineWidth = Math.max(2, w * u * 1.9)
    ctx.beginPath(); ctx.moveTo(cx + (x1 - 0.12) * u, cy + (y1 + 0.005) * u); ctx.lineTo(cx + x1 * u, cy + y1 * u); ctx.stroke()
  }
}

function tracks(ctx, cx, cy, u, xs, y, rad, fill) {
  for (var i = 0; i < xs.length; i++) disc(ctx, cx, cy, u, xs[i], y, rad, fill)
}

// Infantryman: helmet shape differs per side. `weapon` = "rifle" | "smg" | "mg".
function soldier(ctx, cx, cy, u, side, weapon, prone) {
  var body = side === "axis" ? PAL.axisBody : PAL.alliedBody
  var dark = side === "axis" ? PAL.axisDark : PAL.alliedDark
  if (prone) {
    poly(ctx, cx, cy, u, [[-0.45, 0.2], [0.25, 0.2], [0.3, 0.05], [-0.4, 0.05]], body)
    disc(ctx, cx, cy, u, 0.32, 0.0, 0.11, dark)
    barrel(ctx, cx, cy, u, 0.3, 0.0, 0.85, -0.12, 0.05, false)
    ctx.beginPath(); ctx.moveTo(cx + 0.65 * u, cy - 0.06 * u); ctx.lineTo(cx + 0.6 * u, cy + 0.2 * u); ctx.moveTo(cx + 0.7 * u, cy - 0.06 * u); ctx.lineTo(cx + 0.78 * u, cy + 0.2 * u); ctx.stroke()
    return
  }
  // legs, body, arm
  poly(ctx, cx, cy, u, [[-0.13, 0.1], [-0.2, 0.55], [-0.08, 0.55], [0.0, 0.2], [0.08, 0.55], [0.2, 0.55], [0.13, 0.1]], dark)
  poly(ctx, cx, cy, u, [[-0.17, 0.12], [-0.13, -0.35], [0.13, -0.35], [0.17, 0.12]], body)
  // helmet
  if (side === "axis") {
    poly(ctx, cx, cy, u, [[-0.2, -0.42], [-0.16, -0.58], [-0.05, -0.66], [0.07, -0.66], [0.17, -0.58], [0.22, -0.42], [0.12, -0.38], [-0.12, -0.38]], dark)
  } else {
    ctx.beginPath(); ctx.arc(cx, cy - 0.5 * u, 0.17 * u, Math.PI, 0); ctx.lineTo(cx + 0.19 * u, cy - 0.44 * u); ctx.lineTo(cx - 0.19 * u, cy - 0.44 * u); ctx.closePath()
    ctx.fillStyle = dark; ctx.fill(); ctx.stroke()
  }
  disc(ctx, cx, cy, u, 0.0, -0.42, 0.06, "#c9a98c")
  // weapon
  if (weapon === "rifle") barrel(ctx, cx, cy, u, -0.3, 0.05, 0.4, -0.45, 0.05, false)
  else if (weapon === "smg") barrel(ctx, cx, cy, u, -0.1, -0.1, 0.35, -0.2, 0.07, false)
  else if (weapon === "mg") barrel(ctx, cx, cy, u, -0.35, -0.05, 0.45, -0.2, 0.08, false)
}

function silhouetteAxis(ctx, unit, cx, cy, u) {
  var body = PAL.axisBody, dark = PAL.axisDark, light = PAL.axisLight
  switch (unit.type) {
    case "armor": // Panther: sloped glacis, long 7.5 cm with muzzle brake, interleaved road wheels
      tracks(ctx, cx, cy, u, [-0.78, -0.5, -0.22, 0.06, 0.34, 0.62], 0.34, 0.16, dark)
      poly(ctx, cx, cy, u, [[-1.05, 0.28], [-1.05, -0.02], [-0.85, -0.24], [0.2, -0.24], [1.05, 0.02], [1.05, 0.28]], body)
      poly(ctx, cx, cy, u, [[-0.62, -0.24], [-0.5, -0.58], [0.15, -0.58], [0.38, -0.24]], light)
      box(ctx, cx, cy, u, -0.42, -0.7, 0.2, 0.12, dark)
      barrel(ctx, cx, cy, u, 0.3, -0.45, 1.5, -0.5, 0.09, true)
      break
    case "mechInfantry": // SdKfz 251 half-track, open top, MG34 forward
      poly(ctx, cx, cy, u, [[-1.0, 0.25], [-1.0, -0.12], [-0.6, -0.4], [0.5, -0.4], [0.72, -0.1], [1.0, 0.0], [1.0, 0.25]], body)
      box(ctx, cx, cy, u, -0.8, -0.32, 1.1, 0.12, light)
      tracks(ctx, cx, cy, u, [-0.78, -0.5, -0.22], 0.32, 0.15, dark)
      disc(ctx, cx, cy, u, 0.7, 0.3, 0.17, dark)
      barrel(ctx, cx, cy, u, 0.25, -0.4, 0.55, -0.62, 0.06, false)
      break
    case "recon": // SdKfz 234 Puma, eight wheels, small turret
      poly(ctx, cx, cy, u, [[-1.05, 0.22], [-0.95, -0.2], [0.8, -0.2], [1.05, 0.05], [1.05, 0.22]], body)
      poly(ctx, cx, cy, u, [[-0.45, -0.2], [-0.35, -0.45], [0.25, -0.45], [0.38, -0.2]], light)
      barrel(ctx, cx, cy, u, 0.25, -0.35, 0.9, -0.38, 0.06, true)
      tracks(ctx, cx, cy, u, [-0.78, -0.35, 0.3, 0.75], 0.3, 0.17, dark)
      break
    case "infantry": // Volksgrenadiers: Stahlhelm, Kar 98k
      soldier(ctx, cx - 0.45 * u, cy, u, "axis", "rifle", false)
      soldier(ctx, cx + 0.4 * u, cy + 0.05 * u, u, "axis", "rifle", false)
      break
    case "eliteInfantry": // Fallschirmjäger: MG42 team
      soldier(ctx, cx - 0.7 * u, cy, u, "axis", "smg", false)
      soldier(ctx, cx - 0.05 * u, cy - 0.08 * u, u, "axis", "rifle", false)
      soldier(ctx, cx + 0.45 * u, cy + 0.35 * u, u, "axis", "mg", true)
      break
    case "antiTank": // Pak 40: shield, long barrel with muzzle brake, split trail
      barrel(ctx, cx, cy, u, -0.1, 0.05, -0.95, 0.42, 0.07, false)
      barrel(ctx, cx, cy, u, -0.1, 0.05, -0.85, 0.3, 0.07, false)
      poly(ctx, cx, cy, u, [[-0.42, -0.5], [0.2, -0.5], [0.38, 0.12], [-0.5, 0.12]], body)
      barrel(ctx, cx, cy, u, -0.05, -0.25, 1.25, -0.48, 0.09, true)
      tracks(ctx, cx, cy, u, [-0.3, 0.22], 0.3, 0.18, dark)
      break
    case "artillery":
      if (/[Ww]erfer/.test(unit.name)) { // Nebelwerfer 41: six tubes on a Pak carriage
        tracks(ctx, cx, cy, u, [-0.25, 0.25], 0.3, 0.2, dark)
        box(ctx, cx, cy, u, -0.35, 0.0, 0.7, 0.18, body)
        for (var t = 0; t < 3; t++) barrel(ctx, cx, cy, u, -0.2 + t * 0.12, 0.05 - t * 0.02, 0.75 + t * 0.12, -0.75 - t * 0.02, 0.09, false)
        barrel(ctx, cx, cy, u, -0.3, 0.1, -1.0, 0.42, 0.06, false)
      } else { // 10.5 cm leFH 18: big wheel, shield, split trail
        barrel(ctx, cx, cy, u, -0.2, 0.2, -1.05, 0.45, 0.07, false)
        poly(ctx, cx, cy, u, [[-0.5, -0.35], [0.05, -0.35], [0.15, 0.15], [-0.55, 0.15]], body)
        barrel(ctx, cx, cy, u, -0.15, -0.1, 1.05, -0.6, 0.12, true)
        disc(ctx, cx, cy, u, -0.2, 0.22, 0.32, dark)
        disc(ctx, cx, cy, u, -0.2, 0.22, 0.12, light)
      }
      break
    case "supply": // Opel Blitz, canvas-covered bed
      poly(ctx, cx, cy, u, [[-1.05, 0.25], [-1.05, -0.35], [-0.95, -0.48], [0.25, -0.48], [0.35, -0.35], [0.35, 0.25]], light)
      poly(ctx, cx, cy, u, [[0.38, 0.25], [0.38, -0.3], [0.58, -0.3], [0.78, -0.08], [1.0, -0.05], [1.0, 0.25]], body)
      box(ctx, cx, cy, u, 0.42, -0.26, 0.18, 0.16, "#b9d0e0")
      tracks(ctx, cx, cy, u, [-0.72, -0.35, 0.72], 0.32, 0.17, dark)
      break
  }
}

function silhouetteAllied(ctx, unit, cx, cy, u) {
  var body = PAL.alliedBody, dark = PAL.alliedDark, light = PAL.alliedLight
  switch (unit.type) {
    case "armor": // M4 Sherman: tall hull, cast turret, 75 mm, three bogies
      tracks(ctx, cx, cy, u, [-0.82, -0.62, -0.32, -0.12, 0.28, 0.48], 0.36, 0.12, dark)
      disc(ctx, cx, cy, u, 0.82, 0.22, 0.14, dark)
      poly(ctx, cx, cy, u, [[-1.05, 0.3], [-1.05, -0.3], [0.5, -0.3], [0.92, -0.05], [1.05, 0.1], [1.05, 0.3]], body)
      ctx.beginPath()
      ctx.moveTo(cx - 0.5 * u, cy - 0.3 * u)
      ctx.quadraticCurveTo(cx - 0.45 * u, cy - 0.72 * u, cx + 0.0 * u, cy - 0.72 * u)
      ctx.quadraticCurveTo(cx + 0.45 * u, cy - 0.72 * u, cx + 0.45 * u, cy - 0.3 * u)
      ctx.closePath(); ctx.fillStyle = light; ctx.fill(); ctx.stroke()
      barrel(ctx, cx, cy, u, 0.35, -0.5, 1.28, -0.52, 0.09, false)
      break
    case "mechInfantry": // M3 half-track, rounded bonnet, ring-mounted .50 cal
      poly(ctx, cx, cy, u, [[-1.0, 0.25], [-1.0, -0.4], [0.35, -0.4], [0.45, -0.15], [0.8, -0.15], [1.0, 0.05], [1.0, 0.25]], body)
      box(ctx, cx, cy, u, -0.85, -0.32, 1.1, 0.1, light)
      tracks(ctx, cx, cy, u, [-0.78, -0.5, -0.22], 0.32, 0.15, dark)
      disc(ctx, cx, cy, u, 0.7, 0.3, 0.17, dark)
      barrel(ctx, cx, cy, u, -0.2, -0.4, 0.15, -0.62, 0.06, false)
      break
    case "recon": // M8 Greyhound: six wheels, open-topped turret
      poly(ctx, cx, cy, u, [[-1.05, 0.22], [-0.9, -0.2], [0.7, -0.2], [1.05, 0.05], [1.05, 0.22]], body)
      poly(ctx, cx, cy, u, [[-0.4, -0.2], [-0.35, -0.42], [0.3, -0.42], [0.38, -0.2]], light)
      barrel(ctx, cx, cy, u, 0.3, -0.33, 0.85, -0.36, 0.06, false)
      tracks(ctx, cx, cy, u, [-0.72, -0.32, 0.7], 0.3, 0.17, dark)
      break
    case "infantry": // M1 helmet, Garand
      soldier(ctx, cx - 0.45 * u, cy, u, "allies", "rifle", false)
      soldier(ctx, cx + 0.4 * u, cy + 0.05 * u, u, "allies", "rifle", false)
      break
    case "eliteInfantry": // paratroopers with Thompsons, one prone with a BAR
      soldier(ctx, cx - 0.7 * u, cy, u, "allies", "smg", false)
      soldier(ctx, cx - 0.05 * u, cy - 0.08 * u, u, "allies", "smg", false)
      soldier(ctx, cx + 0.45 * u, cy + 0.35 * u, u, "allies", "mg", true)
      break
    case "antiTank": // M10 / M36 tank destroyer: open-topped angular turret, long 3-inch gun
      tracks(ctx, cx, cy, u, [-0.82, -0.62, -0.32, -0.12, 0.28, 0.48], 0.36, 0.12, dark)
      disc(ctx, cx, cy, u, 0.82, 0.22, 0.14, dark)
      poly(ctx, cx, cy, u, [[-1.05, 0.3], [-1.0, -0.18], [0.6, -0.18], [1.05, 0.1], [1.05, 0.3]], body)
      poly(ctx, cx, cy, u, [[-0.55, -0.18], [-0.45, -0.55], [0.35, -0.55], [0.5, -0.18]], light)
      barrel(ctx, cx, cy, u, 0.35, -0.42, 1.4, -0.47, 0.09, false)
      break
    case "artillery": // 105 mm M2A1: split trail, shield, big wheels
      barrel(ctx, cx, cy, u, -0.2, 0.2, -1.05, 0.45, 0.07, false)
      barrel(ctx, cx, cy, u, -0.2, 0.2, -0.95, 0.3, 0.07, false)
      poly(ctx, cx, cy, u, [[-0.45, -0.3], [0.1, -0.3], [0.2, 0.15], [-0.5, 0.15]], body)
      barrel(ctx, cx, cy, u, -0.15, -0.08, 1.0, -0.58, 0.12, false)
      disc(ctx, cx, cy, u, -0.15, 0.22, 0.3, dark)
      disc(ctx, cx, cy, u, -0.15, 0.22, 0.1, light)
      break
    case "supply": // GMC CCKW 2.5-ton, canvas bed, rounded bonnet
      poly(ctx, cx, cy, u, [[-1.05, 0.25], [-1.05, -0.35], [-0.95, -0.48], [0.2, -0.48], [0.3, -0.35], [0.3, 0.25]], light)
      poly(ctx, cx, cy, u, [[0.33, 0.25], [0.33, -0.32], [0.55, -0.32], [0.62, -0.1], [0.95, -0.1], [1.05, 0.05], [1.05, 0.25]], body)
      box(ctx, cx, cy, u, 0.37, -0.28, 0.16, 0.16, "#b9d0e0")
      tracks(ctx, cx, cy, u, [-0.72, -0.35, 0.78], 0.32, 0.17, dark)
      break
  }
}

function silhouette(ctx, unit, cx, cy, u) {
  ctx.save()
  ctx.strokeStyle = PAL.outline
  ctx.lineWidth = Math.max(1, u * 0.06)
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  if (unit.side === "axis") silhouetteAxis(ctx, unit, cx, cy, u)
  else silhouetteAllied(ctx, unit, cx, cy, u)
  ctx.restore()
}

// Full counter: profile, strength box with nationality chip, entrenchment
// pips, experience bars, cut-off marker, selection / target ring.
function counter(ctx, unit, cx, cy, s, opts) {
  // Pixel sprite at an integer scale so it stays crisp when zoomed.
  var scale = Math.max(1, Math.round(s * 1.35 / Sprites.WIDTH))
  ctx.save()
  if (opts.spent) ctx.globalAlpha = 0.55
  Sprites.draw(ctx, Sprites.spriteFor(unit), unit.side, cx, cy - s * 0.2, scale)
  ctx.restore()

  var bw = s * 0.5, bh = s * 0.3
  var bx = cx - bw / 2 + s * 0.1, by = cy + s * 0.3
  ctx.fillStyle = PAL.strengthBox
  ctx.fillRect(bx, by, bw, bh)
  ctx.strokeStyle = "#222"
  ctx.lineWidth = 1
  ctx.strokeRect(bx, by, bw, bh)
  ctx.fillStyle = "#111"
  ctx.font = "bold " + Math.max(8, Math.round(s * 0.26)) + "px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(unit.strength, bx + bw / 2, by + bh / 2 + 0.5)
  flag(ctx, unit.side, bx - s * 0.24, by + bh * 0.1, s * 0.2, bh * 0.8)

  for (var e = 0; e < unit.entrenchment; e++) {
    ctx.fillStyle = PAL.objectiveRing
    ctx.fillRect(bx + bw + s * 0.05, by + bh - (e + 1) * bh * 0.3, s * 0.1, bh * 0.22)
  }
  for (var x = 0; x < opts.bars; x++) {
    ctx.fillStyle = PAL.strengthBox
    ctx.fillRect(bx + x * s * 0.1, by + bh + 2, s * 0.07, s * 0.1)
    ctx.strokeStyle = "#222"
    ctx.lineWidth = 1
    ctx.strokeRect(bx + x * s * 0.1, by + bh + 2, s * 0.07, s * 0.1)
  }
  if (opts.cutOff) {
    var mx = cx + s * 0.55, my = cy - s * 0.5
    ctx.fillStyle = "#d8231b"
    ctx.beginPath(); ctx.arc(mx, my, s * 0.17, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = Math.max(1.5, s * 0.06)
    ctx.beginPath()
    ctx.moveTo(mx - s * 0.08, my - s * 0.08); ctx.lineTo(mx + s * 0.08, my + s * 0.08)
    ctx.moveTo(mx + s * 0.08, my - s * 0.08); ctx.lineTo(mx - s * 0.08, my + s * 0.08)
    ctx.stroke()
  }
  if (opts.selected || opts.target) {
    hexPath(ctx, cx, cy, s - 2)
    ctx.lineWidth = 3
    ctx.strokeStyle = opts.selected ? "#101010" : "#d8231b"
    ctx.stroke()
  }
}

// -------------------------------------------------------------- overlays
// One sweeping arrow per unit through every hex it has moved to.
function arrows(ctx, chains, s) {
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  chains.forEach(function (chain) {
    var pts = chain.pts
    var color = chain.side === "axis" ? "rgba(214,40,30,0.9)" : "rgba(30,95,200,0.9)"
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? "rgba(255,255,255,0.75)" : color
      ctx.lineWidth = pass === 0 ? s * 0.22 : s * 0.11
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (var i = 1; i < pts.length - 1; i++)
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
      ctx.stroke()
    }
    var tip = pts[pts.length - 1], prev = pts[pts.length - 2]
    var ang = Math.atan2(tip.y - prev.y, tip.x - prev.x)
    var head = s * 0.42
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(tip.x + Math.cos(ang) * head * 0.5, tip.y + Math.sin(ang) * head * 0.5)
    ctx.lineTo(tip.x + Math.cos(ang + 2.5) * head, tip.y + Math.sin(ang + 2.5) * head)
    ctx.lineTo(tip.x + Math.cos(ang - 2.5) * head, tip.y + Math.sin(ang - 2.5) * head)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.75)"
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(pts[0].x, pts[0].y, s * 0.1, 0, Math.PI * 2); ctx.fill()
  })
}

function weather(ctx, code, w, h, s) {
  if (code === "overcast") {
    ctx.fillStyle = "rgba(150,158,168,0.16)"
    ctx.fillRect(0, 0, w, h)
  } else if (code === "snow") {
    ctx.fillStyle = "rgba(190,196,204,0.14)"
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    for (var i = 0; i < 400; i++) {
      var x = noise(i, 7, 1) * w, y = noise(i, 7, 2) * h, rad = 1 + noise(i, 7, 3) * s * 0.05
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
    }
  }
}

function ease(t) { return t * t * (3 - 2 * t) }

function explosion(ctx, b, e, s, destroyed) {
  var scale = destroyed ? 1.5 : 1
  var radius = s * (0.25 + 0.85 * e) * scale
  var alpha = 1 - e
  ctx.fillStyle = "rgba(255,110,20," + (alpha * 0.55) + ")"
  ctx.beginPath(); ctx.arc(b.x, b.y, radius, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "rgba(255,225,90," + alpha + ")"
  ctx.beginPath(); ctx.arc(b.x, b.y, radius * 0.55, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = "rgba(255,240,180," + alpha + ")"
  ctx.lineWidth = Math.max(1.5, s * 0.06)
  for (var i = 0; i < 8; i++) {
    var ang = i * Math.PI / 4 + e * 0.6
    ctx.beginPath()
    ctx.moveTo(b.x + Math.cos(ang) * radius * 0.6, b.y + Math.sin(ang) * radius * 0.6)
    ctx.lineTo(b.x + Math.cos(ang) * radius * (1.1 + e * 0.5), b.y + Math.sin(ang) * radius * (1.1 + e * 0.5))
    ctx.stroke()
  }
  if (destroyed) {
    for (var k = 0; k < 4; k++) {
      var sx = b.x + (k - 1.5) * s * 0.35
      var sy = b.y - s * (0.2 + e * 1.4) - k * s * 0.15
      ctx.fillStyle = "rgba(70,70,70," + (alpha * 0.7) + ")"
      ctx.beginPath(); ctx.arc(sx, sy, s * (0.2 + e * 0.35), 0, Math.PI * 2); ctx.fill()
    }
  }
}

function shot(ctx, ev, a, b, t, s) {
  var flight = 0.4
  if (t < flight) {
    var f = t / flight
    var px = a.x + (b.x - a.x) * f
    var py = a.y + (b.y - a.y) * f - (ev.indirect ? Math.sin(Math.PI * f) * s * 1.6 : 0)
    if (t < 0.12) {
      ctx.fillStyle = "rgba(255,240,150," + (1 - t / 0.12) + ")"
      star(ctx, a.x + (b.x - a.x) * 0.12, a.y + (b.y - a.y) * 0.12 - s * 0.12, s * 0.28)
    }
    ctx.strokeStyle = "rgba(255,200,80,0.7)"
    ctx.lineWidth = Math.max(1.5, s * 0.06)
    ctx.beginPath()
    ctx.moveTo(px - (b.x - a.x) * 0.08, py - (b.y - a.y) * 0.08)
    ctx.lineTo(px, py)
    ctx.stroke()
    ctx.fillStyle = "#fff4c0"
    ctx.beginPath(); ctx.arc(px, py, Math.max(2, s * 0.08), 0, Math.PI * 2); ctx.fill()
    return
  }
  explosion(ctx, b, (t - flight) / (1 - flight), s, ev.destroyed)
}

// P-47 Thunderbolt (Allied) or Fw 190 (Axis), side view.
function plane(ctx, x, y, heading, u, side) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading)
  ctx.strokeStyle = PAL.outline
  ctx.lineWidth = Math.max(1, u * 0.05)
  ctx.fillStyle = side === "allies" ? "#5a6a7a" : "#4a4f45"
  ctx.beginPath()
  ctx.moveTo(-u * 1.0, 0); ctx.quadraticCurveTo(-u * 0.2, -u * 0.35, u * 0.9, -u * 0.12)
  ctx.lineTo(u * 1.0, 0); ctx.lineTo(u * 0.9, u * 0.12); ctx.quadraticCurveTo(-u * 0.2, u * 0.32, -u * 1.0, 0)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-u * 0.05, -u * 0.05); ctx.lineTo(-u * 0.35, -u * 1.0); ctx.lineTo(u * 0.05, -u * 1.0); ctx.lineTo(u * 0.35, -u * 0.05)
  ctx.lineTo(u * 0.05, u * 1.0); ctx.lineTo(-u * 0.35, u * 1.0); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-u * 0.95, 0); ctx.lineTo(-u * 1.0, -u * 0.45); ctx.lineTo(-u * 0.72, -u * 0.45); ctx.lineTo(-u * 0.6, 0)
  ctx.lineTo(-u * 0.72, u * 0.45); ctx.lineTo(-u * 1.0, u * 0.45); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.fillStyle = side === "allies" ? "#f0f0f0" : "#222"
  if (side === "allies") star(ctx, u * 0.4, 0, u * 0.14)
  else { ctx.fillRect(u * 0.3, -u * 0.12, u * 0.16, u * 0.24); ctx.fillStyle = "#eee"; ctx.fillRect(u * 0.35, -u * 0.05, u * 0.06, u * 0.1) }
  ctx.restore()
}

function airRaid(ctx, ev, b, t, s, w) {
  var fromWest = ev.side === "allies"
  var x0 = fromWest ? -s * 2 : w + s * 2, x1 = fromWest ? w + s * 2 : -s * 2
  var px = x0 + (x1 - x0) * t
  var arrive = (b.x - x0) / (x1 - x0)
  var py = b.y - s * 1.2 - Math.abs(t - arrive) * s * 2.2
  if (t > arrive - 0.12 && t < arrive) {
    ctx.strokeStyle = "rgba(0,0,0,0.6)"
    ctx.lineWidth = Math.max(1.5, s * 0.06)
    var bf = (t - (arrive - 0.12)) / 0.12
    var bx = px + (b.x - px) * bf, by = py + (b.y - py) * bf
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke()
    ctx.fillStyle = "#222"
    ctx.beginPath(); ctx.arc(bx, by, Math.max(2, s * 0.08), 0, Math.PI * 2); ctx.fill()
  }
  if (t >= arrive) explosion(ctx, b, Math.min(1, (t - arrive) / (1 - arrive)), s, ev.destroyed)
  plane(ctx, px, py, fromWest ? 0 : Math.PI, s * 0.6, ev.side)
}
