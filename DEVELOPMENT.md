# Development Guide for Ollama Tray Extension

This guide provides instructions for developing and testing the Ollama Tray extension under Wayland and GNOME 49.

## Prerequisites

Before developing the extension, ensure you have:

- GNOME 49.x installed
- Running under Wayland (default for GNOME 49)
- Ollama installed and running (`ollama serve`)
- `curl` command-line tool
- Basic knowledge of GNOME Shell extension development

## Setting up Development Environment

### 1. Extension Directory Structure

The extension should be located at:
```
~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/
```

### 2. Enable Developer Mode

For easier extension development, enable the Looking Glass debugger:
- Press `Alt + F2`
- Type `lg` and press Enter
- This opens the GNOME Shell debugger

## Testing Under Wayland and GNOME 49

### 1. Installation for Testing

1. Place all extension files in the proper directory:
   ```bash
   mkdir -p ~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/
   # Copy all files to the directory
   ```

2. Compile the GSettings schema:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/schemas/
   ```

3. Log out and log back in to ensure GNOME Shell recognizes the new extension

### 2. Loading the Extension

#### Method A: Using Extensions GUI
1. Open the "Extensions" application
2. Find "ollama-tray" in the list
3. Toggle it on

#### Method B: Using Command Line
```bash
gnome-extensions enable ollamatray@scipio.it
```

#### Method C: Restart Shell (X11 only)
If on X11, you can restart the shell with:
- Press `Alt + F2`
- Type `r` and press Enter

**Note:** This method does not work under Wayland. For Wayland, you must log out and log back in.

### 3. Debugging the Extension

#### Using Looking Glass (Recommended)
1. Press `Alt + F2`, type `lg`, press Enter
2. In the "Evaluator" tab, you can run JavaScript commands:
   ```javascript
   // Check if the extension is loaded
   global.context.extensionManager.lookup('ollamatray@scipio.it')
   
   // Reload an extension
   global.context.extensionManager.reloadExtension(global.context.extensionManager.lookup('ollamatray@scipio.it'), Extension.Type.EXTENSION)
   ```

#### Using System Logs
Check GNOME Shell logs for extension errors:
```bash
journalctl --user -f -o cat /usr/bin/gnome-shell | grep -i ollama
```

Or check for any errors with:
```bash
journalctl --user -f | grep -i "extension\|error"
```

### 4. Development Workflow

#### Iterative Development
1. Make changes to your extension files
2. To reload the extension under Wayland:
   - Disable the extension from the Extensions app
   - Enable it again
   - Or log out and log back in for changes to take effect

#### Console Logging
Add logging to your extension using:
```javascript
console.log('Debug message');
console.error('Error message');
```

These messages will appear in Looking Glass and system logs.

### 5. Testing Specific Features

#### Testing GPU RAM Configuration
1. Check current setting:
   ```bash
   gsettings get org.gnome.shell.extensions.ollamatray gpu-ram
   ```

2. Set to test value (e.g., 12GB):
   ```bash
   gsettings set org.gnome.shell.extensions.ollamatray gpu-ram 12288
   ```

3. Verify the setting is applied by checking the extension popup

#### Testing Polling Interval
1. Check current interval:
   ```bash
   gsettings get org.gnome.shell.extensions.ollamatray polling-interval
   ```

2. Set to test value (e.g., 10 seconds for faster updates):
   ```bash
   gsettings set org.gnome.shell.extensions.ollamatray polling-interval 10
   ```

#### Testing Ollama Integration
1. Make sure Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   curl http://localhost:11434/api/ps
   ```

2. Run a model to see it appear in the tray:
   ```bash
   ollama run llama2
   ```

## Common Issues and Solutions

### Extension Not Appearing
- Ensure proper installation location
- Check that `metadata.json` has correct shell version compatibility
- Log out and log back in
- Make sure all files have proper permissions

### Extension Disabled After Logout/Reboot
- This may indicate an error in the extension code
- Check logs: `journalctl --user -f`
- Verify all syntax is correct (ES6 imports, proper braces, etc.)

