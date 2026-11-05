export class AppliveryAPIError extends Error {
    statusCode;
    responseBody;
    constructor(message, statusCode, responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
        this.name = 'AppliveryAPIError';
    }
}
export class AppliveryNetworkError extends Error {
    originalError;
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'AppliveryNetworkError';
    }
}
export class AppliveryParseError extends Error {
    rawBody;
    constructor(message, rawBody) {
        super(message);
        this.rawBody = rawBody;
        this.name = 'AppliveryParseError';
    }
}
