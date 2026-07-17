LabInsight macOS package

1. Unzip LabInsight-mac.zip.
2. Double-click LabInsight.command.

If macOS shows:
"Apple cannot check LabInsight.command for malicious software"

Use one of these fixes:

Option A
1. Right-click LabInsight.command.
2. Click Open.
3. Click Open again if macOS shows the confirmation button.

Option B
1. Open Terminal.
2. Run this command after changing the path to your unzipped folder:

xattr -dr com.apple.quarantine "/path/to/LabInsight-mac"

Example:

xattr -dr com.apple.quarantine "$HOME/Downloads/LabInsight-mac"

3. Double-click LabInsight.command again.

This warning appears because this is a development package and is not Apple-notarized yet.

If Node.js is installed, the booking API runs at http://localhost:8000.
If Node.js is not installed, the app opens as a static browser app and stores bookings in that browser.
