import { http, HttpResponse, delay } from 'msw';
// import { useNavigate } from 'react-router-dom';
import type { LoginRequest, LoginResponse, RegisterRequest } from '../types';

// On utilise une URL absolue ou relative selon ton setup Vite
const API_URL = import.meta.env.VITE_API_URL;

export const authHandlers = [
  // Mock Register
  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;
    await delay(1000);

    if (body.email === 'error@example.com') {
      return new HttpResponse(null, { status: 409 });
    }

    return HttpResponse.json({ 
      status: 'SUCCESS',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: '1',
        username: body.username,
        email: body.email,
      }
    } as LoginResponse, { status: 201 });
  }),

  // Mock Login
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
    await delay(1000);

    if (body.password === 'wrongpassword') {
      return HttpResponse.json({
        status: 'INVALID_CREDENTIALS',
        access_token: null,
        refresh_token: null,
        user: null,
      } as LoginResponse);
    }

    return HttpResponse.json({
      status: 'SUCCESS',
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: '1',
        username: body.identifier.split('@')[0],
        email: body.identifier.includes('@') ? body.identifier : `${body.identifier}@example.com`,
      },
    } as LoginResponse);
  }),

  // Mock Logout
  http.post(`${API_URL}/auth/logout`, async () => {
    await delay(500);
    return new HttpResponse(null, { status: 200 });
  }),
];
