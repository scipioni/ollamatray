/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const CURL_TIMEOUT = 10;
const STATUS_INDICATORS = {
    RUNNING: '●',
    STOPPED: '○'
};
const MB_PER_GB = 1024;

// Helper class for RAM/Size parsing
class MemoryParser {
    /**
     * Convert bytes to megabytes
     * @param {number} bytes - Size in bytes
     * @returns {number} Size in MB
     */
    static bytesToMB(bytes) {
        if (!bytes || typeof bytes !== 'number') return 0;
        return bytes / (1024 * 1024);
    }

    /**
     * Format bytes to human-readable string
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string (e.g., "1.5 GB" or "500 MB")
     */
    static formatBytes(bytes) {
        if (!bytes || typeof bytes !== 'number') return '0 MB';
        
        const mb = bytes / (1024 * 1024);
        const gb = mb / 1024;
        
        if (gb >= 1) {
            return `${gb.toFixed(2)} GB`;
        }
        return `${Math.round(mb)} MB`;
    }

    /**
     * Calculate total memory usage from models
     * @param {Array} models - Array of model objects
     * @param {string} memoryField - Field name to sum (e.g., 'size', 'size_vram')
     * @returns {number} Total memory in MB
     */
    static calculateTotalMemory(models, memoryField) {
        return models.reduce((total, model) => {
            return total + this.bytesToMB(model[memoryField]);
        }, 0);
    }
}

/**
 * OllamaTrayIndicator - System tray indicator for Ollama service
 *
 * Provides a panel button with real-time monitoring of:
 * - Running Ollama models and their resource usage
 * - GPU/CPU RAM consumption
 * - List of available local models
 *
 * @extends PanelMenu.Button
 */
