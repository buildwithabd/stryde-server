import type { Response } from "express";

// Response Shape
interface SuccessOptions {
  message?: string;
  data?: unknown;
  meta?: unknown;
  statusCode?: number;
}

interface ErrorOptions {
  message?: string;
  errors?: unknown;
  statusCode?: number;
}

// Success Responses
export const sendSuccess = (
  res: Response,
  {
    message = "Success",
    data = null,
    meta = null,
    statusCode = 200,
  }: SuccessOptions = {},
) => {
  const body: Record<string, unknown> = { success: true, message };
  if (data !== null) body["data"] = data;
  if (meta !== null) body["meta"] = meta;
  return res.status(statusCode).json(body);
};

export const sendCreated = (
  res: Response,
  {
    message = "Created successfully",
    data = null,
  }: Pick<SuccessOptions, "message" | "data"> = {},
) => sendSuccess(res, { message, data, statusCode: 201 });

// Error Responses
export const sendError = (
  res: Response,
  {
    message = "Something went wrong",
    errors = null,
    statusCode = 500,
  }: ErrorOptions = {},
) => {
  const body: Record<string, unknown> = { success: false, message };
  if (errors !== null) body["errors"] = errors;
  return res.status(statusCode).json(body);
};

export const sendBadRequest = (
  res: Response,
  message = "Bad request",
  errors: unknown = null,
) => sendError(res, { message, errors, statusCode: 400 });

export const sendUnauthorized = (res: Response, message = "Unauthorized") =>
  sendError(res, { message, statusCode: 401 });

export const sendForbidden = (res: Response, message = "Forbidden") =>
  sendError(res, { message, statusCode: 403 });

export const sendNotFound = (res: Response, message = "Not found") =>
  sendError(res, { message, statusCode: 404 });
