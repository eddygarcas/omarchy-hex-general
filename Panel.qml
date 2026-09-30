// Hex General -- a small hex-grid operational wargame.
//
// Single scenario for now: "Ardennes, Winter 1944". The player commands the
// Axis Kampfgruppen; the Allied side is run by a rule-based AI (see
// Engine.js). Game state is one plain JS object (`gameState`) mutated in
// place by Engine.js's functions; `rev` is bumped after every mutation so
// the property bindings below (which read `rev` purely as a dependency)
// re-evaluate even though QML can't see inside a mutated plain object.
//
// The map is two stacked Canvases in the style of 1990s hex wargames: a
// static terrain layer (tiles, roads, rivers) painted once per size, and a
// unit layer repainted on every state change and animation frame. Moves
// and attacks are queued as animations so the Allied phase plays out one
// unit at a time. Everything is procedural -- no image assets.
import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import qs.Commons
import qs.Ui
import "Hex.js" as Hex
import "Units.js" as Units
import "Scenario.js" as Scenario
import "Engine.js" as Engine

Item {
  id: root

  property bool opened: false
  property var gameState: Engine.createState()
  property int rev: 0
  property string phase: "axis"
  property var hoverHex: null   // axial {q, r} under the cursor, or null
  property bool showTrails: true
  property bool airMode: false   // waiting for the player to pick an air-strike target

  // Animation playback: `anim` is the event being shown (see Engine's
  // moveEvent/attackEvent), `animT` runs 0 -> 1 over its duration.
  property var anim: null
  property real animT: 0
  property var animQueue: []
  readonly property bool busy: anim !== null || phase === "allies"

  // Largest hex that lets the whole rectangular map fit the map box; the
  // Flickable takes over if the box is ever too small for the 14px floor.
  readonly property real hexSize: {
    var cols = Math.sqrt(3) * Scenario.WIDTH + 2
    var rows = 1.5 * Scenario.HEIGHT + 1.5
    return Math.max(14, Math.min(mapFlick.width / cols, mapFlick.height / rows))
  }

  function open(payloadJson) {
    root.opened = true
    Qt.callLater(function () { card.forceActiveFocus() })
  }
  function close() { root.opened = false }
  function toggle() { root.opened ? root.close() : root.open("{}") }

  function newGame() {
    animator.stop()
    pauseTimer.stop()
    anim = null
    animQueue = []
    gameState = Engine.createState()
    phase = "axis"
    airMode = false
    hoverHex = null
    rev++
  }

  function selectedUnit() {
    return gameState.selectedUnitId ? Engine.unitById(gameState, gameState.selectedUnitId) : null
  }

  function select(unit) {
    gameState.selectedUnitId = unit ? unit.id : null
    rev++
  }

  function selectNext() {
    if (busy) return
    var units = Engine.actionableUnits(gameState)
    if (units.length === 0) { select(null); return }
    var idx = -1
    for (var i = 0; i < units.length; i++) if (units[i].id === gameState.selectedUnitId) idx = i
    select(units[(idx + 1) % units.length])
  }

  function canAir() {
    root.rev
    return phase === "axis" && !busy && !gameState.gameOver && Engine.airAvailable(gameState) && gameState.airStrikes > 0
  }

  function toggleAirMode() {
    airMode = !airMode && canAir()
  }

  function handleHexClick(q, r) {
    if (gameState.gameOver || busy) return
    var sel = selectedUnit()
    var clicked = Engine.unitAt(gameState, q, r)

    if (airMode) {
      if (clicked && clicked.side === "allies") {
        var raid = Engine.axisAirStrike(gameState, clicked.id)
        airMode = false
        rev++
        if (raid) play([raid])
      }
      return
    }

    if (clicked && clicked.side === "axis") {
      select(sel && clicked.id === sel.id ? null : clicked)
      return
    }
    if (!sel) return

    if (clicked && clicked.side === "allies") {
      if (Engine.canAttack(gameState, sel, clicked)) {
        var shot = Engine.attackEvent(gameState, sel, clicked)
        if (sel.strength <= 0 || !sel.overrun) gameState.selectedUnitId = null
        rev++
        play([shot])
      }
      return
    }

    // Victory is only judged at the end of the turn (see Engine.finishAlliesPhase),
    // so a town taken now still has to survive the Allied response.
    if (Engine.reachable(gameState, sel)[Hex.key(q, r)] !== undefined) {
      var step = Engine.moveEvent(gameState, sel, q, r)
      if (Engine.attackTargets(gameState, sel).length === 0) gameState.selectedUnitId = null
      rev++
      play([step])
    }
  }

  function endTurn() {
    if (gameState.gameOver) { newGame(); return }
    if (busy) return
    airMode = false
    Engine.resetPhaseFlags(gameState, "axis")
    Engine.beginAlliesPhase(gameState)
    gameState.selectedUnitId = null
    phase = "allies"
    rev++
    aiTick()
  }

  // One Allied unit acts per tick; its events animate, then the next tick
  // runs after a short pause so the eye can follow.
  function aiTick() {
    var events = Engine.aiStep(gameState)
    if (!events) {
      Engine.finishAlliesPhase(gameState)
      phase = "axis"
      rev++
      return
    }
    rev++
    play(events)
  }

  function play(events) {
    animQueue = animQueue.concat(events)
    if (!anim) playNext()
  }

  function playNext() {
    if (animQueue.length === 0) {
      anim = null
      if (phase === "allies" && !gameState.gameOver) pauseTimer.start()
      return
    }
    var next = animQueue[0]
    animQueue = animQueue.slice(1)
    anim = next
    animT = 0
    animator.duration = next.kind === "move" ? 420 + 220 * Hex.distance(next.from, next.to)
      : next.kind === "air" ? (next.destroyed ? 1800 : 1500)
      : (next.destroyed ? 1300 : 1000)
    animator.start()
  }

  NumberAnimation {
    id: animator
    target: root
    property: "animT"
    from: 0
    to: 1
    onFinished: root.playNext()
  }

  Timer {
    id: pauseTimer
    interval: 320
    onTriggered: root.aiTick()
  }

  function hoverText() {
    root.rev
    if (!hoverHex) return ""
    var terrain = Engine.terrainAt(gameState, hoverHex.q, hoverHex.r)
    if (!terrain) return ""
    var obj = Engine.objectiveAt(gameState, hoverHex.q, hoverHex.r)
    var road = gameState.roads[Hex.key(hoverHex.q, hoverHex.r)]
    var line = (obj ? obj.name + " (" + obj.points + " pts, " + (obj.owner === "axis" ? "Axis" : "Allied") + ") -- " : "") +
               terrain.label + (road ? " + road" : "") +
               " -- move cost " + Engine.moveCost(gameState, hoverHex.q, hoverHex.r) +
               (terrain.defBonus ? ", defence +" + terrain.defBonus : "")
    var unit = Engine.unitAt(gameState, hoverHex.q, hoverHex.r)
    if (unit) {
      var t = Units.typeOf(unit)
      line += "\n" + unit.name + " -- " + t.label + " " + unit.strength + "/10, " + Engine.xpLabel(unit).toLowerCase() +
              (Engine.xpBars(unit) ? " (" + Engine.xpBars(unit) + " bars)" : "") +
              (unit.entrenchment ? ", dug in " + unit.entrenchment : "") +
              (Engine.isSupplied(gameState, unit) ? "" : " -- CUT OFF from supply, no replacements")
      var sel = selectedUnit()
      if (airMode && unit.side === "allies") {
        var cover = terrain.defBonus > 0 || unit.entrenchment >= 2
        line += "\nAir strike target -- " + (cover ? "in cover, 1 step" : "in the open, 1-2 steps")
      } else if (sel && unit.side === "allies" && Engine.canAttack(gameState, sel, unit)) {
        var odds = Engine.combatOdds(gameState, sel, unit)
        line += "\nAttack odds " + odds.toFixed(1) + ":1 -- " + Engine.oddsLabel(odds)
      }
    }
    return line
  }

  function weatherText() {
    root.rev
    var now = Engine.currentWeather(gameState)
    var next = Engine.weatherAt(gameState, gameState.turn + 1)
    return "Weather: " + now.label + (now.air ? " -- air support flies" : (now.movePenalty ? " -- movement -" + now.movePenalty + ", no air" : " -- no air")) +
           "   |   Forecast: " + next.label
  }

  PanelWindow {
    id: window
    visible: root.opened
    anchors { top: true; bottom: true; left: true; right: true }
    color: "transparent"
    WlrLayershell.namespace: "eduard-hex-general"
    WlrLayershell.layer: WlrLayer.Overlay
    WlrLayershell.keyboardFocus: WlrKeyboardFocus.Exclusive

    Rectangle {
      anchors.fill: parent
      color: Color.menu.scrim
      MouseArea { anchors.fill: parent; onClicked: root.close() }
    }

    Rectangle {
      id: card
      anchors.centerIn: parent
      width: Math.min(Style.space(1320), window.width - Style.gapsOut * 2)
      height: Math.min(Style.space(720), window.height - Style.gapsOut * 2)
      radius: Style.cornerRadius
      color: Color.menu.background
      border.color: Color.menu.border
      border.width: Style.normalBorderWidth
      focus: true

      Keys.onPressed: function (event) {
        switch (event.key) {
          case Qt.Key_Escape: if (root.airMode) root.airMode = false; else root.close(); break
          case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Space: root.endTurn(); break
          case Qt.Key_Tab: root.selectNext(); break
          case Qt.Key_N: root.newGame(); break
          case Qt.Key_M: root.showTrails = !root.showTrails; break
          case Qt.Key_A: root.toggleAirMode(); break
          default: return
        }
        event.accepted = true
      }

      MouseArea { anchors.fill: parent; onClicked: {} } // swallow clicks so the scrim behind doesn't close the card

      ColumnLayout {
        anchors.fill: parent
        anchors.margins: Style.spacing.lg
        spacing: Style.spacing.md

        // ---------------------------------------------------------- header
        RowLayout {
          Layout.fillWidth: true
          spacing: Style.spacing.md

          ColumnLayout {
            spacing: 0
            Text {
              text: "Hex General -- Ardennes, Winter 1944"
              font.pixelSize: Style.font.subtitle
              font.bold: true
              color: Color.foreground
            }
            Text {
              text: {
                root.rev
                var s = "Turn " + root.gameState.turn + " / " + Scenario.TURN_LIMIT + " -- "
                if (root.gameState.gameOver) return s + "Battle over"
                if (root.phase === "allies") return s + "Allied phase: the enemy is moving..."
                return s + "Axis phase: move and attack, then End Turn"
              }
              font.pixelSize: Style.font.caption
              color: root.phase === "allies" ? Color.accent : Color.foreground
              opacity: root.phase === "allies" ? 1 : 0.7
            }
            Text {
              text: root.weatherText()
              font.pixelSize: Style.font.caption
              color: Color.foreground
              opacity: 0.7
            }
          }

          Item { Layout.fillWidth: true }

          Text {
            text: { root.rev; return "Objectives held: " + Engine.scoreFor(root.gameState, "axis") + " / " + Engine.totalObjectivePoints(root.gameState) }
            font.pixelSize: Style.font.body
            color: Color.accent
          }

          Rectangle {
            width: Style.space(28); height: Style.space(28); radius: width / 2
            color: "transparent"; border.color: Color.foreground; border.width: 1
            Text { anchors.centerIn: parent; text: "x"; color: Color.foreground }
            MouseArea { anchors.fill: parent; onClicked: root.close() }
          }
        }

        // ------------------------------------------------------------ body
        RowLayout {
          Layout.fillWidth: true
          Layout.fillHeight: true
          spacing: Style.spacing.md

          // Map
          Rectangle {
            Layout.fillWidth: true
            Layout.fillHeight: true
            Layout.minimumWidth: Style.space(200)
            color: "#2a2d2b"
            radius: Style.cornerRadius
            clip: true

            Flickable {
              id: mapFlick
              anchors.fill: parent
              anchors.margins: Style.spacing.sm
              contentWidth: mapHolder.width
              contentHeight: mapHolder.height
              boundsBehavior: Flickable.StopAtBounds

              Item {
                id: mapHolder
                width: Math.max(terrainCanvas.width, mapFlick.width)
                height: Math.max(terrainCanvas.height, mapFlick.height)

                // ---- shared drawing helpers ----------------------------------
                QtObject {
                  id: draw

                  readonly property var pal: ({
                    snow: "#e3e5dd", snowMottle: "rgba(165,172,160,0.28)",
                    tree: "#2d5a36", treeLight: "#4a7d4e", treeShadow: "rgba(0,0,0,0.18)",
                    hill: "#b8a074", hillLine: "#8a6d45",
                    wall: "#9a9691", roof: "#a3453b", roofCity: "#7d3a33",
                    bank: "#c6dced", water: "#4f86b8",
                    road: "#8d6c48", roadEdge: "rgba(60,40,20,0.35)",
                    bridge: "#5e4128",
                    gridLine: "rgba(40,40,40,0.28)",
                    axisUnit: "#2f2f2f", alliedUnit: "#3f5a2a",
                    strengthBox: "#f4f4ee", objectiveRing: "#f2cf3a"
                  })

                  // Deterministic per-hex noise so textures don't shimmer on repaint.
                  function noise(q, r, i) {
                    var x = Math.sin(q * 127.1 + r * 311.7 + i * 74.7) * 43758.5453
                    return x - Math.floor(x)
                  }

                  function centerOf(q, r) {
                    var p = Hex.toPixel(q, r, root.hexSize)
                    return { x: p.x + root.hexSize, y: p.y + root.hexSize }
                  }

                  function hexPath(ctx, cx, cy, size) {
                    var pts = Hex.corners(cx, cy, size)
                    ctx.beginPath()
                    ctx.moveTo(pts[0].x, pts[0].y)
                    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
                    ctx.closePath()
                  }

                  function blob(ctx, x, y, rx, ry, fill) {
                    ctx.beginPath()
                    ctx.ellipse(x - rx, y - ry, rx * 2, ry * 2)
                    ctx.fillStyle = fill
                    ctx.fill()
                  }

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

                  // ---- terrain -------------------------------------------------
                  function tile(ctx, code, cx, cy, s, q, r) {
                    hexPath(ctx, cx, cy, s)
                    ctx.fillStyle = pal.snow
                    ctx.fill()
                    ctx.save()
                    ctx.clip()

                    for (var m = 0; m < 5; m++) {
                      var mx = cx + (noise(q, r, m) - 0.5) * s * 1.5
                      var my = cy + (noise(q, r, m + 10) - 0.5) * s * 1.5
                      blob(ctx, mx, my, s * (0.18 + noise(q, r, m + 20) * 0.2), s * 0.12, pal.snowMottle)
                    }

                    if (code === "forest") {
                      for (var t = 0; t < 8; t++) {
                        var tx = cx + (noise(q, r, t + 30) - 0.5) * s * 1.35
                        var ty = cy + (noise(q, r, t + 40) - 0.5) * s * 1.25
                        var tr = s * (0.14 + noise(q, r, t + 50) * 0.1)
                        blob(ctx, tx + tr * 0.25, ty + tr * 0.3, tr, tr * 0.85, pal.treeShadow)
                        blob(ctx, tx, ty, tr, tr * 0.9, pal.tree)
                        blob(ctx, tx - tr * 0.25, ty - tr * 0.3, tr * 0.5, tr * 0.4, pal.treeLight)
                      }
                    } else if (code === "hills") {
                      for (var h = 0; h < 3; h++) {
                        var hx = cx + (h - 1) * s * 0.42 + (noise(q, r, h + 60) - 0.5) * s * 0.2
                        var hy = cy + (noise(q, r, h + 70) - 0.5) * s * 0.6 + s * 0.1
                        var hw = s * (0.36 + noise(q, r, h + 80) * 0.14)
                        ctx.beginPath()
                        ctx.moveTo(hx - hw, hy)
                        ctx.quadraticCurveTo(hx, hy - hw * 0.9, hx + hw, hy)
                        ctx.closePath()
                        ctx.fillStyle = pal.hill
                        ctx.fill()
                        ctx.lineWidth = 1
                        ctx.strokeStyle = pal.hillLine
                        ctx.stroke()
                      }
                    } else if (code === "town" || code === "city") {
                      var count = code === "city" ? 7 : 4
                      var bw = s * 0.26, bh = s * 0.2
                      for (var b = 0; b < count; b++) {
                        var ang = (b / count) * Math.PI * 2 + noise(q, r, b + 90) * 0.6
                        var rad = code === "city" ? s * (b === 0 ? 0 : 0.42) : s * 0.3
                        var bx = cx + Math.cos(ang) * rad - bw / 2
                        var by = cy + Math.sin(ang) * rad * 0.8 - bh / 2
                        ctx.fillStyle = pal.wall
                        ctx.fillRect(bx, by + bh * 0.35, bw, bh * 0.65)
                        ctx.fillStyle = code === "city" ? pal.roofCity : pal.roof
                        ctx.beginPath()
                        ctx.moveTo(bx - 1, by + bh * 0.4)
                        ctx.lineTo(bx + bw / 2, by)
                        ctx.lineTo(bx + bw + 1, by + bh * 0.4)
                        ctx.closePath()
                        ctx.fill()
                      }
                    }
                    ctx.restore()
                  }

                  function roads(ctx, s) {
                    ctx.lineCap = "round"
                    ctx.lineJoin = "round"
                    for (var pass = 0; pass < 2; pass++) {
                      ctx.strokeStyle = pass === 0 ? pal.roadEdge : pal.road
                      ctx.lineWidth = pass === 0 ? s * 0.2 : s * 0.11
                      Scenario.ROADS.forEach(function (chain) {
                        ctx.beginPath()
                        for (var i = 0; i < chain.length; i++) {
                          var a = Hex.offsetToAxial(chain[i][0], chain[i][1])
                          var c = centerOf(a.q, a.r)
                          if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y)
                        }
                        ctx.stroke()
                      })
                    }
                  }

                  function isWater(state, q, r) {
                    var code = Engine.terrainCodeAt(state, q, r)
                    return code === "river" || code === "bridge"
                  }

                  function rivers(ctx, state, s) {
                    ctx.lineCap = "round"
                    for (var pass = 0; pass < 2; pass++) {
                      ctx.strokeStyle = pass === 0 ? pal.bank : pal.water
                      ctx.lineWidth = pass === 0 ? s * 0.38 : s * 0.22
                      for (var row = 0; row < Scenario.HEIGHT; row++) {
                        for (var col = 0; col < Scenario.WIDTH; col++) {
                          var a = Hex.offsetToAxial(col, row)
                          if (!isWater(state, a.q, a.r)) continue
                          var c = centerOf(a.q, a.r)
                          var ns = Hex.neighbors(a.q, a.r)
                          for (var i = 0; i < ns.length; i++) {
                            if (!isWater(state, ns[i].q, ns[i].r)) continue
                            var n = centerOf(ns[i].q, ns[i].r)
                            ctx.beginPath()
                            ctx.moveTo(c.x, c.y)
                            ctx.lineTo((c.x + n.x) / 2, (c.y + n.y) / 2)
                            ctx.stroke()
                          }
                          if (row === 0 || row === Scenario.HEIGHT - 1) {
                            ctx.beginPath()
                            ctx.moveTo(c.x, c.y)
                            ctx.lineTo(c.x, c.y + (row === 0 ? -s : s))
                            ctx.stroke()
                          }
                        }
                      }
                    }
                  }

                  function bridge(ctx, cx, cy, s) {
                    ctx.fillStyle = pal.bridge
                    ctx.fillRect(cx - s * 0.5, cy - s * 0.09, s * 1.0, s * 0.18)
                    ctx.fillStyle = pal.road
                    ctx.fillRect(cx - s * 0.5, cy - s * 0.05, s * 1.0, s * 0.1)
                  }

                  // ---- units ---------------------------------------------------
                  function figure(ctx, x, y, u) {
                    ctx.beginPath(); ctx.arc(x, y - u * 0.55, u * 0.13, 0, Math.PI * 2); ctx.fill()
                    ctx.beginPath()
                    ctx.moveTo(x - u * 0.16, y + u * 0.15)
                    ctx.lineTo(x - u * 0.1, y - u * 0.4)
                    ctx.lineTo(x + u * 0.1, y - u * 0.4)
                    ctx.lineTo(x + u * 0.16, y + u * 0.15)
                    ctx.closePath(); ctx.fill()
                    ctx.fillRect(x - u * 0.15, y + u * 0.1, u * 0.1, u * 0.3)
                    ctx.fillRect(x + u * 0.05, y + u * 0.1, u * 0.1, u * 0.3)
                    ctx.lineWidth = Math.max(1, u * 0.06)
                    ctx.beginPath(); ctx.moveTo(x - u * 0.3, y + u * 0.05); ctx.lineTo(x + u * 0.3, y - u * 0.45); ctx.stroke()
                  }

                  function wheel(ctx, x, y, r) {
                    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
                  }

                  function silhouette(ctx, type, cx, cy, u, color) {
                    ctx.fillStyle = color
                    ctx.strokeStyle = color
                    ctx.lineCap = "round"
                    switch (type) {
                      case "armor":
                        ctx.beginPath()
                        ctx.moveTo(-0.95 * u + cx, 0.1 * u + cy)
                        ctx.lineTo(-0.75 * u + cx, -0.12 * u + cy)
                        ctx.lineTo(0.8 * u + cx, -0.12 * u + cy)
                        ctx.lineTo(0.95 * u + cx, 0.1 * u + cy)
                        ctx.lineTo(0.95 * u + cx, 0.3 * u + cy)
                        ctx.lineTo(-0.95 * u + cx, 0.3 * u + cy)
                        ctx.closePath(); ctx.fill()
                        ctx.fillRect(cx - 0.4 * u, cy - 0.4 * u, 0.7 * u, 0.3 * u)
                        ctx.lineWidth = Math.max(1.5, u * 0.1)
                        ctx.beginPath(); ctx.moveTo(cx + 0.25 * u, cy - 0.26 * u); ctx.lineTo(cx + 1.15 * u, cy - 0.32 * u); ctx.stroke()
                        for (var w = 0; w < 5; w++) wheel(ctx, cx - 0.7 * u + w * 0.35 * u, cy + 0.38 * u, u * 0.12)
                        break
                      case "recon":
                        ctx.beginPath()
                        ctx.moveTo(cx - 0.85 * u, cy + 0.2 * u)
                        ctx.lineTo(cx - 0.7 * u, cy - 0.15 * u)
                        ctx.lineTo(cx + 0.6 * u, cy - 0.15 * u)
                        ctx.lineTo(cx + 0.85 * u, cy + 0.2 * u)
                        ctx.closePath(); ctx.fill()
                        ctx.fillRect(cx - 0.25 * u, cy - 0.4 * u, 0.4 * u, 0.28 * u)
                        wheel(ctx, cx - 0.55 * u, cy + 0.3 * u, u * 0.17)
                        wheel(ctx, cx + 0.05 * u, cy + 0.3 * u, u * 0.17)
                        wheel(ctx, cx + 0.6 * u, cy + 0.3 * u, u * 0.17)
                        break
                      case "mechInfantry":
                        ctx.beginPath()
                        ctx.moveTo(cx - 0.9 * u, cy + 0.2 * u)
                        ctx.lineTo(cx - 0.9 * u, cy - 0.1 * u)
                        ctx.lineTo(cx - 0.55 * u, cy - 0.1 * u)
                        ctx.lineTo(cx - 0.4 * u, cy - 0.35 * u)
                        ctx.lineTo(cx + 0.85 * u, cy - 0.35 * u)
                        ctx.lineTo(cx + 0.85 * u, cy + 0.2 * u)
                        ctx.closePath(); ctx.fill()
                        wheel(ctx, cx - 0.65 * u, cy + 0.3 * u, u * 0.17)
                        ctx.fillRect(cx - 0.15 * u, cy + 0.15 * u, 0.95 * u, 0.25 * u)
                        break
                      case "infantry":
                        figure(ctx, cx - 0.4 * u, cy, u)
                        figure(ctx, cx + 0.4 * u, cy, u)
                        break
                      case "eliteInfantry":
                        figure(ctx, cx - 0.65 * u, cy + 0.05 * u, u)
                        figure(ctx, cx, cy - 0.1 * u, u)
                        figure(ctx, cx + 0.65 * u, cy + 0.05 * u, u)
                        break
                      case "antiTank":
                        ctx.beginPath()
                        ctx.moveTo(cx - 0.35 * u, cy - 0.35 * u)
                        ctx.lineTo(cx + 0.25 * u, cy - 0.35 * u)
                        ctx.lineTo(cx + 0.4 * u, cy + 0.15 * u)
                        ctx.lineTo(cx - 0.5 * u, cy + 0.15 * u)
                        ctx.closePath(); ctx.fill()
                        ctx.lineWidth = Math.max(1.5, u * 0.1)
                        ctx.beginPath(); ctx.moveTo(cx, cy - 0.15 * u); ctx.lineTo(cx + 1.1 * u, cy - 0.45 * u); ctx.stroke()
                        ctx.beginPath(); ctx.moveTo(cx - 0.1 * u, cy + 0.1 * u); ctx.lineTo(cx - 0.9 * u, cy + 0.4 * u); ctx.stroke()
                        wheel(ctx, cx - 0.3 * u, cy + 0.3 * u, u * 0.17)
                        wheel(ctx, cx + 0.25 * u, cy + 0.3 * u, u * 0.17)
                        break
                      case "artillery":
                        ctx.lineWidth = Math.max(2, u * 0.16)
                        ctx.beginPath(); ctx.moveTo(cx - 0.2 * u, cy + 0.1 * u); ctx.lineTo(cx + 0.95 * u, cy - 0.55 * u); ctx.stroke()
                        ctx.lineWidth = Math.max(1.5, u * 0.1)
                        ctx.beginPath(); ctx.moveTo(cx - 0.2 * u, cy + 0.15 * u); ctx.lineTo(cx - 1.0 * u, cy + 0.4 * u); ctx.stroke()
                        ctx.fillRect(cx - 0.45 * u, cy - 0.15 * u, 0.5 * u, 0.3 * u)
                        wheel(ctx, cx - 0.2 * u, cy + 0.22 * u, u * 0.3)
                        ctx.fillStyle = pal.snow
                        wheel(ctx, cx - 0.2 * u, cy + 0.22 * u, u * 0.12)
                        break
                    }
                  }

                  function unit(ctx, unit, cx, cy, s, isSelected, isTarget, cutOff) {
                    var u = s * 0.5
                    var spent = unit.side === "axis" && unit.attacked && !(unit.overrun && !unit.moved)
                    ctx.save()
                    if (spent) ctx.globalAlpha = 0.55
                    silhouette(ctx, unit.type, cx, cy - s * 0.12, u, unit.side === "axis" ? pal.axisUnit : pal.alliedUnit)
                    ctx.restore()

                    var bw = s * 0.5, bh = s * 0.3
                    var bx = cx - bw / 2 + s * 0.1, by = cy + s * 0.28
                    ctx.fillStyle = pal.strengthBox
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
                      ctx.fillStyle = pal.objectiveRing
                      ctx.fillRect(bx + bw + s * 0.05, by + bh - (e + 1) * bh * 0.3, s * 0.1, bh * 0.22)
                    }

                    // Experience bars under the strength box.
                    var bars = Engine.xpBars(unit)
                    for (var x = 0; x < bars; x++) {
                      ctx.fillStyle = "#f4f4ee"
                      ctx.fillRect(bx + x * s * 0.1, by + bh + 2, s * 0.07, s * 0.1)
                      ctx.strokeStyle = "#222"
                      ctx.lineWidth = 1
                      ctx.strokeRect(bx + x * s * 0.1, by + bh + 2, s * 0.07, s * 0.1)
                    }

                    if (cutOff) {
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

                    if (isSelected || isTarget) {
                      hexPath(ctx, cx, cy, s - 2)
                      ctx.lineWidth = 3
                      ctx.strokeStyle = isSelected ? "#101010" : "#d8231b"
                      ctx.stroke()
                    }
                  }

                  // ---- movement arrows -----------------------------------------
                  // One sweeping arrow per unit through every hex it has moved
                  // to, campaign-map style: red for the Axis, blue for the Allies.
                  function arrows(ctx, state, s) {
                    var chains = {}, order = []
                    state.moves.forEach(function (m) {
                      if (!chains[m.unitId]) { chains[m.unitId] = { side: m.side, pts: [centerOf(m.from.q, m.from.r)] }; order.push(m.unitId) }
                      chains[m.unitId].pts.push(centerOf(m.to.q, m.to.r))
                    })
                    ctx.lineCap = "round"
                    ctx.lineJoin = "round"
                    order.forEach(function (id) {
                      var chain = chains[id]
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

                  // ---- weather overlay -----------------------------------------
                  function weather(ctx, code, w, h, s) {
                    if (code === "overcast") {
                      ctx.fillStyle = "rgba(150,158,168,0.16)"
                      ctx.fillRect(0, 0, w, h)
                    } else if (code === "snow") {
                      ctx.fillStyle = "rgba(190,196,204,0.14)"
                      ctx.fillRect(0, 0, w, h)
                      ctx.fillStyle = "rgba(255,255,255,0.8)"
                      for (var i = 0; i < 260; i++) {
                        var x = noise(i, 7, 1) * w, y = noise(i, 7, 2) * h, rad = 1 + noise(i, 7, 3) * s * 0.05
                        ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill()
                      }
                    }
                  }

                  // ---- combat effects ------------------------------------------
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

                  function plane(ctx, x, y, heading, u, color) {
                    ctx.save()
                    ctx.translate(x, y)
                    ctx.rotate(heading)
                    ctx.fillStyle = color
                    ctx.beginPath(); ctx.ellipse(-u * 0.9, -u * 0.12, u * 1.8, u * 0.24); ctx.fill()
                    ctx.beginPath()
                    ctx.moveTo(-u * 0.1, 0); ctx.lineTo(-u * 0.35, -u * 0.95); ctx.lineTo(u * 0.15, -u * 0.95)
                    ctx.lineTo(u * 0.3, 0); ctx.lineTo(u * 0.15, u * 0.95); ctx.lineTo(-u * 0.35, u * 0.95)
                    ctx.closePath(); ctx.fill()
                    ctx.beginPath()
                    ctx.moveTo(-u * 0.9, 0); ctx.lineTo(-u * 0.95, -u * 0.4); ctx.lineTo(-u * 0.65, -u * 0.4)
                    ctx.lineTo(-u * 0.55, 0); ctx.lineTo(-u * 0.65, u * 0.4); ctx.lineTo(-u * 0.95, u * 0.4)
                    ctx.closePath(); ctx.fill()
                    ctx.restore()
                  }

                  // Fighter-bomber sweeps in from its side's map edge, bombs, and flies on.
                  function airRaid(ctx, ev, t, s, w) {
                    var b = centerOf(ev.to.q, ev.to.r)
                    var fromWest = ev.side === "allies"
                    var x0 = fromWest ? -s * 2 : w + s * 2, x1 = fromWest ? w + s * 2 : -s * 2
                    var f = t
                    var px = x0 + (x1 - x0) * f
                    var arrive = (b.x - x0) / (x1 - x0)
                    var py = b.y - s * 1.2 - Math.abs(f - arrive) * s * 2.2
                    var heading = fromWest ? 0 : Math.PI
                    var color = fromWest ? "#2f4a7a" : "#3a3a3a"
                    if (f > arrive - 0.12 && f < arrive) {
                      ctx.strokeStyle = "rgba(0,0,0,0.6)"
                      ctx.lineWidth = Math.max(1.5, s * 0.06)
                      var bf = (f - (arrive - 0.12)) / 0.12
                      var bx = px + (b.x - px) * bf, by = py + (b.y - py) * bf
                      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke()
                      ctx.fillStyle = "#222"
                      ctx.beginPath(); ctx.arc(bx, by, Math.max(2, s * 0.08), 0, Math.PI * 2); ctx.fill()
                    }
                    if (f >= arrive) explosion(ctx, b, Math.min(1, (f - arrive) / (1 - arrive)), s, ev.destroyed)
                    plane(ctx, px, py, heading, s * 0.55, color)
                  }

                  function shot(ctx, ev, t, s) {
                    var a = centerOf(ev.from.q, ev.from.r)
                    var b = centerOf(ev.to.q, ev.to.r)
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
                }

                // ---- static layer: terrain, roads, rivers, grid, town labels ----
                Canvas {
                  id: terrainCanvas
                  anchors.centerIn: parent
                  width: root.hexSize * (Math.sqrt(3) * Scenario.WIDTH + 2)
                  height: root.hexSize * (1.5 * Scenario.HEIGHT + 1.5)
                  onWidthChanged: requestPaint()

                  onPaint: {
                    var ctx = getContext("2d")
                    ctx.clearRect(0, 0, width, height)
                    var state = root.gameState
                    var s = root.hexSize
                    var row, col, a, c

                    for (row = 0; row < Scenario.HEIGHT; row++)
                      for (col = 0; col < Scenario.WIDTH; col++) {
                        a = Hex.offsetToAxial(col, row)
                        c = draw.centerOf(a.q, a.r)
                        draw.tile(ctx, state.terrain[row][col], c.x, c.y, s, a.q, a.r)
                      }
                    draw.roads(ctx, s)
                    draw.rivers(ctx, state, s)

                    for (row = 0; row < Scenario.HEIGHT; row++)
                      for (col = 0; col < Scenario.WIDTH; col++) {
                        a = Hex.offsetToAxial(col, row)
                        c = draw.centerOf(a.q, a.r)
                        if (state.terrain[row][col] === "bridge") draw.bridge(ctx, c.x, c.y, s)
                        draw.hexPath(ctx, c.x, c.y, s)
                        ctx.lineWidth = 1
                        ctx.strokeStyle = draw.pal.gridLine
                        ctx.stroke()
                        var obj = Engine.objectiveAt(state, a.q, a.r)
                        if (obj) {
                          draw.hexPath(ctx, c.x, c.y, s - 1.5)
                          ctx.lineWidth = 2
                          ctx.strokeStyle = draw.pal.objectiveRing
                          ctx.stroke()
                          ctx.fillStyle = "#1c1c1c"
                          ctx.textAlign = "center"
                          ctx.textBaseline = "middle"
                          ctx.font = "bold " + Math.max(8, Math.round(s * 0.24)) + "px sans-serif"
                          ctx.fillText(obj.name, c.x, c.y + s * 0.78)
                        }
                      }
                  }
                }

                // ---- history layer: movement arrows for the whole battle -------
                Canvas {
                  id: trailCanvas
                  anchors.fill: terrainCanvas
                  visible: root.showTrails
                  property int paintRev: root.rev
                  onPaintRevChanged: requestPaint()
                  onWidthChanged: requestPaint()
                  onPaint: {
                    var ctx = getContext("2d")
                    ctx.clearRect(0, 0, width, height)
                    draw.arrows(ctx, root.gameState, root.hexSize)
                  }
                }

                // ---- dynamic layer: highlights, flags, units, effects ----------
                Canvas {
                  id: unitCanvas
                  anchors.fill: terrainCanvas

                  property int paintRev: root.rev
                  property var paintHover: root.hoverHex
                  property real paintT: root.animT
                  property var paintAnim: root.anim
                  property bool paintAir: root.airMode
                  onPaintRevChanged: requestPaint()
                  onPaintHoverChanged: requestPaint()
                  onPaintTChanged: requestPaint()
                  onPaintAnimChanged: requestPaint()
                  onPaintAirChanged: requestPaint()
                  onWidthChanged: requestPaint()

                  onPaint: {
                    var ctx = getContext("2d")
                    ctx.clearRect(0, 0, width, height)
                    var state = root.gameState
                    var s = root.hexSize
                    var sel = root.busy ? null : root.selectedUnit()
                    var reach = sel ? Engine.reachable(state, sel) : {}
                    var targets = sel ? Engine.attackTargets(state, sel) : []
                    var hover = root.hoverHex
                    var anim = root.anim
                    var movingId = anim && anim.kind === "move" ? anim.unitId : null
                    var row, col, a, c

                    draw.weather(ctx, Engine.weatherCodeAt(state, state.turn), width, height, s)

                    for (row = 0; row < Scenario.HEIGHT; row++)
                      for (col = 0; col < Scenario.WIDTH; col++) {
                        a = Hex.offsetToAxial(col, row)
                        c = draw.centerOf(a.q, a.r)
                        if (reach[Hex.key(a.q, a.r)] !== undefined) {
                          draw.hexPath(ctx, c.x, c.y, s - 1)
                          ctx.fillStyle = "rgba(250, 225, 90, 0.35)"
                          ctx.fill()
                        }
                        var obj = Engine.objectiveAt(state, a.q, a.r)
                        if (obj) draw.flag(ctx, obj.owner, c.x - s * 0.62, c.y - s * 0.72, s * 0.3, s * 0.22)

                        var unit = Engine.unitAt(state, a.q, a.r)
                        if (unit && unit.id !== movingId) {
                          var isTarget = root.airMode ? unit.side === "allies" : targets.some(function (t) { return t.id === unit.id })
                          draw.unit(ctx, unit, c.x, c.y, s, sel && sel.id === unit.id, isTarget, !Engine.isSupplied(state, unit))
                        }

                        if (hover && hover.q === a.q && hover.r === a.r) {
                          draw.hexPath(ctx, c.x, c.y, s - 2)
                          ctx.lineWidth = 2
                          ctx.strokeStyle = "rgba(255,255,255,0.9)"
                          ctx.stroke()
                        }
                      }

                    if (!anim) return
                    if (anim.kind === "move") {
                      var mover = Engine.unitById(state, anim.unitId)
                      var from = draw.centerOf(anim.from.q, anim.from.r)
                      var to = draw.centerOf(anim.to.q, anim.to.r)
                      var f = draw.ease(root.animT)
                      if (mover) draw.unit(ctx, mover, from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f, s, false, false, false)
                    } else if (anim.kind === "attack") {
                      draw.shot(ctx, anim, root.animT, s)
                    } else if (anim.kind === "air") {
                      draw.airRaid(ctx, anim, root.animT, s, width)
                    }
                  }

                  MouseArea {
                    anchors.fill: parent
                    hoverEnabled: true
                    function hexAt(mouse) {
                      var h = Hex.fromPixel(mouse.x - root.hexSize, mouse.y - root.hexSize, root.hexSize)
                      return Engine.inBounds(root.gameState, h.q, h.r) ? h : null
                    }
                    onPositionChanged: function (mouse) {
                      var h = hexAt(mouse)
                      var same = (!h && !root.hoverHex) || (h && root.hoverHex && h.q === root.hoverHex.q && h.r === root.hoverHex.r)
                      if (!same) root.hoverHex = h
                    }
                    onExited: root.hoverHex = null
                    onClicked: function (mouse) {
                      var h = hexAt(mouse)
                      if (h) root.handleHexClick(h.q, h.r)
                    }
                  }
                }
              }
            }
          }

          // Sidebar
          ColumnLayout {
            Layout.preferredWidth: Style.space(300)
            Layout.minimumWidth: Style.space(300)
            Layout.maximumWidth: Style.space(300)
            Layout.fillHeight: true
            spacing: Style.spacing.md

            Rectangle {
              Layout.fillWidth: true
              Layout.preferredHeight: Style.space(120)
              color: Color.popups.background
              radius: Style.cornerRadius
              ColumnLayout {
                anchors.fill: parent
                anchors.margins: Style.spacing.md
                spacing: Style.spacing.xs
                Text {
                  text: "Selected unit"
                  font.pixelSize: Style.font.caption
                  color: Color.foreground
                  opacity: 0.6
                }
                Text {
                  text: { root.rev; var u = root.selectedUnit(); return u ? u.name : "-- none (Tab cycles units) --" }
                  font.pixelSize: Style.font.body
                  font.bold: true
                  color: Color.foreground
                  wrapMode: Text.WordWrap
                  Layout.fillWidth: true
                }
                Text {
                  text: {
                    root.rev
                    var u = root.selectedUnit()
                    if (!u) return ""
                    var t = Units.typeOf(u)
                    return t.label + " -- strength " + u.strength + "/10 -- move " + Engine.moveAllowanceOf(gameState, u) +
                           (t.range > 1 ? " -- range " + t.range : "") +
                           "\n" + Engine.xpLabel(u) + " (" + Engine.xpBars(u) + "/5 bars, +" + (Engine.xpBars(u) * 10) + "% attack and defence)" +
                           (u.entrenchment ? " -- dug in " + u.entrenchment : "") +
                           (u.overrun && !u.moved ? "\nOverrun! May still advance " + Engine.moveAllowanceOf(gameState, u) + " MP."
                            : (u.attacked ? "\nHas fired this turn." : (u.moved ? "\nHas moved; may still attack." : "")))
                  }
                  font.pixelSize: Style.font.caption
                  color: Color.foreground
                  opacity: 0.8
                  wrapMode: Text.WordWrap
                  Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
              }
            }

            Rectangle {
              Layout.fillWidth: true
              Layout.preferredHeight: Style.space(96)
              color: Color.popups.background
              radius: Style.cornerRadius
              ColumnLayout {
                anchors.fill: parent
                anchors.margins: Style.spacing.md
                spacing: Style.spacing.xs
                Text {
                  text: "Under cursor"
                  font.pixelSize: Style.font.caption
                  color: Color.foreground
                  opacity: 0.6
                }
                Text {
                  text: { var t = root.hoverText(); return t || "Hover a hex for terrain, unit and attack odds." }
                  font.pixelSize: Style.font.caption
                  color: Color.foreground
                  opacity: root.hoverText() ? 0.9 : 0.5
                  wrapMode: Text.WordWrap
                  Layout.fillWidth: true
                }
                Item { Layout.fillHeight: true }
              }
            }

            Rectangle {
              Layout.fillWidth: true
              Layout.fillHeight: true
              color: Color.popups.background
              radius: Style.cornerRadius
              ColumnLayout {
                anchors.fill: parent
                anchors.margins: Style.spacing.md
                spacing: Style.spacing.xs
                Text {
                  text: "Battle log"
                  font.pixelSize: Style.font.caption
                  color: Color.foreground
                  opacity: 0.6
                }
                Flickable {
                  Layout.fillWidth: true
                  Layout.fillHeight: true
                  clip: true
                  contentHeight: logColumn.implicitHeight
                  ColumnLayout {
                    id: logColumn
                    width: parent.width
                    spacing: Style.spacing.xs
                    Repeater {
                      model: { root.rev; return root.gameState.log.slice(0, 60) }
                      Text {
                        Layout.fillWidth: true
                        text: modelData
                        font.pixelSize: Style.font.bodySmall
                        color: Color.foreground
                        opacity: 0.85
                        wrapMode: Text.WordWrap
                      }
                    }
                  }
                }
              }
            }

            Text {
              Layout.fillWidth: true
              visible: { root.rev; return !!root.gameState.resultText }
              text: { root.rev; return root.gameState.resultText }
              wrapMode: Text.WordWrap
              font.bold: true
              font.pixelSize: Style.font.body
              color: Color.accent
            }

            Rectangle {
              Layout.fillWidth: true
              height: Style.space(34)
              radius: Style.cornerRadius
              visible: { root.rev; return root.phase === "axis" && !root.gameState.gameOver && Engine.airAvailable(root.gameState) }
              color: root.airMode ? "#d8231b" : Color.popups.background
              border.color: Color.accent
              border.width: 1
              opacity: root.canAir() || root.airMode ? 1 : 0.45
              Text {
                anchors.centerIn: parent
                text: {
                  root.rev
                  if (root.airMode) return "Click an enemy to bomb -- Esc cancels"
                  return "Luftwaffe strike (A) -- " + root.gameState.airStrikes + " sortie" + (root.gameState.airStrikes === 1 ? "" : "s") + " left"
                }
                color: root.airMode ? "#ffffff" : Color.foreground
                font.bold: true
                font.pixelSize: Style.font.caption
              }
              MouseArea { anchors.fill: parent; onClicked: root.toggleAirMode() }
            }

            Rectangle {
              Layout.fillWidth: true
              height: Style.space(40)
              radius: Style.cornerRadius
              color: Color.accent
              opacity: root.busy && !root.gameState.gameOver ? 0.45 : 1
              Text {
                anchors.centerIn: parent
                text: {
                  root.rev
                  if (root.gameState.gameOver) return "New Game  (N)"
                  return root.phase === "allies" ? "Allied phase..." : "End Turn  (Enter)"
                }
                color: "#101010"
                font.bold: true
              }
              MouseArea { anchors.fill: parent; onClicked: root.endTurn() }
            }

            Text {
              Layout.fillWidth: true
              text: "Click a unit, then a highlighted hex to move or a red-ringed enemy to attack. Tab: next unit. A: air strike. M: movement arrows. Esc: close."
              font.pixelSize: Style.font.caption
              color: Color.foreground
              opacity: 0.5
              wrapMode: Text.WordWrap
            }
          }
        }
      }
    }
  }

  IpcHandler {
    target: "hexgeneral"
    function open(): void { root.open("{}") }
    function close(): void { root.close() }
    function toggle(): void { root.toggle() }
  }
}
