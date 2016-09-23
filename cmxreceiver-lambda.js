/*
NodeJS CMX Receiver for use with AWS Lambda and API Gateway

A basic web service to accept CMX data from a Cisco Meraki network
- Accept a GET request from Meraki and respond with a validator
- Meraki will POST to server, if validated.
- POST will contain a secret, which can be verified by the server.
- JSON data will be in the req.body.data. This will be available in the cmxData function's data object.

-- This skeleton app will only place the data received on the console. It's up to the developer to use this how ever required

*/

// CHANGE THESE CONFIGURATIONS to match your CMX configuration


var secret = process.env.SECRET || "supersecret"; //"enterYourSecret";
var validator = process.env.VALIDATOR || "8e0846499d9a3f6c23f7868c4c25b9d6325035f5";//"enterYourValidator";




// All CMX JSON data will end up here. Send it to a database or whatever you fancy.
// data format specifications: https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#Version_2.0


function cmxData(data) {
    console.log("JSON Feed: " + JSON.stringify(data, null, 2));
    dynamodb.putItem(params, data);
};

// *********** Storage ******


var AWS = require('aws-sdk');
var dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


// helper function to remove empty elements from a string. Required for DynamoDB
function removeEmptyStringElements(obj) {
  for (var prop in obj) {
    if (typeof obj[prop] === 'object') {// dive deeper in
      removeEmptyStringElements(obj[prop]);
    } else if(obj[prop] === '') {// delete elements that are empty strings
      delete obj[prop];
    }
  }
  return obj;
}




//**********************************************************
var ApiBuilder = require('claudia-api-builder'),
  api = new ApiBuilder();
module.exports = api;




// CMX Location Protocol, see https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#API_Configuration
//
// Meraki asks for us to know the secret
api.get("/", function (req) {
    console.log("Validator = " + validator);
    var datetime = new Date().getTime().toString();
    var params = {
      "TableName":"cmxlog",
      "Item":{
        "validator": {"S": validator},
        "message_ts": {"N": datetime },
        "message_id": {"S": guid() },
        "message_apistage": {"S": req.stage },
        "message_resource": {"S": req.resourcePath },
        "message_method": {"S": req.httpMethod },
        "message_ip": {"S": req.sourceIp },
        "message_supplier": {"S": "meraki" },
        "message_useragent": {"S": req.userAgent = req.userAgent || '99' }
      }
    };
    dynamodb.putItem(params, function(err, data) {
      if (err) console.log("Error committing to DynamoDB: "+ err);
      else console.log("Committed to DynamoDB:"+ data);
    });
    return validator;
},
{
  success: { contentType: 'text/plain' },
  error: {code: 403}
});

api.get("/data", function (req) {
    console.log("requesting data from DynamoDB");
    var params = {
        "TableName": "cmxdata"
      };

    dynamodb.scan(params, function(err, data) {
        if (err){
            console.log(JSON.stringify(err, null, 2));
            return err;
        }else{
            console.log(JSON.stringify(data, null, 2));
            return data;
        }
    });
},
{
  success: { contentType: 'application/json' },
  error: {code: 403}
});

//
// Getting the flow of data every 1 to 2 minutes
api.post("/", function (req) {
    if (req.body.secret == secret) {
        console.log("Secret verified");
        console.log("JSON Feed: " + JSON.stringify(req.body, null, 2));

        toDB(req);
        return "OK";
    }else{
        console.log("Secret invalid");
        return "OK"; // maybe a better response on invalid secret
    }
},
{
  success: { contentType: 'text/plain' },
  error: {code: 403}
});


// ******* Database stuff
function guid() {
 function s4() {
   return Math.floor((1 + Math.random()) * 0x10000)
     .toString(16)
     .substring(1);
 }
 return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
   s4() + '-' + s4() + s4() + s4();
}


function toDB(event) {

       try{ // error checking

console.log('event: '+JSON.stringify(event, null, '  '));
//               console.log("context:::::");
//               console.log(context['resourcePath']);
//               console.log("END context:::::");

for (i = 0; i < event.body.data.observations.length; i++) {
   var observation = event.body.data.observations[i];
   //Do stuff with observation, like sending it directly to ES

   dynamodb.listTables(function(err, data) {
   });
   var datetime = new Date().getTime().toString();
   var apMac = event.body.data.apMac.toString();
   var apFloors = event.body.data.apFloors.toString();


   var params = {
       "TableName": "cmxdata",
       "Item" : {
               "message_ts": {"N": datetime },
               "message_id": {"S": guid() },
               "message_apistage": {"S": event.stage },
               "message_resource": {"S": event.resourcePath },
               "message_method": {"S": event.httpMethod },
               "message_ip": {"S": event.sourceIp },
               "message_supplier": {"S": "meraki" },
               "message_useragent": {"S": event.userAgent = event.userAgent || '99' }, // 99 -> not sent {"S": event.userAgent },
           "apMac": {"S": event.body.apMac },
           "apFloors": {"S": event.body.apFloors },
           "clientMac": {"S": observation.clientMac.toString() },
           "seenEpoch": {"N": observation.seenEpoch.toString() },
           "seenTime": {"S": observation.seenTime.toString() },
           "rssi": {"N": observation.rssi.toString() },
           //"ssid": {"S": observation.ssid.toString()},
           "manufacturer": {"S": observation.manufacturer.toString() },
           //"os": {"S": observation.os.toString() },
           "lat": {"N": observation.location.lat.toString() },
           "lng": {"N": observation.location.lng.toString() },
           "unc": {"N": observation.location.unc.toString() }
   }
   }
   }

   dynamodb.putItem(params, function(err, body) {
       if (err) {
               //context.fail('error','Insert failed: '+err);
               console.log(err);
       }
       else {
           console.log('DYNOMITE! great success: '+JSON.stringify(body, null, '  '));
           //context.succeed('SUCCESS');
       }
   });

       }catch(e){ // error checking

       console.log(e.stack); // error checking
   }

};
