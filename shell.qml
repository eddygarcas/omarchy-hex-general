// Hex General -- entry point. Run with:  quickshell -p <this directory>
import Quickshell

ShellRoot {
  FloatingWindow {
    id: window
    title: "Hex General -- Ardennes 1944"
    color: "#26241f"
    minimumSize: Qt.size(1180, 720)
    implicitWidth: 1760
    implicitHeight: 1040

    Game {
      anchors.fill: parent
      onQuitRequested: Qt.quit()
    }
  }
}
