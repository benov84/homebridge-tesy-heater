var Service, Characteristic;
const _http_base = require("homebridge-http-base");
const PullTimer = _http_base.PullTimer;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-tesy-heater-v2", "TesyHeater", TesyHeater);
};

class TesyHeater {

  constructor(log, config) {
    this.log = log;

    this.name = config.name;
    this.manufacturer = config.manufacturer || 'Tesy';
    this.model = config.model || 'Convector (Heater)';
    this.device_id = config.device_id;
    this.session = "";//config.session || "";
    this.alt = "";//config.alt || "";
    this.pullInterval = config.pullInterval || 10000;
    this.maxTemp = config.maxTemp || 30;
    this.minTemp = config.minTemp || 10;
    
    this.userid = config.userid || null;
    this.username = config.username || null;
    this.password = config.password || null;

    if(this.username != null && this.password != null) {
      var request = require('request');
      var options = {
        'method': 'POST',
        'url': 'https://ad.mytesy.com/rest/old-app-login',
        'headers': {
          'authority': 'ad.mytesy.com',
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'en-US,en;q=0.9,bg;q=0.8',
          'content-type': 'application/json',
          'dnt': '1',
          'origin': 'https://v4.mytesy.com',
          'referer': 'https://v4.mytesy.com/'
        },
        body: JSON.stringify({
          "email": this.username,
          "password": this.password,
          "userID": this.userid,
          "userEmail": this.username,
          "userPass": this.password,
          "lang": "en"
        })

      };
      var that = this;
      request(options, function (error, response) {
        if (error) throw new Error(error);
        var data = JSON.parse(response.body);
        that.session = data.acc_session;
        that.alt = data.acc_alt;

        that.pullTimer = new PullTimer(that.log, that.pullInterval, that.refreshTesyHeaterStatus.bind(that), () => {});
        that.pullTimer.start();
      });

    }
    
    this.log.info(this.name);
  
    this.service = new Service.HeaterCooler(this.name);
  
    this.pullTimer = new PullTimer(this.log, this.pullInterval, this.refreshTesyHeaterStatus.bind(this), () => {});
    this.pullTimer.start();
  }

  identify(callback) {
    this.log.info("Hi, I'm ", this.name);
    callback();
  }

  getTesyHeaterActiveState(state) {
    if (state.toLowerCase() === 'on')
      return Characteristic.Active.ACTIVE;
    else
      return Characteristic.Active.INACTIVE;
  }

  getTesyHeaterCurrentHeaterCoolerState(state) {
    if (state.toUpperCase() === 'READY')
      return Characteristic.CurrentHeaterCoolerState.IDLE;
    else
      return Characteristic.CurrentHeaterCoolerState.HEATING;
  }

