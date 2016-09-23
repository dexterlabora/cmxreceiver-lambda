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
    docClient.putItem(params, data);
};

// *********** Storage ******


var AWS = require("aws-sdk");
//var DOC = require("dynamodb-doc");

//AWS.config.update({region: "us-west-1"});

var docClient = new AWS.DynamoDB.DocumentClient();

var params = {};
params.TableName = "cmxdata";

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
    params.Item = {"validation":new Date()};
    params.TableName = "cmxdata";
    docClient.put(params, function(err, data) {
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
        TableName: "cmxdata"
    };

    docClient.scan(params, function(err, data) {
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

        var params = {
            TableName:"cmxdata",
            Item:removeEmptyStringElements(req.body)
        };
        docClient.put(params, function(err, data) {
          if (err) console.log("Error committing to DynamoDB: "+ err);
          else console.log("Committed to DynamoDB:"+ data);
        });
    } else {
        console.log("Secret was invalid");
    }
    return "OK";
},
{
  success: { contentType: 'text/plain' },
  error: {code: 403}
});
