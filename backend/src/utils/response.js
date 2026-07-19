
export const sendResponse = (res, statusCode, message, data = null) => {
  const payload = {
    success: statusCode >= 200 && statusCode < 300,
    message,
  };

  if (data !== null) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};
