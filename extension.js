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
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import ByteArray from 'resource:///org/gnome/shell/misc/byteArray.js';
import {ExtensionUtils} from 'resource:///org/gnome/shell/misc/extensionUtils.js';

const OLLAMA_URL = 'http://localhost:11434';

// Tray indicator for Ollama
const OllamaTrayIndicator = GObject.registerClass(
class OllamaTrayIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Ollama Tray');

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

        // Fetch initial data
        this._runningModels = [];
        this._allModels = [];
        this._ramUsage = '0 MB';

        // Create menu
        this._createMenu();

        // Start polling for updates
        this._startPolling();
    }

    _createMenu() {
        // Clear existing menu items
        this.menu.removeAll();

        // Create a section for running models
        const runningSectionTitle = new PopupMenu.PopupMenuItem(_('Running Models'), {reactive: false});
        runningSectionTitle.actor.add_style_class_name('popup-subtitle-menu-item');
        this.menu.addMenuItem(runningSectionTitle);

        if (this._runningModels.length > 0) {
            this._runningModels.forEach(model => {
                const modelDetails = new PopupMenu.PopupMenuItem(
                    `${model.name} (${model.size}, ${model.vram || 'VRAM info not available'})`
                );
                this.menu.addMenuItem(modelDetails);
            });
        } else {
            const noModelsItem = new PopupMenu.PopupMenuItem(_('No models running'));
            noModelsItem.setSensitive(false);
            this.menu.addMenuItem(noModelsItem);
        }

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Section for all models
        const allSectionTitle = new PopupMenu.PopupMenuItem(_('All Local Models'), {reactive: false});
        allSectionTitle.actor.add_style_class_name('popup-subtitle-menu-item');
        this.menu.addMenuItem(allSectionTitle);

        if (this._allModels.length > 0) {
            // Sort models alphabetically for better organization
            const sortedModels = [...this._allModels].sort((a, b) => a.name.localeCompare(b.name));

            sortedModels.forEach(model => {
                // Check if this model is currently running
                const isRunning = this._runningModels.some(running => running.name === model.name);

                // Create the menu item with running status indicator
                const statusIndicator = isRunning ? '●' : '○'; // ● for running, ○ for not running
                const modelItem = new PopupMenu.PopupMenuItem(
                    `${statusIndicator} ${model.name} (${model.size})`
                );

                // Add context about running status
                if (isRunning) {
                    modelItem.actor.add_style_class_name('ollama-model-running');
                } else {
                    modelItem.actor.add_style_class_name('ollama-model-stopped');
                }

                this.menu.addMenuItem(modelItem);
            });
        } else {
            const noModelsItem = new PopupMenu.PopupMenuItem(_('No local models found'));
            noModelsItem.setSensitive(false);
            this.menu.addMenuItem(noModelsItem);
        }

        // Add refresh button
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const refreshItem = new PopupMenu.PopupMenuItem(_('Refresh Status'));
        refreshItem.connect('activate', () => {
            this._fetchStatus();
        });
        this.menu.addMenuItem(refreshItem);

        // Add Ollama server status information
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const statusItem = new PopupMenu.PopupMenuItem(_('Ollama Server: Running'), {reactive: false});
        statusItem.actor.add_style_class_name('popup-subtitle-menu-item');
        this.menu.addMenuItem(statusItem);
    }

    async _fetchStatus() {
        try {
            // Fetch running models
            const runningResponse = await this._fetchJson(`${OLLAMA_URL}/api/ps`);
            if (runningResponse && runningResponse.models) {
                this._runningModels = runningResponse.models;
            } else {
                this._runningModels = [];
            }

            // Fetch all local models
            const localResponse = await this._fetchJson(`${OLLAMA_URL}/api/tags`);
            if (localResponse && localResponse.models) {
                this._allModels = localResponse.models;
            } else {
                this._allModels = [];
            }

            // Update RAM usage display based on running models
            let totalRam = 0;
            this._runningModels.forEach(model => {
                // Extract VRAM from string like "3.8 GB VRAM"
                if (model.vram) {
                    const vramMatch = model.vram.match(/([\d.]+)\s*(GB|MB)/);
                    if (vramMatch) {
                        const size = parseFloat(vramMatch[1]);
                        if (vramMatch[2] === 'GB') {
                            totalRam += size * 1024; // Convert GB to MB
                        } else {
                            totalRam += size;
                        }
                    }
                }
            });

            this._ramUsage = totalRam > 0 ? `${Math.round(totalRam)} MB` : '0 MB';

            // Update the display
            this._updateDisplay();

            // Recreate the menu
            this._createMenu();
        } catch (e) {
            console.error('Error fetching Ollama status:', e);
            this._runningModels = [];
            this._allModels = [];
            this._ramUsage = 'Error';
            this._updateDisplay();
        }
    }

    _updateDisplay() {
        // Update the tray icon text to show running models and RAM usage
        let displayText = 'OLLAMA';
        if (this._runningModels.length > 0) {
            const modelNames = this._runningModels.slice(0, 2).map(m => m.name.split(':')[0]);
            if (this._runningModels.length > 2) {
                displayText = `${modelNames.join(', ')}+${this._runningModels.length - 2} (${this._ramUsage})`;
            } else {
                displayText = `${modelNames.join(', ')} (${this._ramUsage})`;
            }
        } else {
            displayText = 'OLLAMA (0 MB)';
        }

        // Update the button text/tooltip
        this.set_tooltip_text(`Ollama - ${this._runningModels.length} running, ${this._allModels.length} total`);
    }

    _startPolling() {
        // Initial fetch
        this._fetchStatus();

        // Poll every 30 seconds
        this._pollingIntervalId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            this._fetchStatus();
            return GLib.SOURCE_CONTINUE; // Repeat the timeout
        });
    }

    _stopPolling() {
        if (this._pollingIntervalId) {
            GLib.Source.remove(this._pollingIntervalId);
            this._pollingIntervalId = null;
        }
    }

    // Helper function to fetch JSON from an endpoint
    _fetchJson(url) {
        return new Promise((resolve, reject) => {
            // Use spawn_command_line_sync for HTTP requests (most compatible approach)
            try {
                const [res, out, err, status] = GLib.spawn_command_line_sync(`curl -s -m 10 ${url}`);
                if (status === 0) {
                    try {
                        const response = ByteArray.toString(out).trim();
                        if (response) {
                            resolve(JSON.parse(response));
                        } else {
                            resolve(null);
                        }
                    } catch (parseError) {
                        console.error('Error parsing JSON response:', parseError);
                        reject(parseError);
                    }
                } else {
                    console.error('curl command failed:', err ? err.toString() : 'Unknown error');
                    reject(new Error(`Failed to fetch: ${err ? err.toString() : 'Unknown error'}`));
                }
            } catch (e) {
                console.error('Error in fetch function:', e);
                reject(e);
            }
        });
    }

    destroy() {
        this._stopPolling();
        super.destroy();
    }
}

export default class OllamaTrayExtension extends Extension {
    enable() {
        this._settings = ExtensionUtils.getSettings();
        this._indicator = new OllamaTrayIndicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        this._settings = null;
    }
}
