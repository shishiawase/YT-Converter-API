// Required yt-dlp
const express = require('express');
const fs = require('fs');
const yts = require('yt-search');
const cmd = require('node-cmd');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const songs = JSON.parse(fs.readFileSync('./music/playlist.json', 'utf8'));
const domain = '127.0.0.1'; // Свой домен/хост и т.д.
const port = 1234; // Свой порт

const app = express();
// Поиск, конвертация, ссылки и прочее
app.get('/ytsearch', async (req, res) => {
    const title = req.query.title;
    const reLink = new RegExp(/\?v=|be\//g);
    var result;
    var videos;
    // Смотрим есть ли ссылка на видео
    if (title.match(reLink)) {
        // Поиск по id если есть ссылка
        result = await yts({ videoId: title.substring(title.search(reLink) + 3) });
        videos = [result];
    } else {
        // Поиск по названию
        result = await yts(title);
        videos = result.videos.slice(0,5);
    }

    if (songs[videos[0].videoId]) {

        console.log('Найдено совпадение.');
        console.log('Send ok.');
        res.send(songs[videos[0].videoId]);

    } else {

        if (videos[0].seconds > 900) {

            console.log('Видео больше 15 минут, получаем прямую ссылку на файл...');
            // Если видео больше 15 минут, берем прямую ссылку с ютуба на webm файл
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
            // Запускаем скачку и конвертер в mp3 через cmd
            cmd.run("yt-dlp -f \"ba\" -x --audio-format mp3 --ffmpeg-location " + ffmpegPath + " https://www.youtube.com/watch?v=" + videos[0].videoId + " -o \"./music/%(id)s.mp3\"", (err, data, stderr) => {
                if (!err) {
                    // Упаковываем название и ссылку на файл
                    songs[videos[0].videoId] = {
                         title: videos[0].title,
                         link: domain + '/stream/' + videos[0].videoId + '.mp3'
                    };
                    // Список из первых найденных 5
                    if (Object.keys(videos).length > 1) {
                        let num = 0;
                        songs[videos[0].videoId].list = {};

                        for (i = 0; i < videos.length; ++i) {
                            songs[videos[0].videoId].list[i + 1] = {
                                title: videos[i].title,
                                time: videos[i].timestamp,
                                id: videos[i].videoId
                            }
                        }
                    }
                    // Добавляем в плейлист
                    fs.writeFile('./music/playlist.json', JSON.stringify(songs), () => console.log(videos[0].title + ' сохранена в плейлист.'));
                    // Если в списке не больше 1000 треков, просто добавляем и отправляем ссылку
                    if (Object.keys(songs).length < 1000) {

                        console.log('Send ok.');
                        res.send(songs[videos[0].videoId]);

                    } else {
                        // Если треков больше 1000, то удаляем 1 самый старый
                        let id = Object.keys(songs)[0];
                        // Путь к аудиофайлу и название
                        let pathSong = './music/' + id + '.mp3';
                        let titleSong = songs[id].title;

                        fs.unlink(pathSong, (error) => {
                            if (!error) {
                                delete songs[id];
                                console.log(titleSong + ' удалена.');
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
});
// Прослушивание музыки
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
// Рандомная песня из заказанных ранее
app.get('/rand', (req, res) => {
    let randSong = Object.keys(songs)[Math.floor(Math.random() * Object.keys(songs).length)];

    res.send(songs[randSong]);
});

app.listen(port, function(){
    console.log('Сервер запущен по адресу - ' + domain + ':' + port);
});
