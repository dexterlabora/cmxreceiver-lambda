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


};

// *********** Storage ******

var AWS = require('aws-sdk');

var s3 = new AWS.S3();
s3.createBucket({Bucket: 'cmx-lambda'}, function() {
 var key = new Date() + ".txt"
 var params = {Bucket: 'cmx-lambda', Key: key, Body: "CMX service online"};

 s3.putObject(params, function(err, data) {

     if (err)

         console.log(err)

     else       console.log("Successfully uploaded data to "+ params.Bucket + "/" + params.Key);

  });

});


//**********************************************************
var ApiBuilder = require('claudia-api-builder'),
  api = new ApiBuilder();
module.exports = api;


// CMX Location Protocol, see https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#API_Configuration
//
// Meraki asks for us to know the secret
api.get("/", function (req) {
    console.log("Validator = " + validator);
    var key = new Date() + "validator.txt";
    var params = {Bucket: 'cmx-lambda', Key: key, Body: "sending validator "+validator};

    s3.putObject(params, function(err, data) {

        if (err)

            console.log(err)

        else       console.log("Successfully uploaded data to "+ params.Bucket + "/" + params.Key);

     });
    return validator;
},
{
  success: { contentType: 'text/plain' },
  error: {code: 403}
});

api.get("/data", function (req) {
    //s3.getObject({Bucket: 'cmx', Key: 'key'})
    s3.listObjects({Bucket: 'cmx-lambda'}).on('success', function handlePage(response) {
      if (response.hasNextPage()) {
        response.nextPage().on('success', handlePage).send();
      }
      return response.data;
    }).send();
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
        cmxData(req.body);
        s3.createBucket({Bucket: 'cmx-lambda'}, function() {
         var key = new Date() + ".json";
         var params = {Bucket: 'cmx-lambda', Key: key, Body: req.body};

         s3.putObject(params, function(err, data) {

             if (err)

                 console.log(err)

             else       console.log("Successfully uploaded data to "+ params.Bucket + "/" + params.Key);

          });

       });
    } else {
        console.log("Secret was invalid");
        cmxData("Secret was invalid");
    }
    return;
},
{
  success: { contentType: 'text/plain' },
  error: {code: 403}
});
