# Ollama Tray Extension

A GNOME Shell extension that provides a tray indicator for Ollama running models with RAM usage. Clicking on the indicator shows all local models and their detailed status.

## Features

- Tray indicator showing running Ollama models with custom Ollama icon
- RAM/VRAM usage display for running models
- Configurable GPU RAM parameter for utilization tracking
- Configurable polling interval
- Configurable tray text visualization (GPU and CPU RAM)
- Detailed popup menu with:
  - Running models section with VRAM usage
  - All local models with status indicators (● for running, ○ for stopped)
  - Refresh button to manually update status
  - GPU utilization information
- Automatic polling with configurable interval (default 30 seconds)

## Prerequisites

- GNOME Shell 45-49
- Ollama installed and running on default port (11434)
- `curl` command-line tool (required for HTTP requests)

## Installation

1. Make sure Ollama is installed and running:
   ```bash
   # Install Ollama if not already installed
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama server
   ollama serve
   ```

2. The extension should be placed in the correct directory:
   ```
   /home/your-username/.local/share/gnome-shell/extensions/ollamatray@scipio.it/
   ```

## Testing Under GNOME 49

### Method 1: Using Extensions App (Recommended)

1. Log out and log back into your GNOME session (required for new extensions)
2. Open the "Extensions" application from the Activities overview
3. Search for "ollama-tray" or look for it in the list
4. Toggle the extension to ON

### Method 2: Using Command Line

1. Log out and log back into your GNOME session (required for new extensions)
2. Check if the extension is recognized:
   ```bash
   gnome-extensions list
   ```

3. Enable the extension:
   ```bash
   gnome-extensions enable ollamatray@scipio.it
   ```

### Method 3: Shell Restart (if needed)

If the extension still doesn't appear after login:

1. Press `Alt + F2`
2. Type `r` and press `Enter` to restart GNOME Shell
3. Open the Extensions app and enable "ollama-tray"

## Usage

1. Make sure Ollama is running: `ollama serve`
2. Pull at least one model to test with: `ollama pull llama2`
3. Run a model to see it appear in the tray: `ollama run llama2`
4. The tray icon will appear in the top panel
5. Click the icon to see detailed information

## Troubleshooting

### Extension doesn't appear in Extensions app

1. Verify the extension files are in the correct location:
   ```
   ~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/
   ├── extension.js
   ├── metadata.json
   └── stylesheet.css
   ```

2. Restart GNOME Shell (Alt+F2, then 'r')

3. Check GNOME Shell version compatibility:
   ```bash
   gnome-shell --version
   ```

### Extension enabled but no icon appears

1. Make sure Ollama is running on the default port (11434)
2. Check that the Ollama server is reachable:
   ```bash
   curl http://localhost:11434/api/tags
   curl http://localhost:11434/api/ps
   ```
3. Check GNOME Shell logs for errors:
   ```bash
   journalctl /usr/bin/gnome-shell --since "10 minutes ago" | grep -i ollama
   ```

### Permission Issues

Make sure all extension files have proper read permissions:
```bash
chmod +r ~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/*
```

## Development

To reload the extension during development:
1. Disable the extension in the Extensions app
2. Make your changes
3. Enable the extension again
4. If needed, restart GNOME Shell (Alt+F2, then 'r')

## Configuration

### GPU RAM Setting

The extension includes a configurable GPU RAM parameter that allows you to specify your GPU's memory capacity. This enables the extension to calculate and display GPU utilization percentage.

To change the GPU RAM setting:
1. Install and use the `gnome-extensions` command line tool or a configuration editor
2. Set the "gpu-ram" key to your GPU memory in MB (e.g., 8192 for 8GB, 24576 for 24GB)

Command line example:
```bash
# Get current GPU RAM setting
gsettings get org.gnome.shell.extensions.ollamatray gpu-ram

# Set GPU RAM to 24GB (24576 MB)
gsettings set org.gnome.shell.extensions.ollamatray gpu-ram 24576
```

### Polling Interval Setting

You can also configure how often the extension polls Ollama for updates:

```bash
# Get current polling interval
gsettings get org.gnome.shell.extensions.ollamatray polling-interval

# Set polling interval to 60 seconds
gsettings set org.gnome.shell.extensions.ollamatray polling-interval 60
```

### Tray Text Visualization Settings

The extension allows you to configure what information is shown in the tray text:

```bash
# Show/hide text in tray (true/false)
gsettings get org.gnome.shell.extensions.ollamatray show-tray-text
gsettings set org.gnome.shell.extensions.ollamatray show-tray-text false  # to hide

# Show/hide GPU RAM in tray text (true/false)
gsettings set org.gnome.shell.extensions.ollamatray show-gpu-ram false  # to hide GPU info

# Show/hide CPU RAM in tray text (true/false)
gsettings set org.gnome.shell.extensions.ollamatray show-cpu-ram false  # to hide CPU info
```

These settings allow you to customize the appearance of the tray indicator to show just the information you want.

## Uninstalling

To uninstall the extension:
1. Disable it using the Extensions app
2. Remove the extension directory:
   ```bash
   rm -rf ~/.local/share/gnome-shell/extensions/ollamatray@scipio.it/
   ```
3. Optionally restart GNOME Shell to fully clear it from memory