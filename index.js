var Service, Characteristic;
var request = require("request");
const _http_base = require("homebridge-http-base");
const PullTimer = _http_base.PullTimer;
var util = require('util');
var exec = require('child_process').exec;

module.exports = function(homebridge){
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-tesy-heater", "TesyHeater", TesyHeater);
};

class TesyHeater {

  constructor(log, config) {
    this.log = log;

    this.name = config.name;
    this.manufacturer = config.manufacturer || 'Tesy';
    this.model = config.model || 'Model';
    this.serialNumber = config.serialNumber || 'Serial Number';
  
    this.device_id = config.device_id;
    this.username = config.username || null;
    this.password = config.password || null;
    this.pullInterval = config.pullInterval || 10000;
    this.timeout = config.timeout || 10000;
    this.maxTemp = config.maxTemp || 30;
    this.minTemp = config.minTemp || 10;
  
    if(this.username != null && this.password != null){
      var command = 'curl -i -b cookie.txt -c cookie.txt -d "user=' + this.username + '&pass=' + this.password +
        '" https://www.mytesy.com/?do=login'
      exec(command, function(error, stdout, stderr){
        if(error !== null)
        {
            //TODO: restart this
        }
      });
    }

    this.log.info(this.name, this.apiroute);
  
    this.service = new Service.HeaterCooler(this.name);
  
    this.pullTimer = new PullTimer(this.log, this.pullInterval, this.refreshTesyHeaterStatus.bind(this), () => {});
    this.pullTimer.start();
  }

  identify(callback) {
    this.log.info("Hi, I'm ", this.name);
    callback();
  }

  getTesyHeaterActiveState(state){
    if (state.toLowerCase() === 'on')
      return Characteristic.Active.ACTIVE;
    else
      return Characteristic.Active.INACTIVE;
  }

  getTesyHeaterCurrentHeaterCoolerState(state){
    if (state.toUpperCase() === 'READY')
      return Characteristic.CurrentHeaterCoolerState.IDLE;
    else
      return Characteristic.CurrentHeaterCoolerState.HEATING;
  }

