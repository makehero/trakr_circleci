const request = require('request');
const fs = require('fs');

// Loading our environment variables
const BASE_ENV = process.env.TRAKR_BASE_ENV || 'production';
const DELAY_START = parseInt(process.env.DELAY_START) || 0;
const API_TOKEN = process.env.TRAKR_API_TOKEN;
const PROJECT_ID = process.env.TRAKR_PROJECT_ID;
const BUILD_URL = process.env.BUILD_URL;
const WORKFLOW_ID = process.env.CIRCLE_WORKFLOW_ID; //provided by CircleCI

// Additional constants
const TRAKR_API = 'https://app.trakr.tech/api/v1/';
const TRAKR_COMPLETION_LIMIT = 60; // 60 minutes max to wait for screenshot

// @todo, we should also consider the working directory (find it from the env)

if (API_TOKEN == undefined || PROJECT_ID == undefined) {
  // Report some type of failure back to the CI
  console.log('Please setup the TRAKR API TOKEN and PROJECT ID in the environment variable settings');
} else {
  request_body = {
    'build_url': BUILD_URL,
    'environment': 'production',
    'title': 'CC WF ' + WORKFLOW_ID
  }
  options = {
    url: TRAKR_API + 'project/'+ PROJECT_ID +'/compare_build',
    headers: {
      'x-api-key': API_TOKEN,
    },
    body: request_body,
    json: true
  }

  console.log('Waiting for the test to start in ' + DELAY_START + 'seconds.');

  // Delaying the screenshot capturing until the tunnel is established if needed
  setTimeout(function() {
    // We can always start the test when the build URL becomes available. However
    // it is probably unreliable just to lookup a http status code
    console.log('Starting the Trakr visual test');
    // Creating the actual request for testing
    request.post(options, function(error, response, body) {
      if (response.statusCode == 200) {
        // Saving the artifact
        if (body.status == "success") {
          fs.writeFile('/home/circleci/trakr_result.log', body.result.url, function(err){
            console.log('Test URL saved');
          })
        }

        // Our anonymous function to check the status of the screenshot
        x = 0;
        complete = false;
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

        // Making sure the test completes (At least the screenshot is created)
        // Request to Trakr in an interval (1 minute) to check the status
        intervalID = setInterval(function() {
          if (complete || ++x == TRAKR_COMPLETION_LIMIT) {
            clearInterval(intervalID);
          } else {
            check_status(body.result.screenshot_created[0]);
          }
        }, 1000 * 60);
      }
    });
  }, DELAY_START * 1000);
}
