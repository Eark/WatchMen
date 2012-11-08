var request   = require('request')
  , hosts     = require('../config/hosts')
  , config    = require('../config/general')
  , nodejitsu = require('../config/nodejitsu')
  , services  = []
  ;

module.exports.load_services = function (cb){
  //
  // Cache services on multiple requires
  //
  if (services.length !== 0) {
    return cb(null, services);
  }

  //
  // Get our servers from CouchDB
  //
  return request(
    { json: true
    , uri : nodejitsu.couchdb
    }, function (err, _, response) {
      //
      // Exit if this fails.
      //
      if (err) {
        return cb(err);
      }

      var hostingInfo = response.rows;
      //
      // For each application
      //
      hostingInfo.forEach(function (application) {
        //
        // Get the state, and only monitor started applications
        //
        var state = application.value.state;

        //
        // Create stub about this specific server
        //
        var curatedInfo = 
          { protocol : "http"
          , name     : application.value._id +
                       ' [' + application.value.subdomain + ']'
          , host     : application.value.subdomain + '.jit.su'
          , port     : 80
          , timeout  : 10000
          , alert_to : ["#nodejitsu"]      // Not implemented
          , enabled  : state === "started" // Enabled for started apps
          , ping_service_name    : 'http'
          //
          // In seconds, every 10 minutes
          // Also make them phase out a bit
          //
          , ping_interval        : 60*10 + Math.floor(Math.random() * 3) + 1
          , failed_ping_interval : 60*10   //
          , warning_if_takes_more_than : 1000*2 // Miliseconds
          , services :
            [
              { name     : 'Home for ' + application.value._id
              , method   : 'get'
              , url      : '/'
              , expected : {statuscode: 200 }
              }
            ]
          };

        curatedInfo.services.forEach(function (service) {
          //
          // Set the currentInfo as a property to each service
          //
          service.host = curatedInfo;

          //
          // Avoid circular refs
          //
          delete service.host.services;

          //
          // Friendly display of this service
          //
          service.url_info = curatedInfo.name + ' - ' + curatedInfo.host +
            ':'+ curatedInfo.port  + ' / ' + curatedInfo.name;

          console.log("+", service.url_info);

          service.warning_if_takes_more_than = 
            service.warning_if_takes_more_than ||
            curatedInfo.warning_if_takes_more_than;

          //
          // Config ping interval
          //
          service.ping_interval = service.ping_interval 
                               || curatedInfo.ping_interval 
                               || 60*10;

          //
          // Config failed ping interval
          //
          service.failed_ping_interval = service.failed_ping_interval 
                                       || curatedInfo.failed_ping_interval 
                                       || 60*10;

          //
          // Config alert notifications
          //
          service.alert_to = service.alert_to
                          || curatedInfo.alert_to
                          || config.notifications.to;

          //
          // Resolve ping service name value
          //
          service.ping_service_name = service.ping_service_name 
                                   || curatedInfo.ping_service_name 
                                   || 'http';

          //
          // Resolve ping service for this service instance
          //
          service.ping_service = 
            require('./ping_services/' + service.ping_service_name);

          //
          // Resolve if service is enabled
          //
          if (!service.enabled && curatedInfo.enabled){
            //
            // No enabled config found for service
            //
            service.enabled = curatedInfo.enabled;
          } else {
            //
            // Enabled by default
            //
            service.enabled = true;
          }

          services.push (service);
        });
      });

      return cb(null, services);
    });
};