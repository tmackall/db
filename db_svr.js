"use strict";
const path = require('path');
const fs = require('fs');
const async = require('async');
const http = require('http');
const recursive = require('recursive-readdir');
const winston = require('winston');
const ObjectId = require('mongodb').ObjectId;
const boom = require('boom');
const hapi = require('hapi');

const LL = process.env.LL || process.env.npm_package_config_ll || 'warning';
const PORT_DB = process.env.PORT_DB || process.env.npm_package_config_port_db || '3002';
const IP_DB = process.env.IP_DB || process.env.npm_package_config_ip_db || '192.168.0.21';
const DB_NAME = 'camera';
const DB_COLLECTION = 'db/movement';

// --------------------
// logger
// --------------------
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({'timestamp':true, level: LL})
   ]
});

//
// db globals
const DB = 'mongodb://' + IP_DB + ':27017/' + DB_NAME;
logger.info(DB);

var MongoClient = require('mongodb').MongoClient,
  test = require('assert');

      
// ----------------------------------------
//
// getAllUnprocessed() - get all the unprocessed
// db movement entries.
//
// ----------------------------------------
function getAllUnprocessed(fUpdate, callback) {
  if (typeof callback === 'undefined') {
    callback = fUpdate;
    fUpdate = false;
  }

  MongoClient.connect(DB, function(err, db) {
    db.collection(DB_COLLECTION).find({
      processed: fUpdate
    }).toArray(function(err, res){
      db.close();
      callback(err, res);
    });
  });
}

// ---------------------------------------------------------
//
// insertMovementDoc() - insert movement document
//
// ---------------------------------------------------------
function insertMovementDoc(callback) {
  // Insert a single document
  MongoClient.connect(DB, function(err, db) {
    let item = {
      movement_date: new Date(),
      processed: false
    };
    db.collection(DB_COLLECTION).insertOne(
      item,
      function(err, res){
        db.close();
        callback(err, item._id);
    });
  });
}

// ----------------------------------------
//
// db - update movement document
//
// ----------------------------------------
function updateMovementDoc(lMovement, callback) {

  var oid = null;
  MongoClient.connect(DB, function(err, db) {
    async.forEachSeries(lMovement, function(rec, callb) {
      logger.debug('update: ' + rec._id);
      oid = new ObjectId(rec._id);
      db.collection(DB_COLLECTION).update({
        _id: oid},
        { $set:{processed: rec.processed}},
        function(err, res){
          logger.debug(res);
          callb(err);
      });
    }, function(err) {
      db.close();
      callback(err);
    });
  });
}

// ----------------------------
//
// web app - create the db service
//
// ----------------------------
/*
var server = http.createServer(requestProcess);

function requestProcess(request, response) {
  let headers = request.headers;
  let method = request.method;
  let url = request.url;
  let body = [];
  let valRet = {};
  let data = null;

  response.statusCode = 200;
  request.on('error', function(err) {
    logger.error(err);
    valRet.text = err;
  }).on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    body = Buffer.concat(body);
    response.on('error', function(err) {
      logger.error(err);
      valRet.text = err;
    });

    let tmpReq = 'Message received: ' + url;
    
    // response - put it together and it needs to be synced
    async.series([
      function(cb) {
        
        // movement - store the activity in the
        // database
        if (url === '/db/movement' &&  method == 'POST') {
          logger.debug('Storing movement info');
          insertMovementDoc(function(err) {
            if (err) {
              logger.error(err);
              response.statusCode = 400;
              cb(err);
            } else {
              response.statusCode = 201;
              cb();
            }
          });
        } else if (url === '/db/unprocessed' &&  method == 'GET') {
          logger.debug('Get the unprocessed DB entries');
          getAllUnprocessed(function(err, res){
            if (err) {
              response.statusCode = 400;
            } else {
              valRet.query = res;
            }
            cb();
          });
        } else if (url === '/db/unprocessed' &&  method == 'PUT') {
          logger.debug('Update DB entries - unprocessed');
          data = JSON.parse(body);
          updateMovementDoc(data, false, function(err) {
            logger.debug('update status: ' + err);
            cb(err);
          });
        } else if (url === '/db/processed' &&  method == 'GET') {
          logger.debug('Get the processed DB entries');
          getAllUnprocessed(true, function(err, res){
            if (err) {
              response.statusCode = 400;
            } else {
              valRet.query = res;
            }
            cb();
          });
        } else if (url === '/db/processed' &&  method == 'PUT') {
          logger.debug('Update DB entries - processed');
          data = JSON.parse(body);
          updateMovementDoc(data, function(err) {
            logger.debug('update status: ' + err);
            cb(err);
          });
    
        } else {
          logger.warn('Unrecognized request: %s', tmpReq);
          response.statusCode = 404;
          cb();
        }
      },
      // http response handling
      function(cb) {
        
        response.setHeader('Content-Type', 'application/json');
        valRet.status = response.statusCode;
    
        let responseBody = {
          method: method,
          data: valRet,
          url: url,
        };
    
        response.write(JSON.stringify(responseBody));
        response.end();
      },
    ]);
  });
}

server.listen(PORT_DB);
*/
// ------------------------------------
//  main loop - service
// ------------------------------------
let server = new hapi.Server();
server.connection({ 
  port: PORT_DB
});

// endpoint and method definitions
server.route([
  {
    method: ['POST'],
    path:'/db/movement', 
    handler: function (request, reply) {
      logger.debug('Storing movement info');
      insertMovementDoc(function(err, res) {
        if (err) {
          let msg = 'mandatory param state is undefined';
          logger.error(msg);
          return reply(boom.badRequest(msg));
        } else {
          console.log(res);
          return reply({id: res}).code(201);
        }
      });
    }
  },
  {
    method: ['GET'],
    path:'/db/unprocessed', 
    handler: function (request, reply) {
      logger.debug('Get the unprocessed DB entries');
      getAllUnprocessed(function(err, res){
        if (err) {
          let msg = err + ' returned';
          logger.error(msg);
          return reply(boom.badImplementation(msg));
        } else {
          return reply(res);
        }
      });
    }
  },
  {
    method: ['PUT'],
    path:'/db/processed', 
    handler: function (request, reply) {
      logger.debug('Update the DB entries');
      let data = request.payload;

      updateMovementDoc(data, function(err) {
        logger.debug('update status: ' + err);
        if (err) {
          let msg = err + ' returned';
          logger.error(msg);
          return reply(boom.badImplementation(msg));
        } else {
          return reply();
        }
      });
    }
  },
]);


// Start the server
server.start((err) => {
  if (err) throw err;
  logger.info('Server running at:', server.info.uri);
});