const OllamaTrayIndicator = GObject.registerClass({
    GTypeName: 'OllamaTrayIndicator',
    Properties: {},
    Signals: {}
}, class OllamaTrayIndicator extends PanelMenu.Button {
    /**
     * Initialize the Ollama tray indicator
     * @param {Gio.Settings} settings - Extension settings object
     * @throws {Error} If settings parameter is invalid
     */
    _init(settings) {
        super._init(0.0, 'Ollama Tray');

        // Validate settings parameter
        if (!settings || !(settings instanceof Gio.Settings)) {
            throw new Error('OllamaTrayIndicator: Invalid settings object provided');
        }

        this._settings = settings;
        
        // Get Ollama URL from settings
        this._ollamaUrl = this._settings.get_string('ollama-url');

        // Create the icon for the tray
        const extension = Extension.lookupByURL(import.meta.url);
        const iconPath = extension.path;
        const iconFile = Gio.File.new_for_path(`${iconPath}/icons/ollama-symbolic.svg`);

        if (iconFile.query_exists(null)) {
            this._icon = new St.Icon({
                gicon: Gio.icon_new_for_string(`${iconPath}/icons/ollama-symbolic.svg`),
                style_class: 'system-status-icon',
            });
        } else {
            // Fallback to a standard icon if our custom icon doesn't exist
            this._icon = new St.Icon({
                icon_name: 'application-x-executable-symbolic',
                style_class: 'system-status-icon',
            });
        }
        this.add_child(this._icon);

        // Initialize state
        this._runningModels = [];
        this._allModels = [];
        this._ramUsage = '0 MB';
        this._gpuRam = this._settings.get_int('gpu-ram');
        
        // Create GPU percentage label
        this._gpuLabel = new St.Label({
            text: '0%',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'system-status-label'
        });
        this.add_child(this._gpuLabel);

        // Setup settings listeners
        this._setupSettingsListeners();

        // Create menu
        this._createMenu();

        // Start polling for updates
        this._startPolling();
    }

    _setupSettingsListeners() {
        this._settingsChangedIds = [];

        const settingsHandlers = [
            ['changed::ollama-url', this._onOllamaUrlChanged.bind(this)],
            ['changed::gpu-ram', this._onGpuRamChanged.bind(this)],
            ['changed::show-tray-text', this._onTrayTextChanged.bind(this)],
            ['changed::show-gpu-ram', this._onTrayTextChanged.bind(this)],
            ['changed::show-cpu-ram', this._onTrayTextChanged.bind(this)],
            ['changed::polling-interval', this._onPollingIntervalChanged.bind(this)]
        ];

        settingsHandlers.forEach(([signal, handler]) => {
            this._settingsChangedIds.push(this._settings.connect(signal, handler));
        });
    }

    /**
     * Create a menu section with title and items
     * @param {string} title - Section title
     * @param {Array} items - Menu items to add
     * @param {string} emptyMessage - Message to show when no items
     * @private
     */
    _createMenuSection(title, items, emptyMessage) {
        const sectionTitle = new PopupMenu.PopupMenuItem(title, {reactive: false});
        sectionTitle.add_style_class_name('popup-subtitle-menu-item');
        this.menu.addMenuItem(sectionTitle);

        if (items.length > 0) {
            items.forEach(item => this.menu.addMenuItem(item));
        } else {
            const emptyItem = new PopupMenu.PopupMenuItem(emptyMessage);
            emptyItem.setSensitive(false);
            this.menu.addMenuItem(emptyItem);
        }
    }

    _createRunningModelItems() {
        return this._runningModels.map(model => {
            const sizeStr = MemoryParser.formatBytes(model.size);
            const vramStr = MemoryParser.formatBytes(model.size_vram);
            return new PopupMenu.PopupMenuItem(
                `${model.name} (Size: ${sizeStr}, VRAM: ${vramStr})`
            );
        });
    }

    _createAllModelItems() {
        const sortedModels = [...this._allModels].sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        return sortedModels.map(model => {
            const isRunning = this._runningModels.some(
                running => running.name === model.name
            );
            
            const statusIndicator = isRunning ?
                STATUS_INDICATORS.RUNNING :
                STATUS_INDICATORS.STOPPED;
            
            const sizeStr = MemoryParser.formatBytes(model.size);
            const modelItem = new PopupMenu.PopupMenuItem(
                `${statusIndicator} ${model.name} (${sizeStr})`
            );

            const styleClass = isRunning ?
                'ollama-model-running' :
                'ollama-model-stopped';
            modelItem.add_style_class_name(styleClass);

            return modelItem;
        });
    }

    _getGpuUtilizationText() {
        const totalVramUsed = MemoryParser.calculateTotalMemory(
            this._runningModels,
            'size_vram'
        );

        if (totalVramUsed === 0) {
            return `GPU RAM: ${this._gpuRam} MB`;
        }

        const utilizationPercent = this._gpuRam > 0 ?
            Math.round((totalVramUsed / this._gpuRam) * 100) : 0;
        
        return `GPU RAM: ${totalVramUsed.toFixed(0)} / ${this._gpuRam} MB (${utilizationPercent}%)`;
    }

    _createMenu() {
        this.menu.removeAll();

        // Running models section
        this._createMenuSection(
            'Running Models',
            this._createRunningModelItems(),
            'No models running'
        );

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // All models section
        this._createMenuSection(
            'All Local Models',
            this._createAllModelItems(),
            'No local models found'
        );

        // Refresh button
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const refreshItem = new PopupMenu.PopupMenuItem('Refresh Status');
        refreshItem.connect('activate', () => this._fetchStatus());
        this.menu.addMenuItem(refreshItem);

        // GPU status
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const statusItem = new PopupMenu.PopupMenuItem(
            this._getGpuUtilizationText(),
            {reactive: false}
        );
        statusItem.add_style_class_name('popup-subtitle-menu-item');
        this.menu.addMenuItem(statusItem);

        // Settings submenu
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const settingsMenu = new PopupMenu.PopupSubMenuMenuItem('Settings');
        
        // Ollama URL setting
        const urlItem = new PopupMenu.PopupMenuItem(`URL: ${this._ollamaUrl}`);
        urlItem.connect('activate', () => this._showUrlDialog());
        settingsMenu.menu.addMenuItem(urlItem);
        
        // GPU RAM setting
        const gpuRamItem = new PopupMenu.PopupMenuItem(`GPU RAM: ${this._gpuRam} MB`);
        gpuRamItem.connect('activate', () => this._showGpuRamDialog());
        settingsMenu.menu.addMenuItem(gpuRamItem);
        
        this.menu.addMenuItem(settingsMenu);
    }

    async _fetchStatus() {
        try {
            // Fetch running models
            const runningResponse = await this._fetchJson(`${this._ollamaUrl}/api/ps`);
            this._runningModels = runningResponse?.models || [];

            // Fetch all local models
            const localResponse = await this._fetchJson(`${this._ollamaUrl}/api/tags`);
            this._allModels = localResponse?.models || [];

            // Update RAM usage
            const totalRam = MemoryParser.calculateTotalMemory(
                this._runningModels,
                'size_vram'
            );
            this._ramUsage = totalRam > 0 ? `${Math.round(totalRam)} MB` : '0 MB';

            // Update UI
            this._updateDisplay();
            this._createMenu();
        } catch (e) {
            console.error('Error fetching Ollama status:', e);
            this._runningModels = [];
            this._allModels = [];
            this._ramUsage = 'Error';
            this._updateDisplay();
        }
    }

    _calculateMemoryUsage() {
        const totalVramUsed = MemoryParser.calculateTotalMemory(
            this._runningModels,
            'size_vram'
        );
        const totalRamUsed = MemoryParser.calculateTotalMemory(
            this._runningModels,
            'size'
        );
        const gpuUtilization = this._gpuRam > 0 ?
            Math.round((totalVramUsed / this._gpuRam) * 100) : 0;
        
        // Determine if GPU is being used (check if any model has VRAM allocated)
        const isUsingGpu = this._runningModels.some(model =>
            model.size_vram && model.size_vram > 0
        );

        return { totalVramUsed, totalRamUsed, gpuUtilization, isUsingGpu };
    }

    _buildDisplayText(totalVramUsed, totalRamUsed) {
        if (this._runningModels.length === 0) {
            return 'OLLAMA (0MB)';
        }

        const modelNames = this._runningModels
            .slice(0, 2)
            .map(m => m.name.split(':')[0]);
        
        const modelsStr = this._runningModels.length > 2
            ? `${modelNames.join(', ')}+${this._runningModels.length - 2}`
            : modelNames.join(', ');

        const showGpuRam = this._settings.get_boolean('show-gpu-ram') || true;
        const showCpuRam = this._settings.get_boolean('show-cpu-ram') || true;

        const ramInfo = [];
        if (showGpuRam) ramInfo.push(`GPU:${totalVramUsed.toFixed(0)}MB`);
        if (showCpuRam) ramInfo.push(`CPU:${totalRamUsed.toFixed(0)}MB`);

        return ramInfo.length > 0
            ? `${modelsStr} (${ramInfo.join(' ')})`
            : modelsStr;
    }

    _updateTextLabel(displayText) {
        if (!this._textLabel) {
            this._textLabel = new St.Label({
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'system-status-label'
            });
            this.add_child(this._textLabel);
        }
        this._textLabel.set_text(displayText);
    }

    _removeTextLabel() {
        if (this._textLabel) {
            this.remove_child(this._textLabel);
            this._textLabel = null;
        }
    }

    /**
     * Update icon color based on usage
     * @private
     */
    _updateIconColor(isUsingGpu, hasRunningModels) {
        if (!this._icon) return;
        
        // Remove any existing color styles
        this._icon.remove_style_class_name('ollama-gpu-active');
        this._icon.remove_style_class_name('ollama-cpu-active');
        this._icon.remove_style_class_name('ollama-inactive');
        
        if (!hasRunningModels) {
            // Gray when no models running
            this._icon.add_style_class_name('ollama-inactive');
        } else if (isUsingGpu) {
            // Green when using GPU
            this._icon.add_style_class_name('ollama-gpu-active');
        } else {
            // Red when using CPU
            this._icon.add_style_class_name('ollama-cpu-active');
        }
    }

    /**
     * Update the display (tooltip, labels, and icon color)
     * @private
     */
    _updateDisplay() {
        const { totalVramUsed, totalRamUsed, gpuUtilization, isUsingGpu } =
            this._calculateMemoryUsage();

        const hasRunningModels = this._runningModels.length > 0;
        const showText = this._settings.get_boolean('show-tray-text') || true;

        // Update GPU percentage label
        if (this._gpuLabel) {
            this._gpuLabel.set_text(`${gpuUtilization}%`);
        }

        // Update icon color
        this._updateIconColor(isUsingGpu, hasRunningModels);

        // Update tooltip - set on the button itself, not the icon
        const usageType = !hasRunningModels ? 'Inactive' : (isUsingGpu ? 'GPU' : 'CPU');
        const tooltipText =
            `Ollama - ${this._runningModels.length} running, ${this._allModels.length} total\n` +
            `Mode: ${usageType}\n` +
            `GPU: ${totalVramUsed.toFixed(0)} / ${this._gpuRam} MB (${gpuUtilization}%)`;
        
        // Set tooltip_text property on the button
        this.set_tooltip_text?.(tooltipText);

        // Update text label
        if (showText) {
            const displayText = this._buildDisplayText(totalVramUsed, totalRamUsed);
            this._updateTextLabel(displayText);
        } else {
            this._removeTextLabel();
        }
    }

    _startPolling() {
        this._fetchStatus();

        const pollingInterval = this._settings.get_int('polling-interval');

        this._pollingIntervalId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            pollingInterval,
            () => {
                this._fetchStatus();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    /**
     * Stop polling for status updates and cleanup settings listeners
     * @private
     */
    _stopPolling() {
        if (this._pollingIntervalId) {
            GLib.Source.remove(this._pollingIntervalId);
            this._pollingIntervalId = null;
        }

        if (this._settingsChangedIds) {
            this._settingsChangedIds.forEach(id => {
                this._settings.disconnect(id);
            });
            this._settingsChangedIds = null;
        }
    }

    /**
     * Fetch JSON data from URL using curl
     * @param {string} url - URL to fetch from
     * @returns {Promise<Object|null>} Parsed JSON response or null
     * @private
     */
    _fetchJson(url) {
        return new Promise((resolve, reject) => {
            try {
                const [res, out, err, status] = GLib.spawn_command_line_sync(
                    `curl -s -m ${CURL_TIMEOUT} ${url}`
                );
                
                if (status === 0) {
                    try {
                        // Convert GLib.Bytes to string using TextDecoder (modern approach)
                        const decoder = new TextDecoder('utf-8');
                        const response = decoder.decode(out).trim();
                        resolve(response ? JSON.parse(response) : null);
                    } catch (parseError) {
                        console.error('Error parsing JSON response:', parseError);
                        reject(parseError);
                    }
                } else {
                    // Convert error output to string properly
                    const decoder = new TextDecoder('utf-8');
                    const errorMsg = err ? decoder.decode(err) : 'Unknown error';
                    console.error('curl command failed:', errorMsg);
                    reject(new Error(`Failed to fetch: ${errorMsg}`));
                }
            } catch (e) {
                console.error('Error in fetch function:', e);
                reject(e);
            }
        });
    }

    /**
     * Show dialog to edit Ollama URL
     * @private
     */
    _showUrlDialog() {
        const command = `zenity --entry --title="Ollama URL" --text="Enter Ollama API URL:" --entry-text="${this._ollamaUrl}"`;
        
        try {
            const [res, out, err, status] = GLib.spawn_command_line_sync(command);
            
            if (status === 0) {
                const decoder = new TextDecoder('utf-8');
                const newUrl = decoder.decode(out).trim();
                
                if (newUrl && newUrl !== this._ollamaUrl) {
                    this._settings.set_string('ollama-url', newUrl);
                }
            }
        } catch (e) {
            console.error('Error showing URL dialog:', e);
        }
    }

    /**
     * Show dialog to edit GPU RAM
     * @private
     */
    _showGpuRamDialog() {
        const command = `zenity --entry --title="GPU RAM" --text="Enter GPU RAM size in MB:" --entry-text="${this._gpuRam}"`;
        
        try {
            const [res, out, err, status] = GLib.spawn_command_line_sync(command);
            
            if (status === 0) {
                const decoder = new TextDecoder('utf-8');
                const newRam = parseInt(decoder.decode(out).trim(), 10);
                
                if (!isNaN(newRam) && newRam > 0) {
                    this._settings.set_int('gpu-ram', newRam);
                }
            }
        } catch (e) {
            console.error('Error showing GPU RAM dialog:', e);
        }
    }

    /**
     * Handle Ollama URL setting change
     * @private
     */
    _onOllamaUrlChanged() {
        this._ollamaUrl = this._settings.get_string('ollama-url');
        this._createMenu();
        this._fetchStatus();
    }

    /**
     * Handle GPU RAM setting change
     * @private
     */
    _onGpuRamChanged() {
        this._gpuRam = this._settings.get_int('gpu-ram');
        this._createMenu();
        this._updateDisplay();
    }

    /**
     * Handle tray text display setting change
     * @private
     */
    _onTrayTextChanged() {
        this._updateDisplay();
    }

    /**
     * Handle polling interval setting change
     * @private
     */
    _onPollingIntervalChanged() {
        if (this._pollingIntervalId) {
            GLib.Source.remove(this._pollingIntervalId);
            this._startPolling();
        }
    }

    /**
     * Cleanup when indicator is destroyed
     */
    destroy() {
        this._stopPolling();
        super.destroy();
    }
});

/**
 * Main extension class for Ollama Tray
 * @extends Extension
 */
export default class OllamaTrayExtension extends Extension {
    /**
     * Enable the extension
     * Initializes settings and creates the tray indicator
     */
    enable() {
        this._settings = this.getSettings();
        this._indicator = new OllamaTrayIndicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    /**
     * Disable the extension
     * Cleans up resources and removes the tray indicator
     */
    disable() {
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }
}
