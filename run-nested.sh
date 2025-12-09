#!/bin/sh

glib-compile-schemas ./schemas/
DEV_RES="1600x900" 
DEV_SCALE="1" # Use '2' for HiDPI testing
SHELL_DEBUG="all" # Optional: for max logging

export MUTTER_DEBUG_DUMMY_MODE_SPECS=$DEV_RES
export MUTTER_DEBUG_DUMMY_MONITOR_SCALES=$DEV_SCALE
export SHELL_DEBUG=$SHELL_DEBUG
export G_MESSAGES_DEBUG=all

dbus-run-session -- gnome-shell --devkit --wayland

