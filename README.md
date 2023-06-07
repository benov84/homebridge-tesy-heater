# homebridge-tesy-heater

#### Homebridge plugin to control a Tesy Heater (Convector)

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

## Installation

1. Install [homebridge](https://github.com/homebridge/homebridge#installation-details)
2. Install this plugin: `npm install -g homebridge-tesy-heater-v2`
3. Update your `config.json` file (See below).

## Configuration example

```json
"accessories": [
     {
       "accessory": "TesyHeater",
       "name": "My Tesy Heater",
       "session": "PHPSESSID",
       "alt": "X-Acc-Alt",
       "device_id": "XXXXXXXXXXXXXXX",
       "maxTemp": 30,
       "minTemp": 10,
     }
]
```

### Obtaining Device Id

Login at

[My Tesy Cloud](http://mytesy.com)

with your user name and password, then open this link:

[https://www.mytesy.com/v3/api.php?do=get_dev](https://www.mytesy.com/v3/api.php?do=get_dev)

You will see a 40-character-long field named "id" - this is your device id. If you have multiple devices (Heater, Convector), config them as separate accessories.

### Structure

| Key | Description |
| --- | --- |
| `accessory` | Must be `TesyHeater` |
| `name` | Name to appear in the Home app |
| `session` | PHPSESSID from Cookie |
| `alt` | X-Acc-Alt - obtain from browser -> developer tools -> network |
| `device_id` | Heater (Convector) Device Id |
| `pullInterval` _(optional)_ | This property expects an interval in milliseconds in which the plugin pulls updates from your Ecoforest heater (`10000` is default)  
| `maxTemp` _(optional)_ | Upper bound for the temperature selector in the Home app (`30` is default) |
| `minTemp` _(optional)_ | Lower bound for the temperature selector in the Home app (`10` is default) |
| `model` _(optional)_ | Appears under "Model" for your accessory in the Home app |
| `serialNumber` _(optional)_ | Appears under "Serial Number" for your accessory in the Home app |

Important! Note that, if you turn off the power, the tesy server returns the latest info from the heater and the current state will not be correct!

#### Bottom Line

This plugin is based on homebridge-ecoforest-heater.

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)