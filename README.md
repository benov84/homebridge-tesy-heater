# homebridge-tesy-heater

#### Homebridge plugin to control a Tesy Heater (Convector)

Updated to Tesy API v4!

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
       "userid": "id",
       "username": "user",
       "password": "pass",
       "device_id": "XXXXXXXXXXXXXXX",
       "maxTemp": 30,
       "minTemp": 10,
     }
]
```

### Obtaining Device Id

Login at

[My Tesy Cloud](http://mytesy.com)

then open browser's Developer Tools. Go to Network tab and you will see requests named "old-app-devices".
Click on them one by one and look at the Response tab on right. You will find the device id inside Json response in field named "id". The device id is 40-symbol long combination of numbers and letters.

### Structure

| Key | Description |
| --- | --- |
| `accessory` | Must be `TesyHeater` |
| `name` | Name to appear in the Home app |
| `userid` | User Id from Tesy Cloud |
| `username` | E-mail |
| `password` | Password |
| `device_id` | Device Id from Tesy Cloud |
| `pullInterval` _(optional)_ | This property expects an interval in milliseconds in which the plugin pulls updates from your Ecoforest heater (`10000` is default)  
| `maxTemp` _(optional)_ | Upper bound for the temperature selector in the Home app (`30` is default) |
| `minTemp` _(optional)_ | Lower bound for the temperature selector in the Home app (`10` is default) |
| `model` _(optional)_ | Appears under "Model" for your accessory in the Home app |
| `serialNumber` _(optional)_ | Appears under "Serial Number" for your accessory in the Home app |

Important! Note that, if you turn off the power, the tesy server returns the latest info from the heater and the current state will not be correct!

#### Bottom Line

This plugin is based on homebridge-ecoforest-heater.

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)