// Hex General -- the game view. Hosted by shell.qml in a normal window.
//
// One scenario: "Ardennes, Winter 1944" at regiment / Kampfgruppe scale.
// The player commands the Axis; the Allied side is run by a rule-based AI
// (see Engine.js). Game state is one plain JS object (`gameState`) mutated
// in place by Engine.js's functions; `rev` is bumped after every mutation
// so the property bindings below (which read `rev` purely as a dependency)
// re-evaluate even though QML can't see inside a mutated plain object.
//
// The map is three stacked Canvases drawn by Art.js: a static terrain
// layer (tiles, roads, rivers) painted once per size, a history layer with
// the movement arrows, and a unit layer repainted on every state change
// and animation frame. Moves, shots and air raids are queued as animations
// so the Allied phase plays out one unit at a time. The game autosaves to
// ~/.local/state/hex-general/save.json between turns.
import QtQuick
import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import "Hex.js" as Hex
import "Units.js" as Units
import "Scenario.js" as Scenario
import "Engine.js" as Engine
import "Art.js" as Art
import "Sprites.js" as Sprites

Item {
  id: root

  signal quitRequested()

  property var gameState: Engine.createState()
  property int rev: 0
  property string phase: "axis"
  property var hoverHex: null   // axial {q, r} under the cursor, or null
  property bool showTrails: true
  property bool airMode: false   // waiting for the player to pick an air-strike target
  property bool fast: false      // play animations at triple speed
  property real zoom: 1          // 1 = whole map fits; up to 3

  // Animation playback: `anim` is the event being shown (see Engine's
  // moveEvent/attackEvent/airStrike), `animT` runs 0 -> 1 over its duration.
  property var anim: null
  property real animT: 0
  property var animQueue: []
  readonly property bool busy: anim !== null || phase === "allies"

  // ---- theme ----------------------------------------------------------
  QtObject {
    id: theme
    readonly property color background: "#26241f"
    readonly property color surface: "#332f28"
    readonly property color border: "#5a5245"
    readonly property color foreground: "#ebe5d6"
    readonly property color accent: "#d9a441"
    readonly property int title: 20
    readonly property int body: 14
    readonly property int small: 13
    readonly property int caption: 12
    readonly property int lg: 16
    readonly property int md: 12
    readonly property int sm: 8
    readonly property int xs: 4
    readonly property int radius: 8
  }

  // Hex size that fits the whole map in the map box, times the zoom; the
  // Flickable scrolls whatever does not fit.
  readonly property real hexSize: {
    var cols = Math.sqrt(3) * Scenario.WIDTH + 2
    var rows = 1.5 * Scenario.HEIGHT + 1.5
    return Math.max(14, Math.min(mapFlick.width / cols, mapFlick.height / rows)) * zoom
  }

  function setZoom(z) {
    var next = Math.max(1, Math.min(3, z))
    var cx = (mapFlick.contentX + mapFlick.width / 2) / mapHolder.width
    var cy = (mapFlick.contentY + mapFlick.height / 2) / mapHolder.height
    zoom = next
    mapFlick.contentX = Math.max(0, cx * mapHolder.width - mapFlick.width / 2)
    mapFlick.contentY = Math.max(0, cy * mapHolder.height - mapFlick.height / 2)
  }

  // ---- save / load ----------------------------------------------------
  readonly property string stateDir: Quickshell.env("HOME") + "/.local/state/hex-general"

  Process { command: ["mkdir", "-p", root.stateDir]; running: true }

  FileView {
    id: saveFile
    path: root.stateDir + "/save.json"
    blockLoading: true
    printErrors: false
  }

  function saveGame() {
    if (phase !== "axis" || anim) return
    var json = JSON.stringify(gameState, function (k, v) { return k === "_index" || k === "ai" ? undefined : v })
    saveFile.setText(json)
  }

  function loadGame() {
    var text = ""
    try { text = saveFile.text() } catch (e) { return false }
    if (!text) return false
    try {
      var saved = JSON.parse(text)
      if (!saved || !saved.units || saved.gameOver || saved.phase !== "axis") return false
      saved._index = null
      saved.ai = null
      gameState = saved
      phase = "axis"
      rev++
      return true
    } catch (e) { return false }
  }

  Timer {
    id: saveTimer
    interval: 800
    onTriggered: root.saveGame()
  }
  onRevChanged: saveTimer.restart()

  // ---- optional external sprite sheets --------------------------------
  readonly property string spriteDir: Quickshell.env("HOME") + "/.local/share/hex-general/sprites"
  property var spriteSheets: ({})   // side -> { url, sprites }

  FileView {
    id: spriteConfig
    path: root.spriteDir + "/sprites.json"
    blockLoading: true
    printErrors: false
  }

  function loadSpriteSheets() {
    var text = ""
    try { text = spriteConfig.text() } catch (e) { return }
    if (!text) return
    try {
      var cfg = JSON.parse(text)
      var sheets = {}
      ;["axis", "allies"].forEach(function (side) {
        if (!cfg[side] || !cfg[side].file || !cfg[side].sprites) return
        sheets[side] = { url: "file://" + root.spriteDir + "/" + cfg[side].file, sprites: cfg[side].sprites }
        unitCanvas.loadImage(sheets[side].url)
      })
      spriteSheets = sheets
    } catch (e) { console.warn("sprites.json:", e) }
  }

  Component.onCompleted: { loadGame(); loadSpriteSheets() }

  // ---- game actions ---------------------------------------------------
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
      if (phase === "allies" && !gameState.gameOver) { pauseTimer.interval = fast ? 80 : 320; pauseTimer.start() }
      return
    }
    var next = animQueue[0]
    animQueue = animQueue.slice(1)
    anim = next
    animT = 0
    var ms = next.kind === "move" ? 420 + 220 * Hex.distance(next.from, next.to)
      : next.kind === "air" ? (next.destroyed ? 1800 : 1500)
      : (next.destroyed ? 1300 : 1000)
    animator.duration = fast ? Math.round(ms / 3) : ms
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

  // ---- text helpers ---------------------------------------------------
  function hoverText() {
    root.rev
    if (!hoverHex) return ""
    var terrain = Engine.terrainAt(gameState, hoverHex.q, hoverHex.r)
    if (!terrain) return ""
    var o = Hex.axialToOffset(hoverHex.q, hoverHex.r)
    var town = Scenario.townAt(o.col, o.row)
    var obj = Engine.objectiveAt(gameState, hoverHex.q, hoverHex.r)
    var road = gameState.roads[Hex.key(hoverHex.q, hoverHex.r)]
    var line = (town ? town.name + (obj ? " (" + obj.points + " pts, " + (obj.owner === "axis" ? "Axis" : "Allied") + ")" : "") + " -- " : "") +
               terrain.label + (road ? " + road" : "") +
               " -- move cost " + Engine.moveCost(gameState, hoverHex.q, hoverHex.r) +
               (terrain.defBonus ? ", defence +" + terrain.defBonus : "")
    var unit = Engine.unitAt(gameState, hoverHex.q, hoverHex.r)
    if (unit) {
      var t = Units.typeOf(unit)
      line += "\n" + unit.name + " -- " + Sprites.labelFor(unit) + ", " + unit.strength + "/10, " + Engine.xpLabel(unit).toLowerCase() +
              (Engine.xpBars(unit) ? " (" + Engine.xpBars(unit) + " bars)" : "") +
              (unit.entrenchment ? ", dug in " + unit.entrenchment : "") +
              (Engine.isSupplied(gameState, unit) ? "" : " -- CUT OFF from supply, no replacements")
      if (unit.type === "supply") line += "\nSupplies friends within 2 hexes; +1 replacement step next to it. Stock: " + unit.stock + "/3 turns"
      var sel = selectedUnit()
      if (airMode && unit.side === "allies") {
        var cover = terrain.defBonus > 0 || unit.entrenchment >= 2
        line += "\nAir strike target -- " + (cover ? "in cover, 1 step" : "in the open, 1-2 steps")
      } else if (sel && unit.side === "allies" && Engine.canAttack(gameState, sel, unit)) {
        var odds = Engine.combatOdds(gameState, sel, unit)
        var help = Engine.supporters(gameState, unit)
        line += "\nAttack odds " + odds.toFixed(1) + ":1 -- " + Engine.oddsLabel(odds) +
                (help.length ? "\nSupport fire from " + help.map(function (u) { return u.name }).join(", ") : "")
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

  function centerOf(q, r) {
    var p = Hex.toPixel(q, r, root.hexSize)
    return { x: p.x + root.hexSize, y: p.y + root.hexSize }
  }

  // ---- layout ---------------------------------------------------------
  Rectangle {
    id: card
    anchors.fill: parent
    color: theme.background
    focus: true

    Keys.onPressed: function (event) {
      switch (event.key) {
        case Qt.Key_Escape: if (root.airMode) root.airMode = false; else root.quitRequested(); break
        case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Space: root.endTurn(); break
        case Qt.Key_Tab: root.selectNext(); break
        case Qt.Key_N: root.newGame(); break
        case Qt.Key_M: root.showTrails = !root.showTrails; break
        case Qt.Key_A: root.toggleAirMode(); break
        case Qt.Key_F: root.fast = !root.fast; break
        case Qt.Key_Plus: case Qt.Key_Equal: root.setZoom(root.zoom * 1.25); break
        case Qt.Key_Minus: root.setZoom(root.zoom / 1.25); break
        case Qt.Key_0: root.setZoom(1); break
        default: return
      }
      event.accepted = true
    }

    MouseArea { anchors.fill: parent; onClicked: card.forceActiveFocus() }

    ColumnLayout {
      anchors.fill: parent
      anchors.margins: theme.lg
      spacing: theme.md

      // ---------------------------------------------------------- header
      RowLayout {
        Layout.fillWidth: true
        spacing: theme.md

        ColumnLayout {
          spacing: 0
          Text {
            text: "Hex General -- Ardennes, Winter 1944"
            font.pixelSize: theme.title
            font.bold: true
            color: theme.foreground
          }
          Text {
            text: {
              root.rev
              var s = "Turn " + root.gameState.turn + " / " + Scenario.TURN_LIMIT + " -- " + Engine.dateOf(root.gameState.turn) + " -- "
              if (root.gameState.gameOver) return s + "Battle over"
              if (root.phase === "allies") return s + "Allied phase: the enemy is moving..." + (root.fast ? " (fast)" : "")
              return s + "Axis phase: move and attack, then End Turn"
            }
            font.pixelSize: theme.small
            color: root.phase === "allies" ? theme.accent : theme.foreground
            opacity: root.phase === "allies" ? 1 : 0.75
          }
          Text {
            text: root.weatherText()
            font.pixelSize: theme.small
            color: theme.foreground
            opacity: 0.75
          }
        }

        Item { Layout.fillWidth: true }

        Text {
          text: { root.rev; return "Objectives held: " + Engine.scoreFor(root.gameState, "axis") + " / " + Engine.totalObjectivePoints(root.gameState) }
          font.pixelSize: theme.body
          color: theme.accent
        }
      }

      // ------------------------------------------------------------ body
      RowLayout {
        Layout.fillWidth: true
        Layout.fillHeight: true
        spacing: theme.md

        // Map
        Rectangle {
          Layout.fillWidth: true
          Layout.fillHeight: true
          Layout.minimumWidth: 300
          color: "#1f2220"
          radius: theme.radius
          clip: true

          Flickable {
            id: mapFlick
            anchors.fill: parent
            anchors.margins: theme.sm
            contentWidth: mapHolder.width
            contentHeight: mapHolder.height
            boundsBehavior: Flickable.StopAtBounds

            Item {
              id: mapHolder
              width: Math.max(terrainCanvas.width, mapFlick.width)
              height: Math.max(terrainCanvas.height, mapFlick.height)

              // ---- static layer: terrain, roads, rivers, grid, town labels ----
              Canvas {
                id: terrainCanvas
                anchors.centerIn: parent
                width: root.hexSize * (Math.sqrt(3) * Scenario.WIDTH + 2)
                height: root.hexSize * (1.5 * Scenario.HEIGHT + 1.5)
                onWidthChanged: requestPaint()

                function isWater(state, q, r) {
                  var code = Engine.terrainCodeAt(state, q, r)
                  return code === "river" || code === "bridge"
                }

                onPaint: {
                  var ctx = getContext("2d")
                  ctx.clearRect(0, 0, width, height)
                  var state = root.gameState
                  var s = root.hexSize
                  var row, col, a, c, i

                  for (row = 0; row < Scenario.HEIGHT; row++)
                    for (col = 0; col < Scenario.WIDTH; col++) {
                      a = Hex.offsetToAxial(col, row)
                      c = root.centerOf(a.q, a.r)
                      Art.tile(ctx, state.terrain[row][col], c.x, c.y, s, a.q, a.r)
                    }

                  var chains = Scenario.ROAD_CHAINS.map(function (chain) {
                    return chain.map(function (h) { var ax = Hex.offsetToAxial(h[0], h[1]); return root.centerOf(ax.q, ax.r) })
                  })
                  Art.roads(ctx, chains, s)

                  // Rivers follow the authored waypoints; the Meuse (west edge) is a
                  // straight major river and runs off the map at both ends.
                  var riverChains = Scenario.RIVERS.map(function (pts) {
                    var major = pts[0][0] === 0 && pts[pts.length - 1][0] === 0
                    var hexes = major ? [pts[0], pts[pts.length - 1]] : Scenario.polyline(pts)
                    var centres = hexes.map(function (h) { var ax = Hex.offsetToAxial(h[0], h[1]); return root.centerOf(ax.q, ax.r) })
                    if (hexes[0][1] === 0) centres.unshift({ x: centres[0].x, y: centres[0].y - s * 1.5 })
                    if (hexes[hexes.length - 1][1] === Scenario.HEIGHT - 1) centres.push({ x: centres[centres.length - 1].x, y: centres[centres.length - 1].y + s * 1.5 })
                    return { pts: centres, major: major }
                  })
                  Art.rivers(ctx, riverChains, s)

                  // Bridges sit where a road chain crosses water, aligned with that road.
                  for (row = 0; row < Scenario.HEIGHT; row++)
                    for (col = 0; col < Scenario.WIDTH; col++) {
                      if (state.terrain[row][col] !== "bridge") continue
                      a = Hex.offsetToAxial(col, row)
                      c = root.centerOf(a.q, a.r)
                      var angle = 0
                      Scenario.ROAD_CHAINS.forEach(function (chain) {
                        for (i = 0; i < chain.length; i++) {
                          if (chain[i][0] !== col || chain[i][1] !== row) continue
                          var p0 = chain[Math.max(0, i - 1)], p1 = chain[Math.min(chain.length - 1, i + 1)]
                          var a0 = Hex.offsetToAxial(p0[0], p0[1]), a1 = Hex.offsetToAxial(p1[0], p1[1])
                          var c0 = root.centerOf(a0.q, a0.r), c1 = root.centerOf(a1.q, a1.r)
                          angle = Math.atan2(c1.y - c0.y, c1.x - c0.x)
                        }
                      })
                      Art.bridge(ctx, c.x, c.y, s, angle)
                    }

                  for (row = 0; row < Scenario.HEIGHT; row++)
                    for (col = 0; col < Scenario.WIDTH; col++) {
                      a = Hex.offsetToAxial(col, row)
                      c = root.centerOf(a.q, a.r)
                      Art.hexPath(ctx, c.x, c.y, s)
                      ctx.lineWidth = 1
                      ctx.strokeStyle = Art.PAL.grid
                      ctx.stroke()
                      var town = Scenario.townAt(col, row)
                      if (town) {
                        if (town.points) {
                          Art.hexPath(ctx, c.x, c.y, s - 1.5)
                          ctx.lineWidth = 2
                          ctx.strokeStyle = Art.PAL.objectiveRing
                          ctx.stroke()
                        }
                        ctx.fillStyle = town.points ? "#1c1c1c" : "rgba(30,30,30,0.75)"
                        ctx.textAlign = "center"
                        ctx.textBaseline = "middle"
                        ctx.font = (town.points ? "bold " : "") + Math.max(8, Math.round(s * 0.24)) + "px sans-serif"
                        ctx.fillText(town.name, c.x, c.y + s * 0.78)
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
                  var chains = {}, order = []
                  root.gameState.moves.forEach(function (m) {
                    if (!chains[m.unitId]) { chains[m.unitId] = { side: m.side, pts: [root.centerOf(m.from.q, m.from.r)] }; order.push(m.unitId) }
                    chains[m.unitId].pts.push(root.centerOf(m.to.q, m.to.r))
                  })
                  Art.arrows(ctx, order.map(function (id) { return chains[id] }), root.hexSize)
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

                // External sheets become usable once their image is in this canvas.
                onImageLoaded: {
                  for (var side in root.spriteSheets) {
                    var sheet = root.spriteSheets[side]
                    if (isImageLoaded(sheet.url)) Sprites.setExternal(side, sheet.url, sheet.sprites)
                  }
                  requestPaint()
                }

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
                  var fields = { axis: Engine.supplyField(state, "axis"), allies: Engine.supplyField(state, "allies") }
                  var row, col, a, c

                  Art.weather(ctx, Engine.weatherCodeAt(state, state.turn), width, height, s)

                  for (row = 0; row < Scenario.HEIGHT; row++)
                    for (col = 0; col < Scenario.WIDTH; col++) {
                      a = Hex.offsetToAxial(col, row)
                      c = root.centerOf(a.q, a.r)
                      if (reach[Hex.key(a.q, a.r)] !== undefined) {
                        Art.hexPath(ctx, c.x, c.y, s - 1)
                        ctx.fillStyle = "rgba(250, 225, 90, 0.35)"
                        ctx.fill()
                      }
                      var obj = Engine.objectiveAt(state, a.q, a.r)
                      if (obj) Art.flag(ctx, obj.owner, c.x - s * 0.62, c.y - s * 0.72, s * 0.3, s * 0.22)

                      var unit = Engine.unitAt(state, a.q, a.r)
                      if (unit && unit.id !== movingId) {
                        var isTarget = root.airMode ? unit.side === "allies" : targets.some(function (t) { return t.id === unit.id })
                        Art.counter(ctx, unit, c.x, c.y, s, {
                          selected: sel && sel.id === unit.id, target: isTarget,
                          cutOff: !Engine.isSupplied(state, unit, fields[unit.side]),
                          bars: Engine.xpBars(unit),
                          spent: unit.side === "axis" && unit.attacked && !(unit.overrun && !unit.moved)
                        })
                      }

                      if (hover && hover.q === a.q && hover.r === a.r) {
                        Art.hexPath(ctx, c.x, c.y, s - 2)
                        ctx.lineWidth = 2
                        ctx.strokeStyle = "rgba(255,255,255,0.9)"
                        ctx.stroke()
                      }
                    }

                  if (!anim) return
                  if (anim.kind === "move") {
                    var mover = Engine.unitById(state, anim.unitId)
                    var from = root.centerOf(anim.from.q, anim.from.r)
                    var to = root.centerOf(anim.to.q, anim.to.r)
                    var f = Art.ease(root.animT)
                    if (mover) Art.counter(ctx, mover, from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f, s, { bars: Engine.xpBars(mover) })
                  } else if (anim.kind === "attack") {
                    Art.shot(ctx, anim, root.centerOf(anim.from.q, anim.from.r), root.centerOf(anim.to.q, anim.to.r), root.animT, s)
                  } else if (anim.kind === "air") {
                    Art.airRaid(ctx, anim, root.centerOf(anim.to.q, anim.to.r), root.animT, s, width)
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
                    card.forceActiveFocus()
                    var h = hexAt(mouse)
                    if (h) root.handleHexClick(h.q, h.r)
                  }
                  onWheel: function (wheel) {
                    if (wheel.modifiers & Qt.ControlModifier) { root.setZoom(root.zoom * (wheel.angleDelta.y > 0 ? 1.15 : 1 / 1.15)); wheel.accepted = true }
                    else wheel.accepted = false
                  }
                }
              }
            }
          }
        }

        // Sidebar
        ColumnLayout {
          Layout.preferredWidth: 340
          Layout.minimumWidth: 340
          Layout.maximumWidth: 340
          Layout.fillHeight: true
          spacing: theme.md

          Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 150
            color: theme.surface
            radius: theme.radius
            ColumnLayout {
              anchors.fill: parent
              anchors.margins: theme.md
              spacing: theme.xs
              Text {
                text: "Selected unit"
                font.pixelSize: theme.caption
                color: theme.foreground
                opacity: 0.6
              }
              Text {
                text: { root.rev; var u = root.selectedUnit(); return u ? u.name : "-- none (Tab cycles units) --" }
                font.pixelSize: theme.body
                font.bold: true
                color: theme.foreground
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
              }
              Text {
                text: {
                  root.rev
                  var u = root.selectedUnit()
                  if (!u) return ""
                  var t = Units.typeOf(u)
                  return t.label + " (" + Sprites.labelFor(u) + ") -- strength " + u.strength + "/10 -- move " + Engine.moveAllowanceOf(gameState, u) +
                         (t.range > 1 ? " -- range " + t.range : "") +
                         "\n" + Engine.xpLabel(u) + " (" + Engine.xpBars(u) + "/5 bars, +" + (Engine.xpBars(u) * 10) + "% attack and defence)" +
                         (u.type === "supply" ? "\nUnarmed. Keeps friends within 2 hexes in supply; +1 replacement step next to it. Stock " + u.stock + "/3." : "") +
                         (Units.givesSupportFire(u) ? "\nGives support fire to adjacent friends under attack." : "") +
                         (u.entrenchment ? " -- dug in " + u.entrenchment : "") +
                         (u.overrun && !u.moved ? "\nOverrun! May still advance " + Engine.moveAllowanceOf(gameState, u) + " MP."
                          : (u.attacked ? "\nHas fired this turn." : (u.moved ? "\nHas moved; may still attack." : "")))
                }
                font.pixelSize: theme.caption
                color: theme.foreground
                opacity: 0.85
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
              }
              Item { Layout.fillHeight: true }
            }
          }

          Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 110
            color: theme.surface
            radius: theme.radius
            ColumnLayout {
              anchors.fill: parent
              anchors.margins: theme.md
              spacing: theme.xs
              Text {
                text: "Under cursor"
                font.pixelSize: theme.caption
                color: theme.foreground
                opacity: 0.6
              }
              Text {
                text: { var t = root.hoverText(); return t || "Hover a hex for terrain, unit and attack odds." }
                font.pixelSize: theme.caption
                color: theme.foreground
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
            color: theme.surface
            radius: theme.radius
            ColumnLayout {
              anchors.fill: parent
              anchors.margins: theme.md
              spacing: theme.xs
              Text {
                text: "Battle log"
                font.pixelSize: theme.caption
                color: theme.foreground
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
                  spacing: theme.xs
                  Repeater {
                    model: { root.rev; return root.gameState.log.slice(0, 80) }
                    Text {
                      Layout.fillWidth: true
                      text: modelData
                      font.pixelSize: theme.caption
                      color: theme.foreground
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
            font.pixelSize: theme.body
            color: theme.accent
          }

          Rectangle {
            Layout.fillWidth: true
            height: 34
            radius: theme.radius
            visible: { root.rev; return root.phase === "axis" && !root.gameState.gameOver && Engine.airAvailable(root.gameState) }
            color: root.airMode ? "#d8231b" : theme.surface
            border.color: theme.accent
            border.width: 1
            opacity: root.canAir() || root.airMode ? 1 : 0.45
            Text {
              anchors.centerIn: parent
              text: {
                root.rev
                if (root.airMode) return "Click an enemy to bomb -- Esc cancels"
                return "Luftwaffe strike (A) -- " + root.gameState.airStrikes + " sortie" + (root.gameState.airStrikes === 1 ? "" : "s") + " left"
              }
              color: root.airMode ? "#ffffff" : theme.foreground
              font.bold: true
              font.pixelSize: theme.caption
            }
            MouseArea { anchors.fill: parent; onClicked: root.toggleAirMode() }
          }

          Rectangle {
            Layout.fillWidth: true
            height: 40
            radius: theme.radius
            color: theme.accent
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
            text: "Click a unit, then a highlighted hex to move or a red-ringed enemy to attack. Tab: next unit. A: air strike. M: movement arrows. F: fast animations. +/-/0 or Ctrl+wheel: zoom. N: new game. Esc: quit (the game is saved)."
            font.pixelSize: theme.caption
            color: theme.foreground
            opacity: 0.5
            wrapMode: Text.WordWrap
          }
        }
      }
    }
  }

  // `qs -p <dir> ipc call hexgeneral newGame` from a terminal.
  IpcHandler {
    target: "hexgeneral"
    function newGame(): void { root.newGame() }
  }
}