### Settings Not Working
- Ensure schema is compiled: `glib-compile-schemas`
- Verify schema path is correct
- Check Looking Glass for any gsettings-related errors

### Icon Not Loading
- Ensure icons directory exists
- Check file permissions on icon files
- Verify icon file paths in the code

## Testing Checklist

Before committing changes, ensure:

- [ ] Extension loads without errors under Wayland
- [ ] Custom Ollama icon displays correctly
- [ ] GPU RAM configuration works as expected
- [ ] Polling interval can be configured and takes effect
- [ ] Ollama API calls work (both /api/tags and /api/ps)
- [ ] Popup menu displays correctly
- [ ] Memory usage calculations are accurate
- [ ] Extension can be disabled/enabled without issues
- [ ] Settings persist across shell restarts (if applicable)

## Useful Commands for Development

```bash
# Enable the extension
gnome-extensions enable ollamatray@scipio.it

# Disable the extension
gnome-extensions disable ollamatray@scipio.it

# Reset extension settings to defaults
gsettings reset-recursively org.gnome.shell.extensions.ollamatray

# List all extensions
gnome-extensions list

# Check extension info
gnome-extensions info ollamatray@scipio.it

# Monitor logs
journalctl --user -f -o cat | grep -i extension
```

## Limitations under Wayland

Some development practices differ under Wayland:

- Cannot reload extensions using Alt+F2+r (must log out/in)
- Some debugging tools may have different behavior
- Extension reload requires more steps
- File monitoring may behave differently

## Making a Release

### 1. Pre-Release Checklist

Before creating a release, ensure:

- [ ] All features are working and tested
- [ ] No errors in GNOME Shell logs
- [ ] Code is properly documented
- [ ] README.md is up to date
- [ ] metadata.json version is incremented
- [ ] Screenshots are current and representative
- [ ] All GSettings schemas are compiled
- [ ] Extension works on target GNOME Shell versions

### 2. Version Bumping

Update the version in `metadata.json`:

```json
{
  "version": 2,  // Increment this for each release
  "shell-version": ["49"]
}
```

**Note:** GNOME Extensions repository requires an integer version number that increments with each submission.

### 3. Creating a Distribution Package

Create a ZIP file containing only the necessary files for distribution:

```bash
# Navigate to the extension directory
cd ~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/

# Create the distribution package
gnome-extensions pack \
  --extra-source=icons \
  --extra-source=README.md \
  --extra-source=DEVELOPMENT.md \
  --podir=po \
  --force

# This creates: ollamatray@scipio.it.shell-extension.zip
```

**Files automatically included:**
- `extension.js`
- `metadata.json`
- `stylesheet.css`
- `schemas/` directory

**Manually included (via --extra-source):**
- `icons/` directory
- `README.md`
- `DEVELOPMENT.md`

### 4. Manual Package Creation (Alternative)

If gnome-extensions pack doesn't work, create the package manually:

```bash
#!/bin/bash
# Create a clean build directory
mkdir -p build
cd build

# Copy necessary files
cp ../extension.js .
cp ../metadata.json .
cp ../stylesheet.css .
cp -r ../schemas .
cp -r ../icons .
cp ../README.md .

# Compile schemas
glib-compile-schemas schemas/

# Create the zip file
zip -r ../ollamatray@scipio.it.shell-extension.zip .

# Clean up
cd ..
rm -rf build
```

### 5. Testing the Release Package

Before publishing, test the packaged extension:

```bash
# Install from the package
gnome-extensions install --force ollamatray@scipio.it.shell-extension.zip

# Enable the extension
gnome-extensions enable ollamatray@scipio.it

# Log out and log back in
# Verify everything works as expected
```

## Publishing to GNOME Extensions Repository

### 1. Create an Account