  refreshTesyHeaterStatus() {
    this.log.debug("Executing RefreshTesyHeaterStatus");
    
    this.pullTimer.stop();

    var that = this;

    var request = require('request');
    var options = {
      'method': 'POST',
      'url': 'https://ad.mytesy.com/rest/old-app-devices',
      'headers': {
        'authority': 'ad.mytesy.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,bg;q=0.8',
        'content-type': 'application/json',
        'dnt': '1',
        'origin': 'https://v4.mytesy.com',
        'referer': 'https://v4.mytesy.com/'
      },
      body: JSON.stringify({
        "ALT": this.alt,
        "CURRENT_SESSION": null,
        "PHPSESSID": this.session,
        "last_login_username": this.username,
        "userID": this.userid,
        "userEmail": this.username,
        "userPass": this.password,
        "lang": "en"
      })

    };
    request(options, function (error, response) {
      if (error) {
        that.service.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
        throw new Error(error);
      }
      try {
        var data = JSON.parse(response.body);
        var status = data.device[Object.keys(data.device)[0]].DeviceStatus;
  
        var newCurrentTemperature = parseFloat(status.gradus);
        var oldCurrentTemperature = that.service.getCharacteristic(Characteristic.CurrentTemperature).value;
        if (newCurrentTemperature != oldCurrentTemperature && newCurrentTemperature != undefined &&
            newCurrentTemperature >= that.minTemp && newCurrentTemperature <= that.maxTemp) {
          that.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newCurrentTemperature);
          that.log.info("Changing CurrentTemperature from %s to %s", oldCurrentTemperature, newCurrentTemperature);
        }
  
        var newHeatingThresholdTemperature = parseFloat(status.ref_gradus);
        var oldHeatingThresholdTemperature = that.service.getCharacteristic(Characteristic.HeatingThresholdTemperature).value;
        if (newHeatingThresholdTemperature != oldHeatingThresholdTemperature && newHeatingThresholdTemperature != undefined &&
            newHeatingThresholdTemperature >= that.minTemp && newHeatingThresholdTemperature <= that.maxTemp) {
          that.service.getCharacteristic(Characteristic.HeatingThresholdTemperature).updateValue(newHeatingThresholdTemperature);
          that.log.info("Changing HeatingThresholdTemperature from %s to %s", oldHeatingThresholdTemperature, newHeatingThresholdTemperature);
        }
  
        var newHeaterActiveStatus = that.getTesyHeaterActiveState(status.power_sw);
        var oldHeaterActiveStatus = that.service.getCharacteristic(Characteristic.Active).value;
        if (newHeaterActiveStatus != oldHeaterActiveStatus && newHeaterActiveStatus !== undefined) {
          that.service.getCharacteristic(Characteristic.Active).updateValue(newHeaterActiveStatus);
          that.log.info("Changing ActiveStatus from %s to %s", oldHeaterActiveStatus, newHeaterActiveStatus);
        }
  
        var newCurrentHeaterCoolerState = that.getTesyHeaterCurrentHeaterCoolerState(status.heater_state);
        var oldCurrentHeaterCoolerState = that.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState).value;
        if (newCurrentHeaterCoolerState != oldCurrentHeaterCoolerState) {
          that.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(newCurrentHeaterCoolerState);
          that.log.info("Changing CurrentHeaterCoolerState from %s to %s", oldCurrentHeaterCoolerState, newCurrentHeaterCoolerState);
        }
        
        that.pullTimer.start();
        return;
      } catch(e) {
        console.log(e);
        that.pullTimer.start();
        that.service.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
      }
    });
  }

  getActive(callback) {
    this.pullTimer.stop();
    callback(null, this.service.getCharacteristic(Characteristic.Active).value);

    var that = this;

    var request = require('request');
    var options = {
      'method': 'POST',
      'url': 'https://ad.mytesy.com/rest/old-app-devices',
      'headers': {
        'authority': 'ad.mytesy.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,bg;q=0.8',
        'content-type': 'application/json',
        'dnt': '1',
        'origin': 'https://v4.mytesy.com',
        'referer': 'https://v4.mytesy.com/'
      },
      body: JSON.stringify({
        "ALT": this.alt,
        "CURRENT_SESSION": null,
        "PHPSESSID": this.session,
        "last_login_username": this.username,
        "userID": this.userid,
        "userEmail": this.username,
        "userPass": this.password,
        "lang": "en"
      })

    };
    request(options, function (error, response) {
      if (error) {
        that.service.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
        throw new Error(error);
      }
      try {
        var data = JSON.parse(response.body);
        var status = data.device[Object.keys(data.device)[0]].DeviceStatus;
  
        var newHeaterActiveStatus = that.getTesyHeaterActiveState(status.power_sw);
        var oldHeaterActiveStatus = that.service.getCharacteristic(Characteristic.Active).value;
        if (newHeaterActiveStatus != oldHeaterActiveStatus && newHeaterActiveStatus !== undefined) {
          that.service.getCharacteristic(Characteristic.Active).updateValue(newHeaterActiveStatus);
          that.log.info("Changing ActiveStatus from %s to %s", oldHeaterActiveStatus, newHeaterActiveStatus);
        }
  
        that.pullTimer.start();
        return;
      } catch(e) {
        console.log(e);
        that.pullTimer.start();
      }
    });
  }

  setActive(value, callback) {
    this.log.info("[+] Changing Active status to value: %s", value);

    this.pullTimer.stop();

    var that = this;

    let newValue = value === 0 ? 'off' : 'on';

    var request = require('request');
    var options = {
      'method': 'POST',
      'url': 'https://ad.mytesy.com/rest/old-app-set-device-status',
      'headers': {
        'authority': 'ad.mytesy.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,bg;q=0.8',
        'content-type': 'application/json',
        'dnt': '1',
        'origin': 'https://v4.mytesy.com',
        'referer': 'https://v4.mytesy.com/'
      },
      body: JSON.stringify({
        "ALT": this.alt,
        "CURRENT_SESSION": null,
        "PHPSESSID": this.session,
        "last_login_username": this.username,
        "id": this.device_id,
        "apiVersion": "apiv1",
        "command": "power_sw",
        "value": newValue,
        "userID": this.userid,
        "userEmail": this.username,
        "userPass": this.password,
        "lang": "en"
      })
    };
    request(options, function (error, response) {
      callback(null, value);
      that.pullTimer.start();
    });    
  }

  getCurrentTemperature(callback) {
    this.pullTimer.stop();

    callback(null, this.service.getCharacteristic(Characteristic.CurrentTemperature).value);

    var that = this;

    var request = require('request');
    var options = {
      'method': 'POST',
      'url': 'https://ad.mytesy.com/rest/old-app-devices',
      'headers': {
        'authority': 'ad.mytesy.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,bg;q=0.8',
        'content-type': 'application/json',
        'dnt': '1',
        'origin': 'https://v4.mytesy.com',
        'referer': 'https://v4.mytesy.com/'
      },
      body: JSON.stringify({
        "ALT": this.alt,
        "CURRENT_SESSION": null,
        "PHPSESSID": this.session,
        "last_login_username": this.username,
        "userID": this.userid,
        "userEmail": this.username,
        "userPass": this.password,
        "lang": "en"
      })

    };
    request(options, function (error, response) {
      if (error) {
        that.service.getCharacteristic(Characteristic.Active).updateValue(Characteristic.Active.INACTIVE);
        throw new Error(error);
      }
      try {
        var data = JSON.parse(response.body);
        var status = data.device[Object.keys(data.device)[0]].DeviceStatus;
    
        var newCurrentTemperature = parseFloat(status.gradus);
        var oldCurrentTemperature = that.service.getCharacteristic(Characteristic.CurrentTemperature).value;
        if (newCurrentTemperature != oldCurrentTemperature && newCurrentTemperature != undefined &&
            newCurrentTemperature >= that.minTemp && newCurrentTemperature <= that.maxTemp) {
          that.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newCurrentTemperature);
          that.log.info("Changing CurrentTemperature from %s to %s", oldCurrentTemperature, newCurrentTemperature);
        }
  
        that.pullTimer.start();
        return;
      } catch(e) {
        console.log(e);
        that.pullTimer.start();
      }
    });
  }

  setHeatingThresholdTemperature(value, callback) {
    if (value < this.minTemp)
      value = this.minTemp;
    if (value > this.maxTemp)
      value = this.maxTemp;
    this.log.info("[+] Changing HeatingThresholdTemperature to value: %s", value);

    this.pullTimer.stop();
    
    var that = this;

    var request = require('request');
    var options = {
      'method': 'POST',
      'url': 'https://ad.mytesy.com/rest/old-app-set-device-status',
      'headers': {
        'authority': 'ad.mytesy.com',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9,bg;q=0.8',
        'content-type': 'application/json',
        'dnt': '1',
        'origin': 'https://v4.mytesy.com',
        'referer': 'https://v4.mytesy.com/'
      },
      body: JSON.stringify({
        "ALT": this.alt,
        "CURRENT_SESSION": null,
        "PHPSESSID": this.session,
        "last_login_username": this.username,
        "id": this.device_id,
        "apiVersion": "apiv1",
        "command": "tmpT",
        "value": value,
        "userID": this.userid,
        "userEmail": this.username,
        "userPass": this.password,
        "lang": "en"
      })
    
    };
    request(options, function (error, response) {
      callback(null, value);
      that.pullTimer.start();
    });    
  }

  getTargetHeaterCoolerState(callback) {
    callback(null, Characteristic.TargetHeaterCoolerState.HEAT);
  }

  getName(callback) {
    callback(null, this.name);
  }

  getServices() {
    this.informationService = new Service.AccessoryInformation();
    
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.device_id);

    this.service.getCharacteristic(Characteristic.Active)
      .on('get', this.getActive.bind(this))
      .on('set', this.setActive.bind(this))

    this.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .updateValue(Characteristic.CurrentHeaterCoolerState.INACTIVE);

    this.service
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .on('get', this.getTargetHeaterCoolerState.bind(this));

    this.service.getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));
      
      this.service.getCharacteristic(Characteristic.HeatingThresholdTemperature)
        .on('set', this.setHeatingThresholdTemperature.bind(this))

    this.service
      .getCharacteristic(Characteristic.Name)
      .on('get', this.getName.bind(this));

    this.service.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minStep: 0.1
      });

    this.service.getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .setProps({
        minValue: this.minTemp,
        maxValue: this.maxTemp,
        minStep: 0.5
      })
      .updateValue(this.minTemp);

    //adding this characteristic so the marker for current temperature appears in the homekit wheel.
    this.service.getCharacteristic(Characteristic.CoolingThresholdTemperature)
      .setProps({
        minValue: this.minTemp,
        maxValue: this.maxTemp,
        minStep: 0.5
      })
      .updateValue(0);
 
    this.service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .setProps({
        validValues: [Characteristic.TargetHeaterCoolerState.HEAT]
      });

    this.refreshTesyHeaterStatus();

    return [this.informationService, this.service];
  }
}