'use strict';

var http = require('http');
var constants = require('./constants');

// description: fetches most current saturday, sunday or morning edition.
// editon: string either 'sunday' or 'saturday' or 'morning'
// successCallback: if fetch succeeds and able to parse response, return array
//    of objects containing: { title: string, url: string, token: number } where
//    url is mp4 audio stream.
// failedCallback: if fetch fails, return string describing failed reason.
function fetchAudioData(edition, successCallback, failedCallback) {
    var endPoint = 'http://api.npr.org/query';

    var ed = edition && edition.toLowerCase();

    var id = 10; // sunday is default
    if (ed === 'saturday') {
        id = 7;
    } else if (ed === 'morning') {
        id = 3;
    }

    // http://api.npr.org/query?id=7&fields=title,audio&requiredAssets=audio&date=current&dateType=story&sort=assigned&output=JSON&numResults=20&apiKey=xyz

    var queryString = '?id=' + id;
    queryString += '&fields=title,audio';
    queryString += '&requiredAssets=audio';
    queryString += '&date=current'; // fetch most current version
    queryString += '&dateType=story';
    queryString += '&sort=assigned';  // get same order as shown http://www.npr.org/programs/weekend-edition-saturday/
    queryString += '&output=JSON';
    queryString += '&numResults=20'; // only fetch last 20, max allowed per request without paging
    queryString += '&apiKey=' + constants.nprApiKey;

    var url = endPoint + queryString;
    console.log('hitting endpoint=' + url);

    http.get(url, function (res) {
        var responseString = '';
        console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            failedCallback('Sorry, invalid response code from NPR');
        }

        res.on('data', function (data) {
            responseString += data;
        });

        res.on('end', function () {
            var responseObject;

            try {
                responseObject = JSON.parse(responseString);
            } catch (err) {
                failedCallback('Sorry, could not parse response from NPR');
                return;
            }

            if (!responseObject) {
                failedCallback('Sorry, could not parse response from NPR');
                return;
            }

            console.log('responseObj=', responseObject);

            if (responseObject.messages && responseObject.messages.message &&
                responseObject.messages.message.level &&
                (responseObject.messages.message.level.toLowerCase() === 'error' ||
                 responseObject.messages.message.level.toLowerCase() === 'warning')) {
                var errorMsg = responseObject.messages.message.text.$text;
                var errorId = responseObject.messages.message.id;
                console.log('Error from NPR, ' + errorMsg);
                console.log('error id from npr: ' + errorId);
                failedCallback(errorMsg);
                return;
            }

            if (responseObject.list && responseObject.list.story &&
                responseObject.list.story.length > 0) {

                var storyArr = responseObject.list.story;
                var stories = [];
                for(var i = 0; i < storyArr.length; i++) {
                    var story = storyArr[i];
                    var title = story.title && story.title.$text;
                    if (story.audio && story.audio[0] &&
                        story.audio[0].format && story.audio[0].format.mp4) {
                            var url = story.audio[0].format.mp4.$text;
                            stories.push({
                                title: title,
                                url: url,
                                token: i
                            });
                        }
                }
                if (stories.length > 0) {
                    successCallback(stories);
                    return;
                }
            }

            failedCallback('Sorry, there are no stories available for NPR ' + edition + ' edition.');
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        failedCallback('Sorry, error from NPR: ' + e.message);
    });
}

module.exports = fetchAudioData;
