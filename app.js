// Required yt-dlp
const express = require('express');
const fs = require('fs');
const yts = require('yt-search');
const cmd = require('node-cmd');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const songs = JSON.parse(fs.readFileSync('./music/playlist.json', 'utf8'));
const host = 'http://127.0.0.1'; // Your domain/host, etc.
const port = 1234; // Your port

const app = express();
// Search, conversion, links, etc.
app.get('/ytsearch', async (req, res) => {

    if (!req.query.title) {

        res.send('Cannot GET /ytsearch');

    } else {

        const title = req.query.title;
        console.log(title);
        const reLink = new RegExp(/\?v=|be\//g);
        var result;
        var videos;
        // See if there is a link to the video
        if (title.match(reLink)) {
            // Search by id if there is a link
            result = await yts({ videoId: title.substring(title.search(reLink) + 3) });
            videos = [result];
        } else {
            // Search by title
            result = await yts(title);
            videos = result.videos.slice(0,5);
        }

        if (songs[videos[0].videoId]) {
            songs[videos[0].videoId].searchlist = {};
            
            for (i = 0; i < videos.length; ++i) {
                songs[videos[0].videoId].searchlist[i + 1] = {
                    title: videos[i].title,
                    time: videos[i].timestamp,
                    id: videos[i].videoId
                }
            }

            console.log('A match was found.');
            console.log('Send ok.');
            res.send(songs[videos[0].videoId]);

        } else {

            if (videos[0].seconds > 900) {

                console.log('The video is more than 15 minutes, we get a direct link to the file...');
                // If the video is more than 15 minutes, we take a direct link from YouTube to a webm file
                cmd.run("yt-dlp -f \"ba*[ext=webm]\" --write-info-json --skip-download https://www.youtube.com/watch?v=" + videos[0].videoId + " -o \"./music/yt\"", (err, data, stderr) => {
                    if (!err) {
                        let info = JSON.parse(fs.readFileSync('./music/yt.info.json', 'utf8'));

                        console.log('Send ok.');
                        res.send({ title: info.title, link: info.url });
                    } else {
                        console.error(err);
                        res.send('Error yt-dlp');
                    }
                });
            } else {
                // Launch the download and the mp3 converter via cmd
                cmd.run("yt-dlp -f \"ba\" -x --audio-format mp3 --ffmpeg-location " + ffmpegPath + " https://www.youtube.com/watch?v=" + videos[0].videoId + " -o \"./music/%(id)s.mp3\"", (err, data, stderr) => {
                    if (!err) {
                        // Packing the name and the link to the file
                        songs[videos[0].videoId] = {
                             title: videos[0].title,
                             link: host + '/stream/' + videos[0].videoId + '.mp3'
                        };
                        // Add playlist
                        fs.writeFile('./music/playlist.json', JSON.stringify(songs), () => console.log(videos[0].title + ' saved in playlist.'));
                        // List of the first 5 found
                        if (Object.keys(videos).length > 1) {
                            let num = 0;
                            songs[videos[0].videoId].searchlist = {};

                            for (i = 0; i < videos.length; ++i) {
                                songs[videos[0].videoId].searchlist[i + 1] = {
                                    title: videos[i].title,
                                    time: videos[i].timestamp,
                                    id: videos[i].videoId
                                }
                            }
                        }
                        // If there are no more than 1000 tracks in the list, just add and send the link
                        if (Object.keys(songs).length < 1000) {

                            console.log('Send ok.');
                            res.send(songs[videos[0].videoId]);

                        } else {
                            // If there are more than 1000 tracks, then delete the 1 oldest one
                            let id = Object.keys(songs)[0];
                            // The path to the audio file and the name
                            let pathSong = './music/' + id + '.mp3';
                            let titleSong = songs[id].title;

                            fs.unlink(pathSong, (error) => {
                                if (!error) {
                                    delete songs[id];
                                    console.log(titleSong + ' deleted.');
                                } else {
                                    console.error(error);
                                }
                            });

                            console.log('Send ok.');
                            res.send(songs[videos[0].videoId]);
                        }
                    } else {
                        console.error(err);
                        res.send('Error yt-dlp');
                    }
                });
            }
        }
    }
});
// Sreaming music
app.get('/stream/:id' + '.mp3', (req, res) => {
    const id = req.params.id;

    var music = './music/' + id + '.mp3';

    var stat = fs.statSync(music);
    range = req.headers.range;
    var readStream;

    if (range !== undefined) {
        var parts = range.replace(/bytes=/, '').split('-');

        var partial_start = parts[0];
        var partial_end = parts[1];

        if ((isNaN(partial_start) && partial_start.length > 1) || (isNaN(partial_end) && partial_end.length > 1)) {
            res.sendStatus(500);
        }

        var start = parseInt(partial_start, 10);
        var end = partial_end ? parseInt(partial_end, 10) : stat.size - 1;
        var content_length = (end - start) + 1;

        res.status(206).header({
            'Content-Type': 'audio/mpeg',
            'Content-Length': content_length,
            'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size
        });

        readStream = fs.createReadStream(music, {start: start, end: end});
    } else {
        res.header({
            'Content-Type': 'audio/mpeg',
            'Content-Length': stat.size
        });
        readStream = fs.createReadStream(music);
    }

    readStream.pipe(res);
});
// Random song from previously ordered
app.get('/rand', (req, res) => {
    let randSong = Object.keys(songs)[Math.floor(Math.random() * Object.keys(songs).length)];

    res.send(songs[randSong]);
});

app.listen(port, function(){
    console.log('The server is running at - ' + host + ':' + port);
});
