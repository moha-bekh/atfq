import { http, HttpResponse, delay } from 'msw';
import type { Profile, UpdateProfileRequest, UpdateThemeRequest } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

// Mock Profile Data
let mockProfile: Profile = {
  id: '1',
  roles: ['user'],
  permissions: ['profile:write', 'wiki:submit'],
  profile_picture_url: 'https://github.com/moha-bekh.png',
  theme: {
    name: 'base',
    is_preset: true,
    font_main: 'Plus Jakarta Sans',
    font_display: 'Bricolage Grotesque',
    colors: {
      bg: '#7766BD',
      main: '#F4EFFA',
      text: '#F4EFFA',
      sub: '#4B3A91',
    }
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const userHandlers = [
  // Get Profile
  http.get(`${API_URL}/api/v1/user/profile/:id`, async () => {
    await delay(800);
    return HttpResponse.json(mockProfile);
  }),

  // Update Profile
  http.put(`${API_URL}/api/v1/user/profile`, async ({ request }) => {
    const body = await request.json() as UpdateProfileRequest;
    await delay(500);
    mockProfile = { ...mockProfile, ...body, updated_at: new Date().toISOString() };
    return HttpResponse.json(mockProfile);
  }),

  // Update Theme
  http.put(`${API_URL}/api/v1/user/profile/theme`, async ({ request }) => {
    const body = await request.json() as UpdateThemeRequest;
    await delay(500);
    mockProfile = { ...mockProfile, theme: body.theme, updated_at: new Date().toISOString() };
    return HttpResponse.json(mockProfile);
  }),

  // Upload Picture
  http.post(`${API_URL}/api/v1/user/profile/picture`, async () => {
    await delay(1500);
    mockProfile = { 
      ...mockProfile, 
      profile_picture_url: 'https://github.com/moha-bekh.png', 
      updated_at: new Date().toISOString() 
    };
    return HttpResponse.json(mockProfile);
  }),

  // Create Role Request
  http.post(`${API_URL}/api/v1/user/role-requests`, async () => {
    await delay(500);
    return HttpResponse.json({ 
      request_id: 'req-123', 
      status: 'PENDING' 
    }, { status: 201 });
  }),

  // Delete Profile
  http.delete(`${API_URL}/api/v1/user/profile`, async () => {
    await delay(500);
    return new HttpResponse(null, { status: 204 });
  }),

  // List Permissions
  http.get(`${API_URL}/api/v1/user/permissions`, async () => {
    await delay(300);
    return HttpResponse.json({ 
      permissions: ['profile:write', 'wiki:submit', 'wiki:admin'] 
    });
  }),
];
