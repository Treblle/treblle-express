const {
  sendPayloadToTreblle,
  generateFieldsToMask,
  maskSensitiveValues,
  getRequestDuration,
  generateTrebllePayload,
} = require('@treblle/utils')

const { version: sdkVersion } = require('./package.json')

module.exports = treblle

/**
 * Expose the Treblle middleware
 * @param {{apiKey?: string, projectId?: string, additionalFieldsToMask?: string[]}} options - Middleware options.
 * @returns {Function} - treblle-express middleware.
 */
function treblle({
  apiKey = process.env.TREBLLE_API_KEY,
  projectId = process.env.TREBLLE_PROJECT_ID,
  additionalFieldsToMask = [],
} = {}) {
  return function treblleMiddleware(req, res, next) {
    // Track when this request was received.
    const requestStartTime = process.hrtime()

    // Intercept response body
    const originalSend = res.send
    res.send = function sendOverWrite(body) {
      originalSend.call(this, body)
      this._treblleResponsebody = body
    }

    res.on('finish', function onceFinish() {
      let errors = []
      const body = req.body || {}
      const query = req.query || {}
      const requestPayload = { ...body, ...query }

      const fieldsToMask = generateFieldsToMask(additionalFieldsToMask)
      const maskedRequestPayload = maskSensitiveValues(requestPayload, fieldsToMask)

      const protocol = `${req.protocol}/${req.httpVersion}`

      let originalResponseBody = res._treblleResponsebody
      let maskedResponseBody
      try {
        if (Buffer.isBuffer(res.payload)) {
          originalResponseBody = originalResponseBody.toString('utf8')
        }
        if (typeof originalResponseBody === 'string') {
          let parsedResponseBody = JSON.parse(originalResponseBody)
          maskedResponseBody = maskSensitiveValues(parsedResponseBody, fieldsToMask)
        } else if (typeof originalResponseBody === 'object') {
          maskedResponseBody = maskSensitiveValues(originalResponseBody, fieldsToMask)
        }
      } catch (error) {
        // if we can't parse the body we'll leave it empty and set an error
        errors.push({
          source: 'onShutdown',
          type: 'INVALID_JSON',
          message: 'Invalid JSON format',
          file: null,
          line: null,
        })
      }

      const trebllePayload = generateTrebllePayload(
        {
          api_key: apiKey,
          project_id: projectId,
          sdk: 'express',
          version: sdkVersion,
        },
        {
          server: {
            protocol,
          },
          request: {
            ip: req.ip,
            url: `${req.protocol}://${req.headers['host']}${req.url}`,
            user_agent: req.headers['user-agent'],
            method: req.method,
            headers: maskSensitiveValues(req.headers, fieldsToMask),
            body: maskedRequestPayload,
          },
          response: {
            headers: maskSensitiveValues(res.getHeaders(), fieldsToMask),
            code: res.statusCode,
            size: res.get('content-length'),
            load_time: getRequestDuration(requestStartTime),
            body: maskedResponseBody,
          },
          errors,
        }
      )
      try {
        sendPayloadToTreblle(trebllePayload, apiKey)
      } catch (error) {
        console.log(error)
      }
    })
    next()
  }
}
