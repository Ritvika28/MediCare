/**
 * Centralized production-grade AI & System Error Classifier
 */

export const handleGeminiError = (err, userId = null, modelName = 'gemini-2.5-flash') => {
  const timestamp = new Date().toISOString();
  let status = err.status || err.httpStatusCode || err.code || 500;
  let rawMessage = err.message || '';

  // 1. Try to parse nested error messages if the SDK returns a JSON string
  try {
    if (rawMessage.trim().startsWith('{')) {
      const parsedMsg = JSON.parse(rawMessage);
      if (parsedMsg.error) {
        rawMessage = parsedMsg.error.message || rawMessage;
        status = parsedMsg.error.code || status;
      }
    }
  } catch (parseErr) {
    // Ignore message parsing failure, proceed with rawMessage
  }

  const lowerMsg = rawMessage.toLowerCase();

  // Initialize standard error response parameters
  let errorCode = 'UNKNOWN_SERVER_ERROR';
  let title = 'System Error';
  let description = 'An unexpected server error occurred.';
  let retryable = false;
  let recommendedAction = 'Please try again later or contact the administrator.';

  // 2. Classify based on conditions
  
  // A. INVALID_API_KEY
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('api key not valid') ||
    lowerMsg.includes('key not valid') ||
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('permission denied')
  ) {
    errorCode = 'INVALID_API_KEY';
    title = 'AI Configuration Error';
    description = 'The AI service configuration is invalid. The API key is missing or unauthorized.';
    retryable = false;
    recommendedAction = 'Please verify that a valid GEMINI_API_KEY is configured on the server.';
  }
  // B. MODEL_NOT_FOUND
  else if (
    status === 404 ||
    lowerMsg.includes('model') && (lowerMsg.includes('not found') || lowerMsg.includes('not supported') || lowerMsg.includes('cannot find'))
  ) {
    errorCode = 'MODEL_NOT_FOUND';
    title = 'AI Model Unavailable';
    description = `The requested AI model "${modelName}" was not found or is not supported.`;
    retryable = false;
    recommendedAction = 'Please ensure you are requesting a supported model like gemini-2.5-flash.';
  }
  // C. QUOTA_EXCEEDED
  else if (
    lowerMsg.includes('daily') ||
    lowerMsg.includes('quota') && (lowerMsg.includes('exceeded') || lowerMsg.includes('limit: 20') || lowerMsg.includes('per day'))
  ) {
    errorCode = 'QUOTA_EXCEEDED';
    title = 'AI Usage Limit Reached';
    description = 'The AI service has reached today\'s usage limit.';
    retryable = false;
    recommendedAction = 'Please wait for the daily quota to reset or upgrade your subscription plan.';
  }
  // D. RATE_LIMITED
  else if (
    status === 429 ||
    lowerMsg.includes('resource_exhausted') ||
    lowerMsg.includes('rate limit') ||
    lowerMsg.includes('too many requests')
  ) {
    errorCode = 'RATE_LIMITED';
    title = 'AI Service Busy';
    description = 'The AI service is experiencing high traffic and is rate-limiting requests.';
    retryable = true;
    recommendedAction = 'Please wait about 10-30 seconds before retrying your request.';
  }
  // E. NETWORK_TIMEOUT
  else if (
    status === 504 ||
    lowerMsg.includes('deadline_exceeded') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timed out') ||
    lowerMsg.includes('deadline exceeded')
  ) {
    errorCode = 'NETWORK_TIMEOUT';
    title = 'Connection Timed Out';
    description = 'The AI service took too long to respond.';
    retryable = true;
    recommendedAction = 'Check your connection or try again with a shorter question.';
  }
  // F. FILE_TOO_LARGE (e.g. Multer size limits)
  else if (
    err.code === 'LIMIT_FILE_SIZE' ||
    lowerMsg.includes('file too large') ||
    lowerMsg.includes('too large') && lowerMsg.includes('file')
  ) {
    errorCode = 'FILE_TOO_LARGE';
    title = 'File Too Large';
    description = 'The uploaded medical document file exceeds the maximum allowed size limit of 10MB.';
    retryable = false;
    recommendedAction = 'Please compress the file or choose a smaller PDF or image to upload.';
  }
  // G. INVALID_FILE
  else if (
    lowerMsg.includes('invalid file') ||
    lowerMsg.includes('mime') ||
    lowerMsg.includes('extension') ||
    lowerMsg.includes('corrupt') ||
    lowerMsg.includes('format not supported')
  ) {
    errorCode = 'INVALID_FILE';
    title = 'Invalid File Format';
    description = 'We couldn\'t read this report. The file format is unsupported or corrupted.';
    retryable = false;
    recommendedAction = 'Please upload a clean, uncorrupted document in PDF, PNG, or JPEG format.';
  }
  // H. UPLOAD_FAILED
  else if (
    lowerMsg.includes('cloudinary') ||
    lowerMsg.includes('upload failed') ||
    lowerMsg.includes('write file') ||
    lowerMsg.includes('fs error')
  ) {
    errorCode = 'UPLOAD_FAILED';
    title = 'Upload Failed';
    description = 'Uploading the report failed.';
    retryable = true;
    recommendedAction = 'There was a server storage error. Please try uploading the document again.';
  }
  // I. OCR_FAILED
  else if (
    lowerMsg.includes('ocr_failed') ||
    lowerMsg.includes('ocr failed') ||
    lowerMsg.includes('extract text') ||
    lowerMsg.includes('transcribe')
  ) {
    errorCode = 'OCR_FAILED';
    title = 'Text Extraction Failed';
    description = 'We couldn\'t extract text from this report. It might be blurry or password-protected.';
    retryable = false;
    recommendedAction = 'Please upload a high-quality scanned document or clear photo.';
  }
  // J. REPORT_PARSE_FAILED
  else if (
    lowerMsg.includes('report_parse') ||
    lowerMsg.includes('clinical analysis failed') ||
    lowerMsg.includes('analysis could not be performed')
  ) {
    errorCode = 'REPORT_PARSE_FAILED';
    title = 'Analysis Failed';
    description = 'Gemini failed to extract medical insights from the report content.';
    retryable = true;
    recommendedAction = 'Please retry the analysis. Ensure the report contains visible text parameters.';
  }
  // K. JSON_PARSE_FAILED / INVALID_GEMINI_RESPONSE
  else if (
    lowerMsg.includes('json') && lowerMsg.includes('parse') ||
    lowerMsg.includes('syntaxerror') ||
    lowerMsg.includes('invalid json')
  ) {
    errorCode = 'JSON_PARSE_FAILED';
    title = 'AI Parsing Error';
    description = 'The AI service returned a malformed response schema.';
    retryable = true;
    recommendedAction = 'Please retry your request. The model output was temporary corrupted.';
  }
  else if (
    lowerMsg.includes('invalid_gemini_response') ||
    lowerMsg.includes('empty response') ||
    lowerMsg.includes('no text')
  ) {
    errorCode = 'INVALID_GEMINI_RESPONSE';
    title = 'AI Response Invalid';
    description = 'The AI service generated an empty or invalid content response.';
    retryable = true;
    recommendedAction = 'Please try rephrasing your message or run the analysis again.';
  }
  // L. DATABASE_ERROR
  else if (
    lowerMsg.includes('mongo') ||
    lowerMsg.includes('mongoose') ||
    lowerMsg.includes('db_error') ||
    lowerMsg.includes('validationerror') ||
    lowerMsg.includes('cast to objectid') ||
    status === 'MONGO_ERROR'
  ) {
    errorCode = 'DATABASE_ERROR';
    title = 'Database Connection Issue';
    description = 'A database error occurred while retrieving or storing AI context.';
    retryable = true;
    recommendedAction = 'Please retry. If this problem persists, the database may be undergoing maintenance.';
  }
  // M. SERVER_ERROR / UNKNOWN_SERVER_ERROR
  else if (status >= 500 && status < 600 || lowerMsg.includes('internal server error')) {
    errorCode = 'SERVER_ERROR';
    title = 'Server Error';
    description = 'An unexpected server error occurred.';
    retryable = true;
    recommendedAction = 'Please try your request again. The backend server might be restarting.';
  }

  // 3. Structured Developer Log (Stack trace remains private on backend)
  console.error('[DEVELOPER AI ERROR CLASSIFIER]', {
    timestamp,
    userId,
    errorCode,
    title,
    modelName,
    httpStatus: status,
    errorMessage: rawMessage,
    stack: err.stack || 'No stack trace available'
  });

  return {
    status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500,
    payload: {
      success: false,
      errorCode,
      errorType: errorCode, // Backwards compatibility for frontend
      title,
      description,
      message: description, // Backwards compatibility for frontend
      retryable,
      recommendedAction,
    }
  };
};
