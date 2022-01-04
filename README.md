# YT-Converter-API #

## Description ##

Converts YouTube videos to mp3, if the video is longer than 15 minutes, then gives a direct link to listen .webm file.

## Install ##
+ Install [yt-dlp](https://github.com/yt-dlp/yt-dlp)
+ Install ```node``` and ```npm``` 
```
sudo apt install nodejs npm -y 
```
+ Installing dependencies 
```
npm install
```
## Launch ##
```
node app.js
```
## API ##
### ```GET``` ###
#### Search and convert by name and id #### 
```
'your site or 127.0.0.1'/ytsearch?title='cold cold cold'
```
#### Streaming audio ####
```
'your site or 127.0.0.1'/stream/n95eekfFZZg.mp3
```
In ```ytsearch``` you get a link to this query, example getting a response from ```ytsearch```:
```js
{
  "title": "Cage The Elephant - Cold Cold Cold",
  "link": "http://127.0.0.1/stream/n95eekfFZZg.mp3", // link to listen to the converted video in mp3 via ytsearch
  "searchlist": {
  // list of 5 videos found by name
    "1": {
      "id": "n95eekfFZZg",
      "time": "4:47",
      "title": "Cage The Elephant - Cold Cold Cold"
    },
    "2": {
      "id": "TNTkpTSLdPk",
      "time": "3:34",
      "title": "Cage the Elephant - Cold Cold Cold (lyrics)"
    },
    "3": {
      "id": "TzFdKMyIzMo",
      "time": "3:37",
      "title": "Cage The Elephant - Cold Cold Cold (Audio)"
    },
    "4": {
      "id": "CClLVSck4LY",
      "time": "3:29",
      "title": "Cage The Elephant - Cold Cold Cold (Unpeeled) (Live Video)"
    },
    "5": {
      "id": "XUEI0enVhug",
      "time": "1:00:06",
      "title": "Hot And Cold | Opposites Song + More Little Angel Educational Kids Songs & Nursery Rhymes"
    }
  }
}
```
#### random link to listen to a song from previously converted ####
```
'your site or 127.0.0.1'/rand
```
By default, the limit on the number of saved files is 1000