1. Go to [extensions.gnome.org](https://extensions.gnome.org)
2. Sign in or create an account
3. You'll need a GNOME account (can use existing or create one)

### 2. Submit Your Extension

#### First-Time Submission

1. Navigate to [Upload Extension](https://extensions.gnome.org/upload/)
2. Upload your `.shell-extension.zip` file
3. Fill in the required information:
   - **Name**: Ollama Tray
   - **Description**: System tray indicator for monitoring Ollama models
   - **URL**: Your project repository (if any)
   - **Screenshot(s)**: Required - at least one screenshot
4. Read and accept the review guidelines
5. Click "Upload Extension"

#### Required Information

**Extension Description** (example):
```
A GNOME Shell extension that provides a system tray indicator for monitoring
Ollama AI models. Features include:

- Real-time monitoring of running models
- GPU and CPU memory usage tracking
- Color-coded status indicators (green for GPU, red for CPU, gray when inactive)
- Configurable Ollama URL and GPU RAM size
- List view of all available models
- Automatic status polling

Perfect for developers and AI enthusiasts who want to keep track of their
Ollama models at a glance.
```

**Screenshots Required:**
- Main tray indicator showing active models
- Expanded menu showing running models and settings
- Settings submenu (optional but recommended)

Recommended size: 800x600 or similar aspect ratio

### 3. Review Process

1. **Initial Submission**: Your extension enters the review queue
2. **Review Time**: Can take anywhere from a few days to a few weeks
3. **Reviewers Check**:
   - Code quality and security
   - Functionality
   - Compliance with GNOME guidelines
   - No malicious code
4. **Feedback**: Reviewers may request changes
5. **Approval**: Once approved, your extension goes live

### 4. Updating an Existing Extension

When releasing updates:

```bash
# 1. Increment version in metadata.json
# 2. Create new package
gnome-extensions pack --force

# 3. Go to extensions.gnome.org
# 4. Navigate to your extension's page
# 5. Click "Upload New Version"
# 6. Upload the new .shell-extension.zip
# 7. Add release notes describing changes
```

**Important**: Each update must have a higher version number than the previous.

### 5. Release Notes Template

When submitting updates, include clear release notes:

```
Version 2:
- Added GPU percentage label next to icon
- Implemented color-coded icon states (green/red/gray)
- Added Settings submenu for editing Ollama URL and GPU RAM
- Fixed API compatibility with latest Ollama versions
- Improved error handling for network timeouts

Version 1:
- Initial release
- Basic Ollama model monitoring
- GPU and CPU RAM tracking
- Configurable polling interval
```

### 6. Post-Publication

After your extension is published:

1. **Monitor Reviews**: Check user reviews and ratings
2. **Respond to Issues**: Be responsive to bug reports
3. **Regular Updates**: Keep extension compatible with new GNOME versions
4. **Announce Updates**: If you have a project page, announce major updates

### 7. Best Practices for Public Release

- **Semantic Versioning**: Use meaningful version numbers
- **Changelog**: Maintain a CHANGELOG.md file
- **License**: Include a clear license (this project uses GPL-2.0-or-later)
- **Documentation**: Keep README.md comprehensive and up-to-date
- **Compatibility**: Test on all GNOME Shell versions you claim to support
- **Settings Migration**: Handle settings changes gracefully in updates
- **Backward Compatibility**: Try not to break existing configurations

### 8. Common Rejection Reasons

Extensions may be rejected for:

- Security vulnerabilities
- Executing arbitrary shell commands without proper validation
- Including unnecessary external dependencies
- Poor code quality or no error handling
- Misleading description or functionality
- Not following GNOME Human Interface Guidelines
- Missing or broken functionality

### 9. Resources

- [GNOME Extensions Review Guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html)
- [GNOME Shell Extension Development](https://gjs.guide/extensions/)
- [Extensions.gnome.org](https://extensions.gnome.org)
- [GNOME Extensions API Documentation](https://gjs-docs.gnome.org/)

### 10. Quick Release Checklist

```bash
# 1. Update version in metadata.json
# 2. Test thoroughly
# 3. Create package
gnome-extensions pack --force

# 4. Test the package
gnome-extensions install --force ollamatray@scipio.it.shell-extension.zip
gnome-extensions enable ollamatray@scipio.it

# 5. Take screenshots
# 6. Upload to extensions.gnome.org
# 7. Fill in description and details
# 8. Submit for review
# 9. Wait for approval
# 10. Announce the release
```