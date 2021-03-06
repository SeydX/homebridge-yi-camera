'use-strict';

const logger = require('../../services/logger/logger.service');
const spawn = require('child_process').spawn;
const readline = require('readline');

class FfmpegProcess {
  constructor(cameraName, videoDebug, sessionId, videoProcessor, command, delegate, callback) {
    logger.debug('Stream command: ' + videoProcessor + ' ' + command, cameraName);

    let started = false;

    const startTime = Date.now();

    this.process = spawn(videoProcessor, command.split(/\s+/), {
      env: process.env,
    });

    this.process.stdout.on('data', (data) => {
      const progress = this.parseProgress(data);

      if (progress && !started && progress.frame > 0) {
        started = true;
        const runtime = (Date.now() - startTime) / 1000;
        const message = `Getting the first frames took ${runtime} seconds.`;

        if (runtime < 5) {
          logger.debug(message, cameraName);
        } else if (runtime < 22) {
          logger.warn(message, cameraName);
        } else {
          logger.error(message, cameraName);
        }
      }
    });

    const stderr = readline.createInterface({
      input: this.process.stderr,
      terminal: false,
    });

    stderr.on('line', (line) => {
      if (callback) {
        callback();
        callback = undefined;
      }

      if (/\[(panic|fatal|error)]/.test(line)) {
        logger.error(line, cameraName);
      } else if (videoDebug) {
        logger.debug(line, cameraName);
      }
    });

    this.process.on('error', (error) => {
      logger.error(`FFmpeg process creation failed: ${error.message}`, cameraName);

      if (callback) {
        callback(new Error('FFmpeg process creation failed'));
      }

      delegate.stopStream(sessionId);
    });

    this.process.on('exit', (code, signal) => {
      const message = `ffmpeg exited with code: ${code} and signal: ${signal}`;

      if (code == undefined || code === 255) {
        if (this.process.killed) {
          logger.debug(`${message} (Expected)`, cameraName);
        } else {
          logger.warn(`${message} (Unexpected)`, cameraName);
        }
      } else {
        logger.error(`${message} (Error)`, cameraName);

        delegate.stopStream(sessionId);

        if (!started && callback) {
          callback(new Error(message));
        } else {
          delegate.controller.forceStopStreamingSession(sessionId);
        }
      }
    });
  }

  getStdin() {
    return this.process.stdin;
  }

  parseProgress(data) {
    const input = data.toString();

    if (input.indexOf('frame=') == 0) {
      try {
        const progress = new Map();

        for (const line of input.split(/\r?\n/)) {
          const split = line.split('=', 2);
          progress.set(split[0], split[1]);
        }

        return {
          frame: Number.parseInt(progress.get('frame')),
          fps: Number.parseFloat(progress.get('fps')),
          stream_q: Number.parseFloat(progress.get('stream_0_0_q')),
          bitrate: Number.parseFloat(progress.get('bitrate')),
          total_size: Number.parseInt(progress.get('total_size')),
          out_time_us: Number.parseInt(progress.get('out_time_us')),
          out_time: progress.get('out_time').trim(),
          dup_frames: Number.parseInt(progress.get('dup_frames')),
          drop_frames: Number.parseInt(progress.get('drop_frames')),
          speed: Number.parseFloat(progress.get('speed')),
          progress: progress.get('progress').trim(),
        };
      } catch {
        return;
      }
    } else {
      return;
    }
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.socket.close();
    }

    this.process.kill('SIGKILL');
  }
}

module.exports = FfmpegProcess;
