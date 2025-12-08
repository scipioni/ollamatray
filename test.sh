#!/bin/sh

DEV_RES="1600x900" 
DEV_SCALE="1" # Use '2' for HiDPI testing
SHELL_DEBUG="all" # Optional: for max logging

MUTTER_DEBUG_DUMMY_MODE_SPECS=$DEV_RES \
MUTTER_DEBUG_DUMMY_MONITOR_SCALES=$DEV_SCALE \
SHELL_DEBUG=$SHELL_DEBUG \
dbus-run-session -- gnome-shell --devkit --wayland
