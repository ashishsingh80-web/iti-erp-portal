"use client";

import { useLayoutEffect } from "react";

const CSRF_COOKIE = "iti_erp_csrf";

function readCookieValue(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function CsrfFetchWrapper() {
  useLayoutEffect(() => {
    const originalFetch = window.fetch.bind(window);

    // Inject CSRF header into all client-side mutation requests.
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const requestMethod = input instanceof Request ? input.method : undefined;
      const method = (init?.method || requestMethod || "GET").toString().toUpperCase();
      const isUnsafeMethod = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";

      if (!isUnsafeMethod) {
        return originalFetch(input, init);
      }

      const csrfToken = readCookieValue(CSRF_COOKIE);
      const headers = new Headers(init?.headers);
      if (csrfToken) {
        headers.set("x-csrf-token", csrfToken);
      }

      return originalFetch(input, {
        ...init,
        method,
        headers,
        credentials: init?.credentials ?? "include"
      });
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

