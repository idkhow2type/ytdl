import express from 'express';
import ytdl from 'ytdl-core';
import cookie from 'cookie-parser';
import fs from 'fs';
import ffmpeg from 'ffmpeg';
import ffprobe from 'ffprobe';
import ffprobeStatic from 'ffprobe-static';

const app = express();

app.use(cookie());
app.use(express.static('public'));
app.set('views', './views');

app.engine('html', (path, options, callback) => {
    fs.readFile(path, (err, content) => {
        if (err) return callback(err);
        const rendered = content.toString().replace(/{{(\w+)}}/g, (_, p1) => {
            return options[p1];
        });
        return callback(null, rendered);
    });
});

app.get('/', (req, res) => {
    res.render('index.html');
});

app.get('/download', async (req, res) => {
    const id = req.query.v?.toString() ?? '';
    if (fs.existsSync(`download/out/${id}_done.flv`)) {
        fs.unlink(`./download/process/${id}.flv`, (err) => {
            if (err) console.log(err);
        });
        res.download(`./download/out/${id}_done.flv`, (err) => {
            if (err) console.log(err);
            fs.unlink(`./download/out/${id}_done.flv`, (err) => {
                if (err) console.log(err);
            });
        });
    } else if (
        fs.existsSync(`download/out/${id}.flv`) ||
        fs.existsSync(`download/process/${id}.flv`)
    ) {
        res.status(202).render('processing.html', {
            id,
            size: fs.existsSync(`download/out/${id}.flv`)
                ? fs.statSync(`download/out/${id}.flv`).size/1024**2
                : '--',
        });
    } else {
        res.redirect(`/watch?v=${id}`);
    }
});

app.get('/watch', async (req, res) => {
    const id = req.query.v?.toString() ?? '';
    console.log(`Downloading ${id}`);
    res.redirect(`/download?v=${id}`);
    ytdl(id, { quality: 'lowest' })
        .pipe(fs.createWriteStream(`./download/process/${id}.flv`))
        .on('finish', async () => {
            const process = new ffmpeg(`./download/process/${id}.flv`);
            const meta = await ffprobe(`./download/process/${id}.flv`, {
                path: ffprobeStatic.path,
            });

            process.then(async (video) => {
                video.addCommand('-vf', 'scale=160:-1');
                video.save(`./download/out/${id}.flv`).then(() => {
                    fs.renameSync(
                        `./download/out/${id}.flv`,
                        `./download/out/${id}_done.flv`
                    );
                });
            });
        });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});
