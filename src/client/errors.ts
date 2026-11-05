export class AppliveryAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: string
  ) {
    super(message)
    this.name = 'AppliveryAPIError'
  }
}

export class AppliveryNetworkError extends Error {
  constructor(
    message: string,
    public originalError: Error
  ) {
    super(message)
    this.name = 'AppliveryNetworkError'
  }
}

export class AppliveryParseError extends Error {
  constructor(
    message: string,
    public rawBody: string
  ) {
    super(message)
    this.name = 'AppliveryParseError'
  }
}
