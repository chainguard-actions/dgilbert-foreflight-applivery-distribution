// Minimal mock of the Applivery API used by the act tests.
// Configured through env vars:
//   MOCK_PORT            port to listen on (default 18080)
//   MOCK_LOG_DIR         where request logs/bodies are written (default /tmp/mock-applivery)
//   MOCK_BUILD_STATUS    status returned by the upload endpoint (default "processed")
//   MOCK_GET_STATUS      status returned by GET builds/:id (default "processed")
//   MOCK_EXISTING_SLUG   slug for which an existing publication is returned
//   MOCK_UPLOAD_FAIL     "true" => upload endpoint responds 401
const http = require('http')
const fs = require('fs')

const port = parseInt(process.env.MOCK_PORT || '18080', 10)
const logDir = process.env.MOCK_LOG_DIR || '/tmp/mock-applivery'
const buildStatus = process.env.MOCK_BUILD_STATUS || 'processed'
const getStatus = process.env.MOCK_GET_STATUS || 'processed'
const existingSlug = process.env.MOCK_EXISTING_SLUG || ''
const uploadFail = process.env.MOCK_UPLOAD_FAIL === 'true'

fs.mkdirSync(logDir, { recursive: true })

const ts = '2024-01-01T00:00:00.000Z'

function send(res, code, obj) {
  const b = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(b)
  })
  res.end(b)
}

function build(id, status) {
  return {
    id: id,
    status: status,
    tags: [],
    versionName: 'mock',
    application: 'app-1',
    applicationInfo: { id: 'app-1', name: 'Mock App', slug: 'mock-app' },
    createdAt: ts,
    updatedAt: ts
  }
}

function pub(slug, id) {
  return {
    id: id,
    slug: slug,
    distributionUrl: 'https://example.applivery.io/' + slug,
    createdAt: ts,
    updatedAt: ts,
    filter: { type: 'gitBranch', value: 'existing' },
    visibility: 'unlisted',
    security: 'public',
    groups: [],
    tags: []
  }
}

let n = 0
http
  .createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      const u = new URL(req.url, 'http://localhost')
      const p = u.pathname
      if (p === '/health') return send(res, 200, { ok: true })

      n++
      fs.appendFileSync(
        logDir + '/requests.log',
        `${req.method} ${req.url} auth=${req.headers.authorization || ''}\n`
      )
      fs.writeFileSync(`${logDir}/body-${n}-${req.method}.txt`, body)

      if (req.method === 'POST' && p.endsWith('/integrations/builds')) {
        fs.writeFileSync(logDir + '/upload-body.txt', body)
        if (uploadFail) {
          return send(res, 401, {
            status: false,
            error: { code: 401, message: 'Unauthorized' }
          })
        }
        return send(res, 200, { status: true, data: build('build-123', buildStatus) })
      }
      if (req.method === 'GET' && /\/integrations\/builds\/[^/]+$/.test(p)) {
        const id = p.split('/').pop()
        return send(res, 200, { status: true, data: build(id, getStatus) })
      }
      if (req.method === 'GET' && p.endsWith('/integrations/distributions')) {
        const slug = u.searchParams.get('slug') || ''
        const items =
          existingSlug && slug === existingSlug ? [pub(existingSlug, 'pub-existing')] : []
        return send(res, 200, {
          status: true,
          data: {
            items: items,
            totalItems: items.length,
            itemsPerPage: 25,
            currentPage: 1,
            totalPages: 1
          }
        })
      }
      if (req.method === 'POST' && p.endsWith('/integrations/distributions')) {
        fs.writeFileSync(logDir + '/create-body.json', body)
        let parsed = {}
        try {
          parsed = JSON.parse(body)
        } catch (e) {
          // ignore
        }
        const data = pub(parsed.slug, 'pub-new')
        data.filter = parsed.filter
        data.security = parsed.security
        return send(res, 201, { status: true, data: data })
      }
      send(res, 404, { status: false, error: { code: 404, message: 'not found' } })
    })
  })
  .listen(port, '127.0.0.1', () => {
    console.log('mock applivery listening on ' + port)
  })
