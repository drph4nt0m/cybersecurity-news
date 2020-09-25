const {
  createLogger,
  format,
  transports
} = require('winston');
const {
  combine,
  splat,
  timestamp,
  printf
} = format;


const logger = createLogger({
  level: 'debug',
  transports: [
    new transports.Console({
      format: combine(
        format.colorize(),
        splat(),
        timestamp(),
        printf(({
          level,
          message,
          timestamp,
          ...metadata
        }) => {
          let msg = `⚡ ${timestamp} [${level}] : ${message} `;
          if (metadata && JSON.stringify(metadata) != '{}') {
            msg += JSON.stringify(metadata);
          }
          return msg;
        }),
      )
    }),
    new transports.File({
      filename: '.log',
      format: combine(
        splat(),
        timestamp(),
        printf(({
          level,
          message,
          timestamp,
          ...metadata
        }) => {
          let msg = `${timestamp} [${level}] : ${message} `;
          if (metadata && JSON.stringify(metadata) != '{}') {
            msg += JSON.stringify(metadata);
          }
          return msg;
        }),
      )
    })
  ]
});

module.exports = logger;
