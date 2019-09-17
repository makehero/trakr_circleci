const request = require('request');
const fs = require('fs');

// Loading our environment variables
const BASE_ENV = process.env.TRAKR_BASE_ENV || 'production';
const API_TOKEN = process.env.TRAKR_API_TOKEN;
const PROJECT_ID = process.env.TRAKR_PROJECT_ID;

if (API_TOKEN == undefined || PROJECT_ID == undefined) {
  // Report some type of failure back to the CI
  console.log('Please setup the TRAKR API TOKEN and PROJECT ID in the environment variable settings');
} else {
  fs.readFile('/home/circleci/localtunnel.log', 'utf8', function(err, contents) {
      parts = contents.split(': ');
      build_url = parts[1].trim();
      request_body = {
        'build_url': build_url,
        'environment': 'production'
      }
      options = {
        url: 'https://app.trakr.tech/api/v1/project/'+ PROJECT_ID +'/compare_build',
        headers: {
          'x-api-key': API_TOKEN,
        },
        body: request_body,
        json: true
      }
      request.post(options, function(error, response, body) {
        if (response.statusCode == 200) {
          // Saving the artifact
          if (body.status == "success") {
            fs.writeFile('/home/circleci/trakr_result.log', body.result.url, function(err){
              console.log('Test URL saved');
            })
          }
          check_status = function(screenshot_id) {
            // Do the actual API call and get status back
            console.log('executed the check_status ' + screenshot_id);
          }
          // Making sure the test completes (At least the screenshot is created)
          // Request to Trakr in an interval (1 minute) to check the status
          setTimeout(check_status, 1000 * 180, body.result.screenshot_created[0]);
        }
      });
  });
}
