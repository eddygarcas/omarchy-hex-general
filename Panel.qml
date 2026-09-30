// Hex General -- a small hex-grid operational wargame.
//
// Single scenario for now: "Ardennes, Winter 1944". The player commands the
// Axis Kampfgruppen; the Allied side is run by a rule-based AI (see
// Engine.js). Game state is one plain JS object (`gameState`) mutated in
// place by Engine.js's functions; `rev` is bumped after every mutation so
// the property bindings below (which read `rev` purely as a dependency)
// re-evaluate even though QML can't see inside a mutated plain object.
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
  property var hoverHex: null   // axial {q, r} under the cursor, or null

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
    gameState = Engine.createState()
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
    var units = Engine.actionableUnits(gameState)
    if (units.length === 0) { select(null); return }
    var idx = -1
    for (var i = 0; i < units.length; i++) if (units[i].id === gameState.selectedUnitId) idx = i
    select(units[(idx + 1) % units.length])
  }

  function handleHexClick(q, r) {
    if (gameState.gameOver) return
    var sel = selectedUnit()
    var clicked = Engine.unitAt(gameState, q, r)

    if (clicked && clicked.side === "axis") {
      select(sel && clicked.id === sel.id ? null : clicked)
      return
    }
    if (!sel) return

    if (clicked && clicked.side === "allies") {
      if (Engine.canAttack(gameState, sel, clicked)) {
        Engine.resolveCombat(gameState, sel.id, clicked.id)
        if (sel.strength <= 0) gameState.selectedUnitId = null
        Engine.checkVictory(gameState)
        rev++
      }
      return
    }

    if (Engine.moveUnit(gameState, sel.id, q, r)) {
      if (Engine.attackTargets(gameState, sel).length === 0) gameState.selectedUnitId = null
      Engine.checkVictory(gameState)
      rev++
    }
  }

  function endTurn() {
    if (gameState.gameOver) { newGame(); return }
    Engine.endTurn(gameState)
    rev++
  }

  function hoverText() {
    root.rev
    if (!hoverHex) return ""
    var terrain = Engine.terrainAt(gameState, hoverHex.q, hoverHex.r)
    if (!terrain) return ""
    var obj = Engine.objectiveAt(gameState, hoverHex.q, hoverHex.r)
    var line = (obj ? obj.name + " (" + obj.points + " pts) -- " : "") + terrain.label +
               " -- move cost " + terrain.cost + (terrain.defBonus ? ", defence +" + terrain.defBonus : "")
    var unit = Engine.unitAt(gameState, hoverHex.q, hoverHex.r)
    if (unit) {
      var t = Units.typeOf(unit)
      line += "\n" + unit.name + " -- " + t.label + " " + unit.strength + "/10" +
              (unit.entrenchment ? ", dug in " + unit.entrenchment : "")
      var sel = selectedUnit()
      if (sel && unit.side === "allies" && Engine.canAttack(gameState, sel, unit)) {
        var odds = Engine.combatOdds(gameState, sel, unit)
        line += "\nAttack odds " + odds.toFixed(1) + ":1 -- " + Engine.oddsLabel(odds)
      }
    }
    return line
  }

  function terrainColor(code) {
    switch (code) {
      case "forest": return "#2f4d34"
      case "hills": return "#6b5b42"
      case "town": return "#8a7a63"
      case "city": return "#b08d4f"
      case "river": return "#2a4a6b"
      case "bridge": return "#8a6b3c"
      default: return "#dfe6ea" // snowfield
    }
  }

  function sideColor(side) {
    return side === "axis" ? "#5a6b3a" : "#3a5a7a"
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
          case Qt.Key_Escape: root.close(); break
          case Qt.Key_Return: case Qt.Key_Enter: case Qt.Key_Space: root.endTurn(); break
          case Qt.Key_Tab: root.selectNext(); break
          case Qt.Key_N: root.newGame(); break
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
              text: { root.rev; return "Turn " + root.gameState.turn + " / " + Scenario.TURN_LIMIT + " -- " +
                      (root.gameState.gameOver ? "Battle over" : "Axis phase: move and attack, then End Turn") }
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
            color: "#1b1f22"
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
                width: Math.max(mapCanvas.width, mapFlick.width)
                height: Math.max(mapCanvas.height, mapFlick.height)

                Canvas {
                  id: mapCanvas
                  anchors.centerIn: parent
                  width: root.hexSize * (Math.sqrt(3) * Scenario.WIDTH + 2)
                  height: root.hexSize * (1.5 * Scenario.HEIGHT + 1.5)

                  property int paintRev: root.rev
                  property var paintHover: root.hoverHex

                  onPaintRevChanged: requestPaint()
                  onPaintHoverChanged: requestPaint()
                  onWidthChanged: requestPaint()

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

                  function drawCounter(ctx, unit, cx, cy, isSelected, isTarget) {
                    var s = root.hexSize
                    var w = s * 1.25, h = s * 1.0
                    var x = cx - w / 2, y = cy - h / 2
                    var rad = s * 0.12
                    ctx.beginPath()
                    ctx.moveTo(x + rad, y)
                    ctx.lineTo(x + w - rad, y); ctx.arcTo(x + w, y, x + w, y + rad, rad)
                    ctx.lineTo(x + w, y + h - rad); ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad)
                    ctx.lineTo(x + rad, y + h); ctx.arcTo(x, y + h, x, y + h - rad, rad)
                    ctx.lineTo(x, y + rad); ctx.arcTo(x, y, x + rad, y, rad)
                    ctx.closePath()
                    ctx.fillStyle = root.sideColor(unit.side)
                    ctx.fill()
                    ctx.lineWidth = isSelected || isTarget ? 3 : 1.5
                    ctx.strokeStyle = isSelected ? "#ffffff" : (isTarget ? "#ff5040" : "rgba(255,255,255,0.6)")
                    ctx.stroke()

                    ctx.fillStyle = unit.side === "axis" && unit.moved && unit.attacked ? "rgba(255,255,255,0.55)" : "#ffffff"
                    ctx.textAlign = "center"
                    ctx.textBaseline = "middle"
                    ctx.font = "bold " + Math.round(s * 0.36) + "px sans-serif"
                    ctx.fillText(Units.typeOf(unit).glyph, cx - s * 0.18, cy - s * 0.02)
                    ctx.font = "bold " + Math.round(s * 0.34) + "px sans-serif"
                    ctx.textAlign = "right"
                    ctx.fillText(unit.strength, x + w - s * 0.08, cy + s * 0.22)

                    // Entrenchment pips along the top edge.
                    for (var e = 0; e < unit.entrenchment; e++) {
                      ctx.fillStyle = "#e8d060"
                      ctx.fillRect(x + s * 0.1 + e * s * 0.22, y + s * 0.07, s * 0.16, s * 0.08)
                    }
                  }

                  onPaint: {
                    var ctx = getContext("2d")
                    ctx.clearRect(0, 0, width, height)
                    var state = root.gameState
                    var s = root.hexSize
                    var sel = root.selectedUnit()
                    var reach = sel ? Engine.reachable(state, sel) : {}
                    var targets = sel ? Engine.attackTargets(state, sel) : []
                    var hover = root.hoverHex

                    for (var row = 0; row < Scenario.HEIGHT; row++) {
                      for (var col = 0; col < Scenario.WIDTH; col++) {
                        var a = Hex.offsetToAxial(col, row)
                        var c = centerOf(a.q, a.r)
                        var code = state.terrain[row][col]

                        hexPath(ctx, c.x, c.y, s - 1)
                        ctx.fillStyle = root.terrainColor(code)
                        ctx.fill()
                        if (reach[Hex.key(a.q, a.r)] !== undefined) { ctx.fillStyle = "rgba(240, 220, 120, 0.3)"; ctx.fill() }
                        ctx.lineWidth = 1
                        ctx.strokeStyle = "rgba(0,0,0,0.35)"
                        ctx.stroke()

                        if (code === "bridge") {
                          ctx.strokeStyle = "#d9c28a"
                          ctx.lineWidth = Math.max(2, s * 0.12)
                          ctx.beginPath(); ctx.moveTo(c.x - s * 0.55, c.y); ctx.lineTo(c.x + s * 0.55, c.y); ctx.stroke()
                        }

                        var obj = Engine.objectiveAt(state, a.q, a.r)
                        if (obj) {
                          ctx.fillStyle = "#e8d060"
                          ctx.textAlign = "center"
                          ctx.textBaseline = "middle"
                          ctx.font = "bold " + Math.round(s * 0.45) + "px sans-serif"
                          ctx.fillText("★", c.x, c.y - s * 0.62)
                          ctx.font = "bold " + Math.max(8, Math.round(s * 0.28)) + "px sans-serif"
                          ctx.fillStyle = "rgba(255,255,255,0.92)"
                          ctx.fillText(obj.name, c.x, c.y + s * 0.68)
                        }

                        var unit = Engine.unitAt(state, a.q, a.r)
                        if (unit) {
                          var isTarget = targets.some(function (t) { return t.id === unit.id })
                          drawCounter(ctx, unit, c.x, c.y, sel && sel.id === unit.id, isTarget)
                        }

                        if (hover && hover.q === a.q && hover.r === a.r) {
                          hexPath(ctx, c.x, c.y, s - 2)
                          ctx.lineWidth = 2
                          ctx.strokeStyle = "rgba(255,255,255,0.85)"
                          ctx.stroke()
                        }
                      }
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
                    return t.label + " -- strength " + u.strength + "/10 -- move " + t.move +
                           (t.range > 1 ? " -- range " + t.range : "") +
                           (u.entrenchment ? " -- dug in " + u.entrenchment : "") +
                           (u.attacked ? "\nHas fired this turn." : (u.moved ? "\nHas moved; may still attack." : ""))
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
              height: Style.space(40)
              radius: Style.cornerRadius
              color: Color.accent
              Text {
                anchors.centerIn: parent
                text: { root.rev; return root.gameState.gameOver ? "New Game  (N)" : "End Turn  (Enter)" }
                color: "#101010"
                font.bold: true
              }
              MouseArea { anchors.fill: parent; onClicked: root.endTurn() }
            }

            Text {
              Layout.fillWidth: true
              text: "Click a unit, then a highlighted hex to move or a red-ringed enemy to attack. Tab: next unit. Esc: close."
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
