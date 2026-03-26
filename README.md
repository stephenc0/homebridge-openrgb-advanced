# homebridge-openrgb-custom

A Homebridge plugin to control RGB lighting on your PC via [OpenRGB](https://openrgb.org/). Fork of [homebridge-openrgb](https://github.com/dbrook823/homebridge-openrgb) with added white balance correction, color temperature, adaptive lighting, and per-zone tuning.

## Features

- Control RGB devices (fans, RAM, motherboard, strips, keyboards, etc.) as HomeKit lights
- **White balance correction** — per-device warm/cool slider to fix color tint
- **Per-zone overrides** — fine-tune white balance per named zone (e.g. Logo, Strip, Header)
- **Color temperature** — full mired-scale ColorTemperature characteristic
- **Adaptive Lighting** — Apple Home schedules color temperature automatically throughout the day
- **Custom config UI** — live device discovery, identify button, zone sliders
- Multiple OpenRGB servers supported (one per PC)

## Requirements

- [OpenRGB](https://openrgb.org/) running on your PC with the **SDK Server** enabled
- Homebridge >= 1.3.0
- Node.js >= 18.0.0

### Enabling the OpenRGB SDK Server

In OpenRGB: **Settings → SDK Server → Start Server** (default port 6742). Enable "Start at launch" to have it start automatically.

## Installation

### Via Homebridge UI (recommended)

Search for `homebridge-openrgb-custom` in the Homebridge plugin browser and install.

### Manually

```bash
sudo npm install -g https://github.com/stephenc0/homebridge-openrgb-custom
```

## Configuration

Use the **Homebridge Config UI** to configure the plugin — it provides a live configuration interface. Open the plugin settings to:

1. Add your OpenRGB server (host, port)
2. Click **Discover Devices** to detect all connected RGB devices
3. Use the **💡 Identify** button to flash a device's LEDs and confirm which one you're configuring
4. Set a **device-level white balance** (warm/cool slider) applied to all LEDs on the device
5. Expand **Zone overrides** to set a different white balance per named zone

### Manual JSON config

```json
{
    "name": "OpenRGB Custom",
    "platform": "OpenRgbCustomPlatform",
    "servers": [
        {
            "name": "My PC",
            "host": "192.168.1.100",
            "port": 6742,
            "deviceConfigs": [
                {
                    "name": "ASUS ROG STRIX B550-F",
                    "whiteBalance": 160,
                    "zoneWhiteBalance": {
                        "Aura Motherboard": 170,
                        "D_LED1 Bottom": 140
                    }
                }
            ]
        }
    ],
    "discoveryInterval": 60,
    "preserveDisconnected": false,
    "suppressConnectionErrors": false
}
```

### Config options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `"OpenRGB Custom"` | Plugin name |
| `servers` | array | | List of OpenRGB SDK servers |
| `servers[].name` | string | | Display name for the server |
| `servers[].host` | string | | IP address or hostname of the PC |
| `servers[].port` | integer | `6742` | OpenRGB SDK server port |
| `servers[].deviceConfigs` | array | | Per-device white balance settings |
| `discoveryInterval` | integer | `60` | Seconds between device discovery polls |
| `preserveDisconnected` | boolean | `false` | Keep devices in HomeKit when disconnected |
| `suppressConnectionErrors` | boolean | `false` | Hide connection error log messages |

### White balance

The white balance slider goes from **cool (0)** to **neutral (128)** to **warm (255)**:

- **Cool** reduces the red channel — useful if your LEDs appear too orange/yellow
- **Warm** reduces the blue channel — useful if your LEDs appear too blue/white
- **128** = no correction applied

Zone overrides use the same scale and take precedence over the device-level setting for LEDs within that zone.

## Differences from homebridge-openrgb

| Feature | homebridge-openrgb | homebridge-openrgb-custom |
|---|---|---|
| Color (Hue/Saturation) | Yes | Yes |
| Brightness | Yes | Yes |
| Color Temperature | No | Yes |
| Adaptive Lighting | No | Yes |
| White balance correction | No | Per-device + per-zone |
| Config UI | Basic | Live discovery, identify, zone sliders |

## Development

```bash
git clone https://github.com/stephenc0/homebridge-openrgb-custom
cd homebridge-openrgb-custom
npm install
npm run watch   # build + link + watch for changes
```
