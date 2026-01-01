/**
 * Rate Limiter Middleware
 * 
 * Provides IPv6-safe rate limiting for Express routes.
 * Fixes ERR_ERL_KEY_GEN_IPV6 error on Render (IPv6 environments).
 * 
 * Usage:
 *   import { apiLimiter } from '../middleware/rateLimit.js';
 *   router.post('/endpoint', apiLimiter, handler);
 */

import rateLimit from "express-rate-limit";

/**
 * IPv6-safe IP key generator helper
 * Extracts client IP from request, handling proxies (Render, etc.)
 * 
 * @param {Request} req - Express request object
 * @returns {string} - Client IP address or fallback identifier
 */
export function ipKeyGenerator(req) {
  // Priority 1: X-Forwarded-For header (proxy/Load Balancer)
  // This handles Render and other proxy environments
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (xForwardedFor && typeof xForwardedFor === "string") {
    // X-Forwarded-For can contain multiple IPs, take the first (original client)
    const firstIp = xForwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  // Priority 2: req.ip (works when trust proxy is set)
  // This is IPv6-safe when trust proxy is enabled
  if (req.ip) {
    return req.ip;
  }

  // Priority 3: Socket addresses (fallback)
  if (req.connection?.remoteAddress) {
    return req.connection.remoteAddress;
  }
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  // Priority 4: Hostname (last resort)
  if (req.hostname) {
    return req.hostname;
  }

  // Final fallback
  return "unknown";
}

/**
 * Standard API rate limiter
 * 100 requests per 15 minutes per IP
 * Suitable for most API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: { message: "Too many requests from this IP, please try again later." },
  // Use IPv6-safe key generator
  keyGenerator: (req) => ipKeyGenerator(req),
});

/**
 * Create a custom rate limiter with specific limits
 * 
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.message - Custom error message
 * @param {Function} options.keyGenerator - Custom key generator (optional)
 * @returns {RateLimit} - Configured rate limiter
 */
export function createLimiter({ windowMs, max, message, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: message || { message: "Too many requests, please try again later." },
    keyGenerator: keyGenerator || ((req) => ipKeyGenerator(req)),
  });
}

