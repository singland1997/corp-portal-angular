function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // API paths with a route (var.api_routes) never reach this function; any other /api path
  // gets a JSON 503 instead of index.html.
  if (uri === '/api' || uri.startsWith('/api/')) {
    return {
      statusCode: 503,
      statusDescription: 'Service Unavailable',
      headers: {
        'content-type': { value: 'application/json' },
        'cache-control': { value: 'no-store' },
      },
      body: JSON.stringify({ message: 'API origin is not configured.' }),
    };
  }

  // Assets keep their original path: missing JS/CSS must not return HTML.
  if (!uri.startsWith('/assets/') && !uri.startsWith('/media/') && !uri.includes('.')) {
    request.uri = '/index.html';
  }

  return request;
}