  refreshTesyHeaterStatus() {
    this.log.debug("Executing RefreshTesyHeaterStatus from:", this.apiroute);

    this.pullTimer.stop();

    var that = this;

    var command = 'curl -i -b cookie.txt -c cookie.txt -d "user=' + this.username + '&pass=' + this.password + 
      '" https://www.mytesy.com/?do=login'
    var command2 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?do=get_dev"'
    var command3 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?cmd=status&id=' + this.device_id + '"'

    exec(command, function(error, stdout, stderr){
      if(error !== null)
      {
          that.pullTimer.start();
          return;
      }

      exec(command2, function(error, stdout, stderr){
        if(error !== null)
        {
            that.pullTimer.start();
            return;
        }

        exec(command3, function(error, stdout, stderr){
            if(error !== null)
            {
                that.pullTimer.start();
                return;
            }

            stdout.split('\n').map(item => {
              if (item.toLowerCase().includes('heater_state')) {
                var response = JSON.parse(item);

                var newCurrentTemperature = parseFloat(response.gradus);
                var oldCurrentTemperature = that.service.getCharacteristic(Characteristic.CurrentTemperature).value;
                if (newCurrentTemperature != oldCurrentTemperature){
                  that.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newCurrentTemperature);
                  that.log.info("Changing CurrentTemperature from %s to %s", oldCurrentTemperature, newCurrentTemperature);
                }

                var newHeatingThresholdTemperature = parseFloat(response.ref_gradus);
                var oldHeatingThresholdTemperature = that.service.getCharacteristic(Characteristic.HeatingThresholdTemperature).value;
                if (newHeatingThresholdTemperature != oldHeatingThresholdTemperature){
                  that.service.getCharacteristic(Characteristic.HeatingThresholdTemperature).updateValue(newHeatingThresholdTemperature);
                  that.log.info("Changing HeatingThresholdTemperature from %s to %s", oldHeatingThresholdTemperature, newHeatingThresholdTemperature);
                }

                var newHeaterActiveStatus = that.getTesyHeaterActiveState(response.power_sw);
                var oldHeaterActiveStatus = that.service.getCharacteristic(Characteristic.Active).value;
                if (newHeaterActiveStatus != oldHeaterActiveStatus){
                  that.service.getCharacteristic(Characteristic.Active).updateValue(newHeaterActiveStatus);
                  that.log.info("Changing ActiveStatus from %s to %s", oldHeaterActiveStatus, newHeaterActiveStatus);
                }

                var newCurrentHeaterCoolerState = that.getTesyHeaterCurrentHeaterCoolerState(response.heater_state);
                var oldCurrentHeaterCoolerState = that.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState).value;
                if (newCurrentHeaterCoolerState != oldCurrentHeaterCoolerState){
                  that.service.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(newCurrentHeaterCoolerState);
                  that.log.info("Changing CurrentHeaterCoolerState from %s to %s", oldCurrentHeaterCoolerState, newCurrentHeaterCoolerState);
                }
                
                that.pullTimer.start();
                return;
            }
          });
        });
      });
    });
  }

  getActive(callback) {
    this.pullTimer.stop();
    callback();

    var that = this;

    var command = 'curl -i -b cookie.txt -c cookie.txt -d "user=' + this.username + '&pass=' + this.password + '" https://www.mytesy.com/?do=login'
    var command2 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?do=get_dev"'
    var command3 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?cmd=status&id=' + this.device_id + '"'

    exec(command, function(error, stdout, stderr){
      if(error !== null)
      {
          that.pullTimer.start();
          return;
      }

      exec(command2, function(error, stdout, stderr){
        if(error !== null)
        {
            that.pullTimer.start();
            return;
        }

        exec(command3, function(error, stdout, stderr){
            if(error !== null)
            {
                console.log('exec error: ' + error);
                that.pullTimer.start();
                return;
            }

            let r = stdout.split('\n');

            let r1 = r.filter(function(item){
              return (item.toLowerCase().includes('heater_state'));
            });

            if (r1.length !== 1) {
              that.pullTimer.start();
              return;
            }

            var response = JSON.parse(r1[0]);
            
            that.pullTimer.start();
            this.service.getCharacteristic(Characteristic.Active)
              .updateValue(that.getTesyHeaterActiveState(response.power_sw));
          });
        });
      });
  }

  setActive(value, callback) {
    this.log.info("[+] Changing HeatingThresholdTemperature to value: %s", value);

    this.pullTimer.stop();

    var that = this;

    let newValue = value === 0 ? 'off' : 'on';
    var command = 'curl -i -b cookie.txt -c cookie.txt -d "user=' + this.username + '&pass=' + this.password + '" https://www.mytesy.com/?do=login'
    var command2 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?do=get_dev"'
    var command3 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?cmd=power2status&val=' + newValue + '&id=' + this.device_id + '"'

    exec(command, function(error, stdout, stderr){
      if(error !== null)
      {
        that.log.error(error);
        that.pullTimer.start();
        callback();
      }

      exec(command2, function(error, stdout, stderr){
        if(error !== null)
        {
          that.log.error(error);
          that.pullTimer.start();
          callback();
        }

        exec(command3, function(error, stdout, stderr){
            if(error !== null)
            {
              that.log.error(error);
              that.pullTimer.start();
              callback();
            } else {
              that.log.info('Set Active done.');
              that.pullTimer.start();
              callback(null, value);
            }
        });
      });
    });
  }

  getCurrentTemperature(callback) {
    this.log.debug("Getting CurrentTemperature from:", this.apiroute);

    this.pullTimer.stop();

    callback();

    var that = this;

    var command = 'curl -i -b cookie.txt -c cookie.txt -d "user=' + this.username + '&pass=' + this.password + '" https://www.mytesy.com/?do=login'
    var command2 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?do=get_dev"'
    var command3 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?cmd=status&id=' + this.device_id + '"'

    exec(command, function(error, stdout, stderr){
      if(error !== null)
      {
          that.pullTimer.start();
          return;
      }

      exec(command2, function(error, stdout, stderr){
        if(error !== null)
        {
            that.pullTimer.start();
            return;
        }

        exec(command3, function(error, stdout, stderr){
            if(error !== null)
            {
                that.pullTimer.start();
                return;
            }

            let r = stdout.split('\n');

            let r1 = r.filter(function(item){
              return (item.toLowerCase().includes('heater_state'));
            });

            if (r1.length !== 1) {
              that.pullTimer.start();
              return;
            }

            var response = JSON.parse(r1[0]);
            
            var currentTemperature = parseFloat(response.gradus);

            that.log.debug("CurrentTemperature is: %s", currentTemperature);

            that.pullTimer.start();
            this.service.getCharacteristic(Characteristic.CurrentTemperature)
              .updateValue(that.getTesyHeaterActiveState(currentTemperature));
        });
      });
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

    var command = 'curl -i -b cookie.txt -c cookie.txt -d "user=' + this.username + '&pass=' + this.password + '" https://www.mytesy.com/?do=login'
    var command2 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?do=get_dev"'
    var command3 = 'curl -i -b cookie.txt -c cookie.txt "https://www.mytesy.com/?cmd=setTemp&val=' + value + '&id=' + this.device_id + '"'

    exec(command, function(error, stdout, stderr){
      if(error !== null)
      {
          that.pullTimer.start();
          that.log.error(error);
          callback();
      }

      exec(command2, function(error, stdout, stderr){
        if(error !== null)
        {
            that.pullTimer.start();
            that.log.error(error);
            callback();
        }

        exec(command3, function(error, stdout, stderr){
            if(error !== null)
            {
                that.log.error(error);
                that.pullTimer.start();
                callback();
            } else {
              that.pullTimer.start();
              that.log.info('Set Heating Threshold Temperature done.');
              callback(null, value);
            }
        });
      });
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
      .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

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
      });

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