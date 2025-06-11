const {
  sendPayloadToTreblle,
  generateFieldsToMask,
  maskSensitiveValues,
  getRequestDuration,
  generateTrebllePayload,
  getResponsePayload,
} = require('@treblle/utils')

const { version: sdkVersion } = require('./package.json')

module.exports = treblle

/**
 * Expose the Treblle middleware
 * @param {{apiKey?: string, projectId?: string, additionalFieldsToMask?: string[], blocklistPaths?: (string[]|RegExp)}} options - Middleware options.
 * @returns {Function} - treblle-express middleware.
 */
function treblle({
  apiKey = process.env.TREBLLE_API_KEY,
  projectId = process.env.TREBLLE_PROJECT_ID,
  additionalFieldsToMask = [],
  blocklistPaths = [],
} = {}) {
  return function treblleMiddleware(req, res, next) {
    // Track when this request was received.
    const requestStartTime = process.hrtime()
    let resolvedLoadTime;
    // Intercept response body
    const originalSend = res.send
    res.send = function sendOverWrite(body) {
      this._treblleResponsebody = body
      originalSend.call(this, body)
      resolvedLoadTime = getRequestDuration(requestStartTime)
    }

    res.on('finish', function onceFinish() {
      // Check if the request path is blocked
      const isPathBlocked =
        blocklistPaths instanceof RegExp
          ? blocklistPaths.test(req.path)
          : blocklistPaths.some((path) => req.path.startsWith(`/${path}`))

      if (isPathBlocked) {
        return next()
      }

      let errors = []
      const body = req.body || {}
      const query = req.query || {}
      const requestPayload = { ...body, ...query }

      const fieldsToMask = generateFieldsToMask(additionalFieldsToMask)
      const maskedRequestPayload = maskSensitiveValues(requestPayload, fieldsToMask)

      const protocol = `${req.protocol}/${req.httpVersion}`

      const { payload: maskedResponseBody, error: invalidResponseBodyError } = getResponsePayload(
        res._treblleResponsebody,
        fieldsToMask
      )

      if (invalidResponseBodyError) {
        errors.push(invalidResponseBodyError)
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
            url: `${req.protocol}://${req.headers['host']}${req.originalUrl}`,
            user_agent: req.headers['user-agent'],
            method: req.method,
            headers: maskSensitiveValues(req.headers, fieldsToMask),
            body: maskedRequestPayload,
          },
          response: {
            headers: maskSensitiveValues(res.getHeaders(), fieldsToMask),
            code: res.statusCode,
            size: res.get('content-length'),
            load_time: resolvedLoadTime,
            body: maskedResponseBody,
          },
          errors,
        }
      )
      try {
        sendPayloadToTreblle(trebllePayload, apiKey)
      } catch (error) {
        console.error(error)
      }
    })
    next()
  }
}
