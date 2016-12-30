'use strict';

var http = require('http');
var constants = require('./constants');

function fetchAudioData(edition, callback) {
    var endPoint = 'http://api.npr.org/query';

    var id = 10; // sunday is default
    if (edition && edition.toLowerCase() === 'saturday') {
        id = 7;
    }

    var queryString = '?id=' + id;
    queryString += '&fields=title,audio';
    queryString += '&dateType=story';
    queryString += '&output=JSON';
    queryString += '&numResults=20';
    queryString += '&apiKey=' + constants.nprApiKey;

    var url = endPoint + queryString;
    console.log('hitting endpoint=' + url);

    http.get(url, function (res) {
        var responseString = '';
        console.log('Status Code: ' + res.statusCode);

        if (res.statusCode != 200) {
            callback('Non 200 Response');
        }

        res.on('data', function (data) {
            responseString += data;
        });

        res.on('end', function () {
            var responseObject;

            try {
                responseObject = JSON.parse(responseString);
            } catch (err) {
                callback('error parsing response: ' + err);
                return;
            }

            if (!responseObject) {
                callback('error parsing response: ' + err);
                return;
            }

            console.log('responseObj=', responseObject);

            if (responseObject.messages && responseObject.messages.message &&
                responseObject.messages.message.level &&
                (responseObject.messages.message.level.toLowerCase() === 'error' ||
                 responseObject.messages.message.level.toLowerCase() === 'warning')) {
                var errorMsg = responseObject.messages.message.text.$text;
                var errorId = responseObject.messages.message.id;
                console.log("error from npr: " + errorMsg);
                console.log("error id from npr: " + errorId);
                callback(errorMsg);
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
                    callback(null, stories);
                    return;
                }
            }

            callback('could not parse response from npr');
        });
    }).on('error', function (e) {
        console.log("Communications error: " + e.message);
        callback(e.message);
    });
}

module.exports = fetchAudioData;
