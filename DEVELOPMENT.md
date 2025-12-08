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