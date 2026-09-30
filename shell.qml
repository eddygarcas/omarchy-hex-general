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

    // Closing the window from the compositor (Super+W, the title bar, ...)
    // only hides it; without this the process would linger invisibly and
    // the launcher's --no-duplicate would refuse to start a new one.
    property bool shown: false
    onBackingWindowVisibleChanged: {
      if (backingWindowVisible) shown = true
      else if (shown) Qt.quit()
    }
    onVisibleChanged: if (!visible) Qt.quit()

    Game {
      anchors.fill: parent
      onQuitRequested: Qt.quit()
    }
  }
}
