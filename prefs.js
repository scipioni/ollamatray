/* prefs.js
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

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

/**
 * Modern GNOME Shell 45+ preferences implementation
 * Uses explicit apply pattern to prevent freezing and ensure robustness
 */
export default class OllamaTrayPreferences extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);
        this._pendingChanges = new Map();
    }

    /**
     * Fill the preferences window with settings
     * @param {Adw.PreferencesWindow} window - The preferences window
     */
    fillPreferencesWindow(window) {
        // Get settings using the modern API
        const settings = this.getSettings();

        // Create a preferences page
        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        // Add connection settings group
        this._addConnectionGroup(page, settings);

        // Add display settings group
        this._addDisplayGroup(page, settings);

        // Add about group
        this._addAboutGroup(page);

        // Handle window close - save pending changes
        window.connect('close-request', () => {
            this._applyPendingChanges(settings);
            this._pendingChanges.clear();
            return false;
        });
    }

    /**
     * Add connection settings group
     * @param {Adw.PreferencesPage} page - The preferences page
     * @param {Gio.Settings} settings - The settings object
     */
    _addConnectionGroup(page, settings) {
        const connectionGroup = new Adw.PreferencesGroup({
            title: 'Connection Settings',
            description: 'Configure Ollama API connection',
        });
        page.add(connectionGroup);

        // Ollama URL setting with validation
        const urlRow = new Adw.EntryRow({
            title: 'Ollama API URL',
            text: settings.get_string('ollama-url'),
            show_apply_button: true,
            input_purpose: Gtk.InputPurpose.URL,
        });

        // Track changes without auto-saving
        urlRow.connect('apply', () => {
            const url = urlRow.get_text();
            if (!this._isValidUrl(url)) {
                urlRow.add_css_class('error');
                return;
            }
            urlRow.remove_css_class('error');
            this._pendingChanges.set('ollama-url', url);
        });

        // Validate on change
        urlRow.connect('changed', () => {
            const url = urlRow.get_text();
            if (this._isValidUrl(url)) {
                urlRow.remove_css_class('error');
            }
        });

        connectionGroup.add(urlRow);

        // Polling interval setting
        const pollingRow = new Adw.SpinRow({
            title: 'Polling Interval',
            subtitle: 'How often to check Ollama status (in seconds)',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 3600,
                step_increment: 5,
                page_increment: 30,
                value: settings.get_int('polling-interval'),
            }),
            climb_rate: 1.0,
            digits: 0,
            numeric: true,
        });

        // Track changes only
        pollingRow.connect('changed', () => {
            this._pendingChanges.set('polling-interval', pollingRow.get_value());
        });

        connectionGroup.add(pollingRow);

        // GPU RAM setting
        const gpuRamRow = new Adw.SpinRow({
            title: 'GPU RAM',
            subtitle: 'Total GPU RAM available in MB (0 to disable GPU monitoring)',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100000,
                step_increment: 512,
                page_increment: 1024,
                value: settings.get_int('gpu-ram'),
            }),
            climb_rate: 512.0,
            digits: 0,
            numeric: true,
        });

        // Track changes only
        gpuRamRow.connect('changed', () => {
            this._pendingChanges.set('gpu-ram', gpuRamRow.get_value());
        });

        connectionGroup.add(gpuRamRow);
    }

    /**
     * Add display settings group
     * @param {Adw.PreferencesPage} page - The preferences page
     * @param {Gio.Settings} settings - The settings object
     */
    _addDisplayGroup(page, settings) {
        const displayGroup = new Adw.PreferencesGroup({
            title: 'Display Settings',
            description: 'Configure what to show in the system tray',
        });
        page.add(displayGroup);

        // Show tray text setting
        const showTrayTextRow = new Adw.SwitchRow({
            title: 'Show Text in Tray',
            subtitle: 'Display model names and RAM usage as text',
            active: settings.get_boolean('show-tray-text'),
        });

        // Track changes only
        showTrayTextRow.connect('notify::active', () => {
            this._pendingChanges.set('show-tray-text', showTrayTextRow.active);
        });

        displayGroup.add(showTrayTextRow);

        // Show GPU RAM setting
        const showGpuRamRow = new Adw.SwitchRow({
            title: 'Show GPU RAM Usage',
            subtitle: 'Display GPU RAM usage in tray text',
            active: settings.get_boolean('show-gpu-ram'),
        });

        // Track changes only
        showGpuRamRow.connect('notify::active', () => {
            this._pendingChanges.set('show-gpu-ram', showGpuRamRow.active);
        });

        displayGroup.add(showGpuRamRow);

        // Show CPU RAM setting
        const showCpuRamRow = new Adw.SwitchRow({
            title: 'Show CPU RAM Usage',
            subtitle: 'Display CPU RAM usage in tray text',
            active: settings.get_boolean('show-cpu-ram'),
        });

        // Track changes only
        showCpuRamRow.connect('notify::active', () => {
            this._pendingChanges.set('show-cpu-ram', showCpuRamRow.active);
        });

        displayGroup.add(showCpuRamRow);
    }

    /**
     * Add about group with extension information
     * @param {Adw.PreferencesPage} page - The preferences page
     */
    _addAboutGroup(page) {
        const aboutGroup = new Adw.PreferencesGroup({
            title: 'About',
        });
        page.add(aboutGroup);

        // Extension name and version
        const metadata = this.metadata;
        const aboutRow = new Adw.ActionRow({
            title: metadata.name || 'Ollama Tray',
            subtitle: `Version ${metadata.version || '1.0'}\n${metadata.description || ''}`,
        });
        aboutGroup.add(aboutRow);

        // Repository link if available
        if (metadata.url) {
            const linkRow = new Adw.ActionRow({
                title: 'Repository',
                subtitle: metadata.url,
                activatable: true,
            });
            
            linkRow.add_suffix(new Gtk.Image({
                icon_name: 'adw-external-link-symbolic',
            }));

            linkRow.connect('activated', () => {
                Gtk.show_uri(null, metadata.url, Gtk.get_current_event_time());
            });

            aboutGroup.add(linkRow);
        }
    }

    /**
     * Apply all pending changes to settings
     * @param {Gio.Settings} settings - The settings object
     */
    _applyPendingChanges(settings) {
        if (this._pendingChanges.size === 0) {
            return;
        }

        // Apply all changes atomically
        for (const [key, value] of this._pendingChanges.entries()) {
            try {
                switch (key) {
                    case 'ollama-url':
                        settings.set_string(key, value);
                        break;
                    case 'polling-interval':
                    case 'gpu-ram':
                        settings.set_int(key, value);
                        break;
                    case 'show-tray-text':
                    case 'show-gpu-ram':
                    case 'show-cpu-ram':
                        settings.set_boolean(key, value);
                        break;
                }
            } catch (e) {
                logError(e, `Failed to apply setting: ${key}`);
            }
        }
    }

    /**
     * Validate URL format
     * @param {string} url - The URL to validate
     * @returns {boolean} True if URL is valid
     */
    _isValidUrl(url) {
        if (!url || url.trim() === '') {
            return false;
        }

        try {
            // Check if it's a valid URL format
            const urlPattern = /^https?:\/\/.+/;
            return urlPattern.test(url.trim());
        } catch (e) {
            return false;
        }
    }
}