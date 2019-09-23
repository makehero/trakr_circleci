const request = require('request');

const API_TOKEN = process.env.TRAKR_API_TOKEN;
const PROJECT_ID = process.env.TRAKR_PROJECT_ID;
const WORKFLOW_ID = process.env.CIRCLE_WORKFLOW_ID; //provided by CircleCI

// Additional constants
const TRAKR_API = 'https://app.trakr.tech/api/v1/';
const WAIT_FOR_SN = 12; // try to find the screenshot X times in an every 10 seconds
const WAIT_FOR_COMPLETE = 60; // 60 minutes max wait time for the tunnel to be kept open

if (API_TOKEN == undefined || PROJECT_ID == undefined) {
  console.log('Please setup the TRAKR API TOKEN and PROJECT ID in the environment variable settings');
} else {
  request_body = {
    'type': 'screenshot',
    'title': 'CC WF ' + WORKFLOW_ID
  }
  options = {
    url: TRAKR_API + 'project/'+ PROJECT_ID +'/query',
    headers: {
      'x-api-key': API_TOKEN,
    },
    body: request_body,
    json: true
  }
  found = false;
  x = 0;

  // Quick function to find the screenshot started by the test job
  findSN = function(request_options) {
    console.log("Waiting for the test to start...")
    request.post(options, function(error, response, body) {
      if (body.status == 'success') {
        screenshot_list = Object.keys(body.result);
        found = screenshot_list[0]; // we should only get 1 back anyways
      }
    });
  }

  // Function to check for test completion
  complete = false;
  y = 0;
  check_status = function(screenshot_id) {
    // Do the actual API call and get status back
    options = {
      url: TRAKR_API + 'status/'+screenshot_id,
      headers: {
        'x-api-key': API_TOKEN,
      },
      json: true
    }
    request.get(options, function(error, response, body) {
      if (response.statusCode == 200 && body.status == 'success') {
          progress = body.result.progress;
          if (body.result.message == 'complete') {
            console.log('Screenshot ' + screenshot_id + ' is complete');
            complete = true;
          } else {
            console.log('Processing ' + progress + ' for ' + screenshot_id);
          }
      }
    });
  }

  // We should first wait to see if the screenshot has been created
  intervalID = setInterval(function() {
    if (found || ++x == WAIT_FOR_SN) {
      clearInterval(intervalID);
      // if our exit condition is that we found the screenshot collection,
      // we wait for it to be complete, this is to keep the tunnel open
      if (found) {
        CompleteIntervalID = setInterval(function() {
          if (complete || ++y == WAIT_FOR_COMPLETE) {
            clearInterval(CompleteIntervalID);
          } else {
            check_status(found);
          }
        }, 1000 * 60);
      }
    } else {
      findSN(options);
    }
  }, 1000 * 10);
}
