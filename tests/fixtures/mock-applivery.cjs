// Minimal mock of the Applivery API used by the action under test.
// Behaviour is controlled via env vars:
//   MOCK_PORT            port to listen on (default 8787)
//   MOCK_DIR             directory for request logs (default /tmp/mock-applivery)
//   MOCK_UPLOAD_STATUS   status returned by the upload endpoint (default "processed")
//   MOCK_BUILD_STATUS    status returned by GET build (default "processed")
//   MOCK_UPLOAD_FAIL     if set (e.g. "401"), upload endpoint returns that status code
'use strict'
const http = require('http')
const fs = require('fs')
const path = require('path')

const port = parseInt(process.env.MOCK_PORT || '8787', 10)
const dir = process.env.MOCK_DIR || '/tmp/mock-applivery'
const uploadStatus = process.env.MOCK_UPLOAD_STATUS || 'processed'
const buildStatus = process.env.MOCK_BUILD_STATUS || 'processed'
const uploadFail = process.env.MOCK_UPLOAD_FAIL || ''

fs.mkdirSync(dir, { recursive: true })
const logFile = path.join(dir, 'requests.log')
fs.writeFileSync(logFile, '')

const now = new Date().toISOString()

function build(id, status) {
  return {
    id: id,
    status: status,
    tags: [],
    versionName: 'mock',
    application: 'app-1',
    applicationInfo: { id: 'app-1', name: 'Mock App', slug: 'mock-app' },
    createdAt: now,
    updatedAt: now
  }
}

function publication(id, slug, filter) {
  return {
    id: id,
    slug: slug,
    distributionUrl: 'https://dl.example.test/' + slug,
    filter: filter || { type: 'gitBranch', value: 'main' },
    visibility: 'unlisted',
    security: 'public',
    groups: [],
    tags: [],
    createdAt: now,
    updatedAt: now
  }
}

function send(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  })
  res.end(body)
}

const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8')
    const url = new URL(req.url, 'http://localhost')
    const p = url.pathname
    fs.appendFileSync(logFile, `${req.method} ${p}${url.search}\n`)
    fs.writeFileSync(
      path.join(dir, 'last-auth.txt'),
      req.headers['authorization'] || ''
    )

    if (req.method === 'GET' && p === '/health') {
      return send(res, 200, { ok: true })
    }

    if (req.method === 'POST' && p.endsWith('/integrations/builds')) {
      fs.writeFileSync(path.join(dir, 'upload-build.txt'), body)
      if (uploadFail) {
        return send(res, parseInt(uploadFail, 10), {
          status: false,
          error: { code: 4002, message: 'Invalid token' }
        })
      }
      return send(res, 200, { status: true, data: build('build-123', uploadStatus) })
    }

    const m = p.match(/\/integrations\/builds\/([^/]+)$/)
    if (req.method === 'GET' && m) {
      return send(res, 200, { status: true, data: build(m[1], buildStatus) })
    }

    if (req.method === 'GET' && p.endsWith('/integrations/distributions')) {
      const slug = url.searchParams.get('slug') || ''
      const items = slug === 'existing-slug'
        ? [publication('pub-existing', 'existing-slug')]
        : []
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
      fs.writeFileSync(path.join(dir, 'create-publication.json'), body)
      let payload = {}
      try {
        payload = JSON.parse(body)
      } catch (e) {
        return send(res, 400, { status: false })
      }
      return send(res, 200, {
        status: true,
        data: publication('pub-new', payload.slug, payload.filter)
      })
    }

    send(res, 404, { status: false, error: { code: 404, message: 'not found' } })
  })
})

server.listen(port, '127.0.0.1', () => {
  const actual = server.address().port
  fs.writeFileSync(path.join(dir, 'port'), String(actual))
  console.log(`mock applivery listening on ${actual}`)
})
