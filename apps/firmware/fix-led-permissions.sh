#!/bin/bash
# Fix LED permissions so the firmware can control the onboard LED without sudo

LED_PATHS=(
    "/sys/class/leds/led0/brightness"
    "/sys/class/leds/ACT/brightness"
    "/sys/class/leds/PWR/brightness"
)

echo "Fixing LED permissions..."

for led_path in "${LED_PATHS[@]}"; do
    if [ -f "$led_path" ]; then
        echo "Found LED: $led_path"
        sudo chmod 666 "$led_path"
        echo "  ✓ Permissions fixed"
    fi
done

echo ""
echo "To make this persistent across reboots, add to /etc/rc.local:"
echo "  chmod 666 /sys/class/leds/ACT/brightness"
echo ""
echo "Or run this script after each reboot."

