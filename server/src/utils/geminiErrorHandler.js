/**
 * Centralized Gemini API Quota and Limit Error Classifier
 */

export const handleGeminiError = (err, userId = null, modelName = 'gemini-2.5-flash') => {
  const status = err.status || err.httpStatusCode || err.code || 500;
  const rawMessage = err.message || '';
  const timestamp = new Date().toISOString();

  // 1. Log full technical details for developers on the backend (Step 5)
  console.error('[DEVELOPER AI ERROR LOG]', {
    timestamp,
    userId,
    modelName,
    httpStatus: status,
    errorCode: err.code || 'N/A',
    errorMessage: rawMessage,
    stack: err.stack || 'No stack trace available'
  });

  // 2. Classify raw errors into structured user-friendly responses (Step 1 & Step 2)
  const lowerMsg = rawMessage.toLowerCase();

  // Case A: Authentication / Permissions
  if (
    status === 401 ||
    status === 403 ||
    lowerMsg.includes('api_key_invalid') ||
    lowerMsg.includes('permission_denied') ||
    lowerMsg.includes('key not valid')
  ) {
    return {
      status: 401,
      payload: {
        success: false,
        errorType: 'AUTH_ERROR',
        title: 'AI Configuration Error',
        message: 'The AI service isn’t configured correctly. Please contact the administrator.'
      }
    };
  }

  // Case B: Quotas / Rate Limits (429)
  if (status === 429 || lowerMsg.includes('resource_exhausted') || lowerMsg.includes('quota')) {
    // Check if it's RPM (requests per minute) or RPD (daily free tier) limit
    const isDailyLimit = lowerMsg.includes('daily') || lowerMsg.includes('limit: 20') || lowerMsg.includes('per day');
    if (isDailyLimit) {
      return {
        status: 429,
        payload: {
          success: false,
          errorType: 'QUOTA_EXCEEDED',
          title: 'Daily AI Limit Reached',
          message: 'You have reached today’s free AI usage limit. Please try again tomorrow or wait until the quota resets.'
        }
      };
    } else {
      return {
        status: 429,
        payload: {
          success: false,
          errorType: 'RATE_LIMIT',
          title: 'Please Wait',
          message: 'You’re sending requests too quickly. Please wait about one minute before trying again.'
        }
      };
    }
  }

  // Case C: Service Down (503)
  if (status === 503 || lowerMsg.includes('service_unavailable') || lowerMsg.includes('unavailable')) {
    return {
      status: 503,
      payload: {
        success: false,
        errorType: 'SERVICE_DOWN',
        title: 'AI Service Temporarily Unavailable',
        message: 'Gemini is currently unavailable. Please try again in a few minutes.'
      }
    };
  }

  // Case D: Network Timeout
  if (
    status === 504 ||
    lowerMsg.includes('deadline_exceeded') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('timedout')
  ) {
    return {
      status: 504,
      payload: {
        success: false,
        errorType: 'TIMEOUT',
        title: 'Request Timed Out',
        message: 'The request timed out. Please try again with a shorter question.'
      }
    };
  }

  // Case E: Network Disconnection / Internet Offline
  if (
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('dns')
  ) {
    return {
      status: 502,
      payload: {
        success: false,
        errorType: 'NETWORK_ERROR',
        title: 'No Internet Connection',
        message: 'We couldn’t connect to the AI service. Check your internet connection and try again.'
      }
    };
  }

  // Case F: Default / Unknown Errors
  return {
    status: 500,
    payload: {
      success: false,
      errorType: 'UNKNOWN_ERROR',
      title: 'AI Service Error',
      message: 'I encountered an issue processing your request. Please try again.'
    }
  };
};
